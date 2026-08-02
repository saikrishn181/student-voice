// Centralized mock/dummy data. Everything here is placeholder data that a real
// backend (Supabase) will replace in later phases.

import type {
  Category,
  Comment,
  Follow,
  Post,
  User,
} from "@/lib/types"

// ─── Users ────────────────────────────────────────────────────────────────────

// TODO: replace with rows from Supabase `profiles` table.
export const MOCK_USERS: User[] = [
  {
    id: "usr_demo",
    name: "Ananya Sharma",
    email: "ananya@example.com",
    accountType: "student",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=60",
    state: "Maharashtra",
    district: "Mumbai",
    bio: "Final year, Mithibai College. Passionate about hostel facilities.",
    followerCount: 128,
    followingCount: 54,
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "usr_sanika",
    name: "Sanika Deshmukh",
    email: "sanika@example.com",
    accountType: "student",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=60",
    state: "Maharashtra",
    district: "Pune",
    bio: "Prefinal. Mental health advocate.",
    followerCount: 89,
    followingCount: 31,
    createdAt: "2026-02-03T12:30:00.000Z",
  },
  {
    id: "usr_rahul",
    name: "Rahul Menon",
    email: "rahul@example.com",
    accountType: "student",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=60",
    state: "Karnataka",
    district: "Bengaluru",
    bio: "Placement cell volunteer.",
    followerCount: 210,
    followingCount: 77,
    createdAt: "2026-01-22T10:00:00.000Z",
  },
  {
    id: "usr_nehru_union",
    name: "JNU Students' Union",
    email: "union@example.com",
    accountType: "organization",
    organizationType: "student_union",
    verificationStatus: "verified",
    avatarUrl:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=200&q=60",
    state: "Delhi",
    district: "South Delhi",
    bio: "Representing student rights across JNU campuses.",
    followerCount: 5400,
    followingCount: 12,
    createdAt: "2025-11-01T08:00:00.000Z",
  },
  {
    id: "usr_vidya_foundation",
    name: "Vidya Education Foundation",
    email: "help@vidyafoundation.org",
    accountType: "organization",
    organizationType: "ngo",
    verificationStatus: "verified",
    avatarUrl:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=200&q=60",
    state: "Tamil Nadu",
    district: "Chennai",
    bio: "Non-profit supporting first-generation learners with scholarships.",
    followerCount: 3200,
    followingCount: 40,
    createdAt: "2025-10-14T07:45:00.000Z",
  },
  {
    id: "usr_campus_coders",
    name: "Campus Coders Club",
    email: "club@example.com",
    accountType: "organization",
    organizationType: "campus_club",
    verificationStatus: "verified",
    avatarUrl:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=200&q=60",
    state: "Maharashtra",
    district: "Mumbai",
    bio: "Student-run coding club. Workshops, hackathons, mentor connects.",
    followerCount: 890,
    followingCount: 25,
    createdAt: "2025-12-05T15:20:00.000Z",
  },
  {
    id: "usr_priya",
    name: "Priya Nair",
    email: "priya@example.com",
    accountType: "student",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=60",
    state: "Kerala",
    district: "Kochi",
    bio: "Nursing student, campus food safety concern.",
    followerCount: 64,
    followingCount: 41,
    createdAt: "2026-03-10T18:15:00.000Z",
  },
  {
    id: "usr_arjun",
    name: "Arjun Mehta",
    email: "arjun@example.com",
    accountType: "student",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=60",
    state: "West Bengal",
    district: "Kolkata",
    bio: "B.Arch student, infrastructure issues near Salt Lake campus.",
    followerCount: 173,
    followingCount: 29,
    createdAt: "2026-02-18T05:40:00.000Z",
  },
]

// The single "logged-in" demo user used by the mock login path.
export const MOCK_STUDENT: User = MOCK_USERS[0]

// Used to make the login form accept a known email/account for demo purposes.
export const DEMO_LOGIN = {
  email: "ananya@example.com",
  password: "demo1234",
}

// ─── Posts ───────────────────────────────────────────────────────────────────────────

