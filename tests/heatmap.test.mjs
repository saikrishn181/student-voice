import test from "node:test"
import assert from "node:assert/strict"
import { detectHotIssues } from "./heatmap-runner.mjs"

// Helper: create a post N hours ago.
function makePost(id, hashtags, authorId, hoursAgo, supports = 2, comments = 1) {
  return {
    id,
    authorId,
    text: `Post about ${hashtags.join(", ")}`,
    hashtags,
    state: "Telangana",
    category: "Academic",
    supportCount: supports,
    commentCount: comments,
    createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    mediaUrl: null,
    mediaType: null,
    isPinned: false,
    viewCount: 10,
  }
}

const usersMap = {
  "u1": { id: "u1", name: "Aarav", collegeName: "IIT Hyderabad", state: "Telangana" },
  "u2": { id: "u2", name: "Priya", collegeName: "JNTU Hyderabad", state: "Telangana" },
  "u3": { id: "u3", name: "Rohan", collegeName: "OU Hyderabad", state: "Telangana" },
  "u4": { id: "u4", name: "Sneha", collegeName: "IIT Delhi", state: "Delhi" },
  "u5": { id: "u5", name: "Karan", collegeName: "BITS Pilani", state: "Rajasthan" },
}

test("detects no hot issues when post count is below threshold", () => {
  const posts = [
    makePost("p1", ["hostel"], "u1", 2),
    makePost("p2", ["hostel"], "u2", 5),
    // Only 2 posts — below MIN_RECENT_POSTS (4)
  ]
  const result = detectHotIssues(posts, usersMap)
  assert.equal(result.length, 0)
})

test("detects hot issue when 4+ posts on same hashtag surge in 48h", () => {
  const posts = [
    makePost("p1", ["mess"], "u1", 1, 10, 5),
    makePost("p2", ["mess"], "u2", 3, 8, 3),
    makePost("p3", ["mess"], "u3", 6, 5, 2),
    makePost("p4", ["mess"], "u4", 12, 3, 1),
    makePost("p5", ["mess"], "u5", 20, 7, 4),
  ]
  const result = detectHotIssues(posts, usersMap)
  assert.ok(result.length >= 1, "Should detect at least 1 hot issue")
  assert.equal(result[0].topic, "mess")
  assert.ok(result[0].velocityScore >= 3, `Velocity should be >= 3, got ${result[0].velocityScore}`)
  assert.equal(result[0].recentPostCount, 5)
})

test("deduplicates multiple identical hashtags on a single post", () => {
  const posts = [
    makePost("p1", ["mess", "mess", "MESS"], "u1", 1, 10, 5),
    makePost("p2", ["mess"], "u2", 3, 8, 3),
    makePost("p3", ["mess"], "u3", 6, 5, 2),
    makePost("p4", ["mess"], "u4", 12, 3, 1),
  ]
  const result = detectHotIssues(posts, usersMap)
  assert.ok(result.length >= 1)
  assert.equal(result[0].recentPostCount, 4)
  assert.equal(result[0].totalSupports, 26)
})

test("detects multi-college spread", () => {
  const posts = [
    makePost("p1", ["feehike"], "u1", 2),
    makePost("p2", ["feehike"], "u2", 4),
    makePost("p3", ["feehike"], "u3", 8),
    makePost("p4", ["feehike"], "u4", 10),
    makePost("p5", ["feehike"], "u5", 14),
  ]
  const result = detectHotIssues(posts, usersMap)
  assert.ok(result.length >= 1)
  assert.equal(result[0].topic, "feehike")
  assert.ok(result[0].collegeCount >= 4, `Should span 4+ colleges, got ${result[0].collegeCount}`)
  assert.ok(result[0].summary.includes("across"))
})

test("assigns correct tiers based on velocity and college spread", () => {
  // Create a massive surge: 8 posts from 3 colleges = should be "breaking"
  const posts = [
    makePost("p1", ["strike"], "u1", 1),
    makePost("p2", ["strike"], "u1", 2),
    makePost("p3", ["strike"], "u2", 3),
    makePost("p4", ["strike"], "u2", 4),
    makePost("p5", ["strike"], "u3", 5),
    makePost("p6", ["strike"], "u3", 6),
    makePost("p7", ["strike"], "u4", 8),
    makePost("p8", ["strike"], "u5", 10),
  ]
  const result = detectHotIssues(posts, usersMap)
  assert.ok(result.length >= 1)
  // 8 recent posts / baseline of 1 = velocity 8 -> "breaking"
  assert.equal(result[0].tier, "breaking")
})

test("old posts (>48h) do not count as recent", () => {
  const posts = [
    makePost("p1", ["wifi"], "u1", 60),  // older than 48h
    makePost("p2", ["wifi"], "u2", 72),
    makePost("p3", ["wifi"], "u3", 96),
    makePost("p4", ["wifi"], "u4", 120),
    makePost("p5", ["wifi"], "u5", 200),
  ]
  const result = detectHotIssues(posts, usersMap)
  // All posts are older than 48h, so no recent posts => no hot issue
  assert.equal(result.length, 0)
})

test("caps results at MAX_HOT_ISSUES (3)", () => {
  // Create 4 different surging topics
  const posts = []
  const topics = ["topic1", "topic2", "topic3", "topic4"]
  let id = 0
  for (const topic of topics) {
    for (let i = 0; i < 5; i++) {
      posts.push(makePost(`p${id++}`, [topic], `u${(i % 5) + 1}`, i * 2 + 1))
    }
  }
  const result = detectHotIssues(posts, usersMap)
  assert.ok(result.length <= 3, `Should cap at 3 hot issues, got ${result.length}`)
})
