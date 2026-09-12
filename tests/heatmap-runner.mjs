// Test runner for heatmap algorithm (pure JS, no TS imports needed).

const WINDOW_HOURS = 48
const MIN_RECENT_POSTS = 4
const VELOCITY_THRESHOLD = 3
const MIN_COLLEGES_FOR_SPREAD = 2
const MAX_HOT_ISSUES = 3

export function detectHotIssues(posts, usersMap) {
  const now = Date.now()
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000
  const cutoff = now - windowMs

  const baselineDays = 30
  const baselineCutoff = now - baselineDays * 24 * 60 * 60 * 1000
  const baselineWindows = ((baselineDays * 24) - WINDOW_HOURS) / WINDOW_HOURS

  const buckets = new Map()

  for (const post of posts) {
    const createdMs = new Date(post.createdAt).getTime()
    if (createdMs < baselineCutoff) continue

    const author = usersMap[post.authorId]
    const collegeName = author?.collegeName?.trim() || undefined
    const stateName = post.state?.trim() || author?.state?.trim() || undefined

    const uniqueTags = new Set((post.hashtags || []).map((t) => t.toLowerCase()))
    for (const tag of uniqueTags) {

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

  const hotIssues = []

  for (const bucket of buckets.values()) {
    const recentCount = bucket.recentPosts.length
    if (recentCount < MIN_RECENT_POSTS) continue

    const baselineTotal = bucket.olderPosts.length
    const baselineAvg = Math.max(baselineTotal / baselineWindows, 1)
    const velocity = recentCount / baselineAvg

    if (velocity < VELOCITY_THRESHOLD && bucket.colleges.size < MIN_COLLEGES_FOR_SPREAD) {
      continue
    }

    let tier
    if (velocity >= 8 || (velocity >= 5 && bucket.colleges.size >= 3)) {
      tier = "breaking"
    } else if (velocity >= 5 || bucket.colleges.size >= MIN_COLLEGES_FOR_SPREAD) {
      tier = "hot"
    } else {
      tier = "rising"
    }

    const collegeNames = [...bucket.colleges].slice(0, 4)
    const collegeLabel =
      bucket.colleges.size >= MIN_COLLEGES_FOR_SPREAD
        ? ` across ${bucket.colleges.size} colleges`
        : collegeNames.length === 1
          ? ` at ${collegeNames[0]}`
          : ""

    const summary = `${recentCount} students are discussing #${bucket.topic}${collegeLabel} in the last ${WINDOW_HOURS}h`

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

  hotIssues.sort((a, b) => {
    const tierOrder = { breaking: 3, hot: 2, rising: 1 }
    const tierDiff = tierOrder[b.tier] - tierOrder[a.tier]
    if (tierDiff !== 0) return tierDiff
    return b.velocityScore - a.velocityScore
  })

  return hotIssues.slice(0, MAX_HOT_ISSUES)
}