// mediaAspectRatio is generally left null; MediaDisplay measures it at runtime.
// Where provided we use the real intrinsic ratio of the sample asset.
export const MOCK_POSTS: Post[] = [
  {
    id: "p_01",
    authorId: "usr_demo",
    text: "The water cooler on the 3rd floor has been broken for 3 days and nobody has raised a complaint. 200+ students use this floor daily — please help us get it fixed!",
    mediaUrl:
      "https://images.unsplash.com/photo-1524338188336-0a6c5729c519?auto=format&fit=crop&w=1200&q=60",
    mediaType: "photo",
    mediaAspectRatio: 1.5,
    state: "Maharashtra",
    district: "Mumbai",
    category: "Academic",
    supportCount: 42,
    commentCount: 6,
    createdAt: "2026-07-30T09:14:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_02",
    authorId: "usr_rahul",
    text: "Placement notifications keep going out after deadlines. We need a central announcement channel for the placement cell.",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Karnataka",
    district: "Bengaluru",
    category: "Placements",
    supportCount: 87,
    commentCount: 14,
    createdAt: "2026-07-29T06:22:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_03",
    authorId: "usr_vidya_foundation",
    text: "Your mental health matters. We are offering free 30-minute counselling slots for all students in Chennai — just DM us or raise a comment on this post.",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Tamil Nadu",
    district: "Chennai",
    category: "Mental Health",
    supportCount: 153,
    commentCount: 28,
    createdAt: "2026-07-28T13:45:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_04",
    authorId: "usr_arjun",
    text: "The streetlight near the east gate has been out for a month. Commuting after dark is genuinely unsafe.",
    mediaUrl:
      "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=1200&q=60",
    mediaType: "photo",
    mediaAspectRatio: 1.2,
    state: "West Bengal",
    district: "Kolkata",
    category: "Harassment",
    supportCount: 96,
    commentCount: 9,
    createdAt: "2026-07-28T17:30:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_05",
    authorId: "usr_sanika",
    text: "Hostel food quality has dropped sharply this month. The mess committee minutes say contractor changed, but nobody asked the students. Let's formally raise this to the warden.",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Maharashtra",
    district: "Pune",
    category: "Academic",
    supportCount: 71,
    commentCount: 12,
    createdAt: "2026-07-27T11:02:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_06",
    authorId: "usr_vidya_foundation",
    text: "We have 15 sponsored seats for coaching classes this term for meritorious students from low-income families. Apply through the link in bio.",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Tamil Nadu",
    district: "Chennai",
    category: "Financial",
    supportCount: 120,
    commentCount: 21,
    createdAt: "2026-07-26T10:18:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_07",
    authorId: "usr_campus_coders",
    text: "Free Git & GitHub workshop this Saturday, 10 AM, EB-207. Open to all departments. First-come-first-serve, 150 seats.",
    mediaUrl:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=60",
    mediaType: "photo",
    mediaAspectRatio: 1.0,
    state: "Maharashtra",
    district: "Mumbai",
    category: "Academic",
    supportCount: 58,
    commentCount: 5,
    createdAt: "2026-07-26T05:09:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_08",
    authorId: "usr_demo",
    text: "Exam timetable clash detected — Hindi paper and Project viva on the same 2 PM slot for many of us. Sharing a petition. Sign it and let's get it fixed by the controller.",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Maharashtra",
    district: "Mumbai",
    category: "Exams",
    supportCount: 122,
    commentCount: 17,
    createdAt: "2026-07-25T08:40:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_09",
    authorId: "usr_arjun",
    text: "Flooding in front of the library during monsoons. The drain blocks every year. This is a well-known, repeated problem.",
    mediaUrl:
      "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=1200&q=60",
    mediaType: "photo",
    mediaAspectRatio: 1.5,
    state: "West Bengal",
    district: "Kolkata",
    category: "Harassment",
    supportCount: 78,
    commentCount: 7,
    createdAt: "2026-07-24T10:05:00.000Z",
    supportedByCurrentUser: false,
  },
  {
    id: "p_10",
    authorId: "usr_rahul",
    text: "Crash course fees have gone up by 40% overnight with zero explanation. Parents are panicking. Who are we supposed to go to?",
    mediaUrl: null,
    mediaType: null,
    mediaAspectRatio: null,
    state: "Karnataka",
    district: "Bengaluru",
    category: "Financial",
    supportCount: 49,
    commentCount: 3,
    createdAt: "2026-07-23T09:00:00.000Z",
    supportedByCurrentUser: false,
  },
]

// ─── Comments ────────────────────────────────────────────────────────────────────────

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "c_01",
    postId: "p_01",
    authorId: "usr_demo",
    text: "Can confirm, I've been drinking the leaked water for a week. It's bad.",
    isOrgHelp: false,
    createdAt: "2026-07-30T10:20:00.000Z",
  },
  {
    id: "c_02",
    postId: "p_01",
    authorId: "usr_campus_coders",
    text: "We can file an online complaint with the campus maintenance portal tomorrow. If you want, our club volunteers will guide you through it.",
    isOrgHelp: true,
    createdAt: "2026-07-30T11:05:00.000Z",
  },
  {
    id: "c_03",
    postId: "p_02",
    authorId: "usr_rahul",
    text: "Fully agreed. Let's collect the emails of students and raise it formally.",
    isOrgHelp: false,
    createdAt: "2026-07-29T08:00:00.000Z",
  },
  {
    id: "c_04",
    postId: "p_03",
    authorId: "usr_vidya_foundation",
    text: "We've opened 15 extra slots for tomorrow. Send a message if you need one.",
    isOrgHelp: true,
    createdAt: "2026-07-28T14:50:00.000Z",
  },
  {
    id: "c_05",
    postId: "p_08",
    authorId: "usr_sanika",
    text: "Signed. Same clash for our batch too — this is not an isolated issue.",
    isOrgHelp: false,
    createdAt: "2026-07-25T09:12:00.000Z",
  },
]

// ─── Follows ─────────────────────────────────────────────────────────────────────────

// Initial demo follow relationships (friends of user `usr_demo`).
export const MOCK_FOLLOWS: Follow[] = [
  { followerId: "usr_demo", followingId: "usr_rahul" },
  { followerId: "usr_demo", followingId: "usr_campus_coders" },
  { followerId: "usr_sanika", followingId: "usr_demo" },
]