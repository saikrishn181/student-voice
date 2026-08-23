import test from "node:test"
import assert from "node:assert/strict"
import { calculatePostScore, rankPostsForYou } from "./recommendation-runner.mjs"

test("recommendation engine prioritizes followed topics and colleges", () => {
  const currentUser = {
    id: "user-1",
    name: "Aarav Sharma",
    email: "aarav@iitd.ac.in",
    accountType: "student",
    state: "Delhi",
    collegeName: "IIT Delhi",
    followerCount: 10,
    followingCount: 5,
    createdAt: new Date().toISOString(),
    isAdmin: false,
  }

  const followedTopics = ["hostel", "wifi"]

  const postSameCollege = {
    id: "post-1",
    authorId: "author-1",
    text: "Hostel mess issues in Nilgiri hostel",
    hashtags: ["hostel", "mess"],
    state: "Delhi",
    category: "Academic",
    supportCount: 15,
    commentCount: 4,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    isPinned: false,
    viewCount: 50,
    supportedByCurrentUser: false,
    savedByCurrentUser: false,
  }

  const postDifferentCollege = {
    id: "post-2",
    authorId: "author-2",
    text: "Random sports update in Bangalore",
    hashtags: ["sports"],
    state: "Karnataka",
    category: "Academic",
    supportCount: 2,
    commentCount: 0,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    isPinned: false,
    viewCount: 10,
    supportedByCurrentUser: false,
    savedByCurrentUser: false,
  }

  const usersMap = {
    "author-1": {
      id: "author-1",
      name: "Rohan",
      collegeName: "IIT Delhi",
      state: "Delhi",
    },
    "author-2": {
      id: "author-2",
      name: "Suresh",
      collegeName: "IISc Bangalore",
      state: "Karnataka",
    },
  }

  const ranked = rankPostsForYou(
    [postDifferentCollege, postSameCollege],
    usersMap,
    currentUser,
    followedTopics,
  )

  assert.equal(ranked[0].id, "post-1")
  assert.ok(ranked[0].relevanceScore > ranked[1].relevanceScore)
  assert.ok(ranked[0].recommendationReason.includes("IIT Delhi") || ranked[0].recommendationReason.includes("#hostel"))
})
