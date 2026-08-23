// Test runner for recommendation engine

export function calculatePostScore(
  post,
  authorUser,
  currentUser,
  affinities = { topics: {}, colleges: {}, categories: {}, states: {} },
  followedTopics = [],
) {
  let score = 0
  let topReason = undefined

  if (post.isPinned) {
    score += 20
  }

  const followedSet = new Set(followedTopics.map((t) => t.toLowerCase()))
  let maxTopicScore = 0
  let matchingTopicName = ""

  for (const tag of post.hashtags || []) {
    const lower = tag.toLowerCase()
    let tagScore = 0

    if (followedSet.has(lower)) {
      tagScore += 8
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

  const authorCollege = authorUser?.collegeName
  const userCollege = currentUser?.collegeName

  if (authorCollege && userCollege && authorCollege.toLowerCase() === userCollege.toLowerCase()) {
    score += 10
    topReason = `Trending at your campus (${authorCollege})`
  } else if (authorCollege) {
    const collegeAffinity = affinities.colleges[authorCollege.toLowerCase()] ?? 0
    if (collegeAffinity > 0) {
      score += Math.min(collegeAffinity * 2, 8)
      if (!topReason) topReason = `Popular at ${authorCollege}`
    }
  }

  const userState = currentUser?.state
  if (userState && post.state === userState) {
    score += 4
    if (!topReason) topReason = `Active in your state (${post.state})`
  }

  if (post.category && affinities.categories[post.category]) {
    score += Math.min(affinities.categories[post.category] * 0.8, 4)
  }

  const engagement = (post.supportCount || 0) + (post.commentCount || 0) * 1.8
  score += Math.log2(1 + engagement) * 2.2

  const hoursAgo = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60))
  const timeDecay = 1 / Math.pow(1 + hoursAgo / 24, 0.8)
  score *= timeDecay

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

export function rankPostsForYou(
  posts,
  usersMap = {},
  currentUser,
  followedTopics = [],
) {
  const affinities = { topics: {}, colleges: {}, categories: {}, states: {} }

  const scoredPosts = posts.map((post) => {
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

  return scoredPosts.sort((a, b) => {
    const diff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
    if (Math.abs(diff) > 0.05) return diff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
