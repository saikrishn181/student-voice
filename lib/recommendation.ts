// Personalized "For You" Feed Recommendation Engine for Krantind.
// Calculates relevance and engagement scores for posts based on:
// 1. Topic / Hashtag affinities from user interactions (supports, comments, saves, follows).
// 2. College matching (user's college and frequently engaged campus communities).
// 3. Regional / State proximity.
// 4. Recency time-decay and discussion velocity (supports + comments).

import type { Post, User } from "@/lib/types"

export interface UserAffinities {
  topics: Record<string, number> // hashtag -> weight
  colleges: Record<string, number> // college name -> weight
  categories: Record<string, number> // category -> weight
  states: Record<string, number> // state -> weight
}

const STORAGE_KEY_PREFIX = "krantind_affinities_"

/**
 * Retrieves the current user's interaction affinities from localStorage.
 */
export function getUserAffinities(userId?: string): UserAffinities {
  const empty: UserAffinities = { topics: {}, colleges: {}, categories: {}, states: {} }
  if (!userId || typeof window === "undefined") return empty

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (!raw) return empty
    return JSON.parse(raw) as UserAffinities
  } catch {
    return empty
  }
}

/**
 * Records a user interaction (support, comment, bookmark, view) to continuously tune recommendations.
 */
export function trackInteraction(
  userId: string | undefined,
  data: {
    hashtags?: string[]
    authorCollege?: string
    authorState?: string
    category?: string
    type: "support" | "comment" | "save" | "view"
  },
) {
  if (!userId || typeof window === "undefined") return

  try {
    const current = getUserAffinities(userId)
    const weightMap = {
      support: 5,
      comment: 4,
      save: 4,
      view: 1,
    }
    const delta = weightMap[data.type] ?? 1

    // Update topic weights
    if (data.hashtags && data.hashtags.length > 0) {
      for (const tag of data.hashtags) {
        const lower = tag.toLowerCase()
        current.topics[lower] = (current.topics[lower] ?? 0) + delta
      }
    }

    // Update college weight
    if (data.authorCollege) {
      const lowerCollege = data.authorCollege.toLowerCase()
      current.colleges[lowerCollege] = (current.colleges[lowerCollege] ?? 0) + delta
    }

    // Update state weight
    if (data.authorState) {
      current.states[data.authorState] = (current.states[data.authorState] ?? 0) + delta
    }

    // Update category weight
    if (data.category) {
      current.categories[data.category] = (current.categories[data.category] ?? 0) + delta
    }

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(current))
  } catch {}
}

export interface RankedPost extends Post {
  recommendationReason?: string
  relevanceScore?: number
}

/**
 * Computes a personalized relevance score and human-readable recommendation reason for a post.
 */
export function calculatePostScore(
  post: Post,
  authorUser: User | null | undefined,
  currentUser: User | null | undefined,
  affinities: UserAffinities,
  followedTopics: string[] = [],
): { score: number; reason?: string } {
  let score = 0
  let topReason: string | undefined

  // 1. Pinned org posts get high baseline priority
  if (post.isPinned) {
    score += 20
  }

  // 2. Topic / Hashtag Affinity Match
  const followedSet = new Set((followedTopics ?? []).filter(Boolean).map((t) => String(t).toLowerCase()))
  let maxTopicScore = 0
  let matchingTopicName = ""

  for (const tag of post.hashtags) {
    const lower = tag.toLowerCase()
    let tagScore = 0

    if (followedSet.has(lower)) {
      tagScore += 8 // High signal from explicit user follow
      if (!matchingTopicName) matchingTopicName = `#${tag}`
    }

    const affinityWeight = affinities.topics[lower] ?? 0
    if (affinityWeight > 0) {
      tagScore += Math.min(affinityWeight * 1.5, 12)
      if (affinityWeight > maxTopicScore) {
        maxTopicScore = affinityWeight
        matchingTopicName = `#${tag}`
      }
    }

    score += tagScore
  }

  if (matchingTopicName) {
    topReason = `Based on your interest in ${matchingTopicName}`
  }

  // 3. College Match & Proximity
  const authorCollege = authorUser?.collegeName
  const userCollege = currentUser?.collegeName

  if (authorCollege && userCollege && authorCollege.toLowerCase() === userCollege.toLowerCase()) {
    score += 10 // Same college community
    topReason = `Trending at your campus (${authorCollege})`
  } else if (authorCollege) {
    const collegeAffinity = affinities.colleges[authorCollege.toLowerCase()] ?? 0
    if (collegeAffinity > 0) {
      score += Math.min(collegeAffinity * 2, 8)
      if (!topReason) topReason = `Popular at ${authorCollege}`
    }
  }

  // 4. Regional / State Proximity Match
  const userState = currentUser?.state
  if (userState && post.state === userState) {
    score += 4
    if (!topReason) topReason = `Active in your state (${post.state})`
  }

  // 5. Category Affinity Match
  if (post.category && affinities.categories[post.category]) {
    score += Math.min(affinities.categories[post.category] * 0.8, 4)
  }

  // 6. Social Engagement Velocity (log-scale)
  const engagement = (post.supportCount || 0) + (post.commentCount || 0) * 1.8
  score += Math.log2(1 + engagement) * 2.2

  // 7. Time Decay Factor (posts decay smoothly over days)
  const hoursAgo = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60))
  const timeDecay = 1 / Math.pow(1 + hoursAgo / 24, 0.8)
  score *= timeDecay

  // 8. New active discussion boost for freshness
  if (hoursAgo < 12) {
    score += 2.5
    if (!topReason && (post.supportCount > 2 || post.commentCount > 0)) {
      topReason = "Trending campus discussion"
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    reason: topReason,
  }
}

/**
 * Ranks all available posts using the personalized For You scoring algorithm.
 */
export function rankPostsForYou(
  posts: Post[],
  usersMap: Record<string, User>,
  currentUser: User | null | undefined,
  followedTopics: string[] = [],
): RankedPost[] {
  const affinities = getUserAffinities(currentUser?.id)

  const scoredPosts: RankedPost[] = posts.map((post) => {
    const author = usersMap[post.authorId]
    const { score, reason } = calculatePostScore(
      post,
      author,
      currentUser,
      affinities,
      followedTopics,
    )
    return {
      ...post,
      relevanceScore: score,
      recommendationReason: reason,
    }
  })

  // Sort by highest relevance score first, then newest
  return scoredPosts.sort((a, b) => {
    const diff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
    if (Math.abs(diff) > 0.05) return diff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
