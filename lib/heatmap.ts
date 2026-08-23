// Campus Heatmap — Hot Issues Velocity Score Algorithm.
//
// Detects when a specific topic (hashtag, keyword cluster) receives a sudden
// surge of posts within a 48-hour window. When the velocity exceeds a threshold,
// the topic is flagged as a "Breaking Campus Issue" and displayed as a prominent
// banner at the top of the feed.
//
// Scoring formula:
//   velocity = recentPostCount / max(baselineAverage, 1)
// where:
//   recentPostCount = posts with this topic in the last WINDOW_HOURS hours
//   baselineAverage = average posts with this topic per WINDOW_HOURS over the past 30 days
//
// A topic is "hot" when velocity >= VELOCITY_THRESHOLD.
// Multi-college spread is tracked by counting unique author colleges.

import type { Post, User } from "@/lib/types"

// ─── Configuration ──────────────────────────────────────────────────────────

/** Time window (hours) for detecting surges. */
const WINDOW_HOURS = 48

/** Minimum posts within the window to even consider a topic. */
const MIN_RECENT_POSTS = 4

/** Velocity multiplier threshold: recentCount must be >= baseline * this. */
const VELOCITY_THRESHOLD = 3

/** Minimum unique colleges for "across colleges" label. */
const MIN_COLLEGES_FOR_SPREAD = 2

/** Maximum hot issues to surface at once. */
const MAX_HOT_ISSUES = 3

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HotIssue {
  /** Primary hashtag or topic label (e.g. "hostel", "fee hike"). */
  topic: string
  /** Human-readable display label (e.g. "#hostel"). */
  displayLabel: string
  /** Number of posts in the current window. */
  recentPostCount: number
  /** Velocity score (how many × above baseline). */
  velocityScore: number
  /** Number of unique colleges posting about this. */
  collegeCount: number
  /** Names of the colleges involved. */
  collegeNames: string[]
  /** Number of unique states involved. */
  stateCount: number
  /** Total supports across recent posts on this topic. */
  totalSupports: number
  /** Total comments across recent posts on this topic. */
  totalComments: number
  /** Posts that are part of this hot issue (sorted newest-first). */
  posts: Post[]
  /** Human-friendly summary string. */
  summary: string
  /** Severity tier: "rising" | "hot" | "breaking". */
  tier: "rising" | "hot" | "breaking"
}

// ─── Core Algorithm ─────────────────────────────────────────────────────────

interface TopicBucket {
  topic: string
  recentPosts: Post[]
  olderPosts: Post[]
  colleges: Set<string>
  states: Set<string>
  totalSupports: number
  totalComments: number
}

/**
 * Detects hot campus issues from the current feed of posts.
 *
 * @param posts     All loaded posts (newest first preferred but not required).
 * @param usersMap  userId → User record for resolving author colleges.
 * @returns         Array of HotIssue objects sorted by velocity (highest first),
 *                  capped at MAX_HOT_ISSUES.
 */
export function detectHotIssues(
  posts: Post[],
  usersMap: Record<string, User>,
): HotIssue[] {
  const now = Date.now()
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000
  const cutoff = now - windowMs

  // 30-day baseline window (for computing average per WINDOW_HOURS).
  const baselineDays = 30
  const baselineCutoff = now - baselineDays * 24 * 60 * 60 * 1000
  const baselineWindows = (baselineDays * 24) / WINDOW_HOURS // e.g. 15 windows in 30 days

  // Step 1: Bucket posts by hashtag.
  const buckets = new Map<string, TopicBucket>()

  for (const post of posts) {
    const createdMs = new Date(post.createdAt).getTime()
    if (createdMs < baselineCutoff) continue // Too old for any analysis.

    const author = usersMap[post.authorId]
    const collegeName = author?.collegeName?.trim() || undefined
    const stateName = post.state?.trim() || author?.state?.trim() || undefined

    for (const rawTag of post.hashtags) {
      const tag = rawTag.toLowerCase()

      let bucket = buckets.get(tag)
      if (!bucket) {
        bucket = {
          topic: tag,
          recentPosts: [],
          olderPosts: [],
          colleges: new Set(),
          states: new Set(),
          totalSupports: 0,
          totalComments: 0,
        }
        buckets.set(tag, bucket)
      }

      if (createdMs >= cutoff) {
        bucket.recentPosts.push(post)
        bucket.totalSupports += post.supportCount || 0
        bucket.totalComments += post.commentCount || 0
        if (collegeName) bucket.colleges.add(collegeName)
        if (stateName) bucket.states.add(stateName)
      } else {
        bucket.olderPosts.push(post)
      }
    }
  }

  // Step 2: Compute velocity for each topic and filter hot ones.
  const hotIssues: HotIssue[] = []

  for (const bucket of buckets.values()) {
    const recentCount = bucket.recentPosts.length
    if (recentCount < MIN_RECENT_POSTS) continue

    // Baseline: average posts per window over the last 30 days (excluding current window).
    const baselineTotal = bucket.olderPosts.length
    const baselineAvg = Math.max(baselineTotal / baselineWindows, 1)

    const velocity = recentCount / baselineAvg

    if (velocity < VELOCITY_THRESHOLD && bucket.colleges.size < MIN_COLLEGES_FOR_SPREAD) {
      continue // Neither fast enough nor spread enough.
    }

    // Determine severity tier.
    let tier: HotIssue["tier"]
    if (velocity >= 8 || (velocity >= 5 && bucket.colleges.size >= 3)) {
      tier = "breaking"
    } else if (velocity >= 5 || bucket.colleges.size >= MIN_COLLEGES_FOR_SPREAD) {
      tier = "hot"
    } else {
      tier = "rising"
    }

    // Build human summary.
    const collegeNames = [...bucket.colleges].slice(0, 4)
    const collegeSuffix =
      bucket.colleges.size > 4
        ? ` and ${bucket.colleges.size - 4} more`
        : ""
    const collegeLabel =
      bucket.colleges.size >= MIN_COLLEGES_FOR_SPREAD
        ? ` across ${bucket.colleges.size} colleges`
        : collegeNames.length === 1
          ? ` at ${collegeNames[0]}`
          : ""

    const summary = `${recentCount} students are discussing #${bucket.topic}${collegeLabel} in the last ${WINDOW_HOURS}h`

    // Sort recent posts newest-first.
    const sortedPosts = [...bucket.recentPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    hotIssues.push({
      topic: bucket.topic,
      displayLabel: `#${bucket.topic}`,
      recentPostCount: recentCount,
      velocityScore: Math.round(velocity * 10) / 10,
      collegeCount: bucket.colleges.size,
      collegeNames: [...bucket.colleges],
      stateCount: bucket.states.size,
      totalSupports: bucket.totalSupports,
      totalComments: bucket.totalComments,
      posts: sortedPosts,
      summary,
      tier,
    })
  }

  // Step 3: Sort by velocity (breaking first) and cap.
  hotIssues.sort((a, b) => {
    const tierOrder = { breaking: 3, hot: 2, rising: 1 }
    const tierDiff = tierOrder[b.tier] - tierOrder[a.tier]
    if (tierDiff !== 0) return tierDiff
    return b.velocityScore - a.velocityScore
  })

  return hotIssues.slice(0, MAX_HOT_ISSUES)
}
