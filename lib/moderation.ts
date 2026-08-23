// Content moderation engine for Krantind.
// Validates text, hashtags, and media keywords for NSFW / inappropriate content.
// Automatically removes offending posts post-upload and manages the 10-strike ban policy.

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import type { User } from "@/lib/types"

export type ModerationCategory =
  | "nsfw"
  | "profanity"
  | "hate_speech"
  | "harassment"
  | "violence"
  | "explicit"
  | "spam"

export interface ModerationResult {
  isAllowed: boolean
  isNsfw: boolean
  category?: ModerationCategory
  flaggedWord?: string
  message: string
}

export interface StrikeResult {
  postRemoved: boolean
  strikeCount: number
  isBanned: boolean
  bannedUntil?: string | null
  banReason?: string
  message: string
}

// 1. High-severity profanity & abusive slang (English & Indian slang)
const PROFANITY_WORDS = [
  // English vulgarities / abuses
  "fuck", "fucking", "fucker", "fucked", "fuckoff", "motherfucker", "mf",
  "bitch", "bitches", "bitching", "bastard", "bastards",
  "asshole", "assholes", "dickhead", "dick", "dicks",
  "cunt", "cunts", "whore", "whores", "slut", "sluts",
  "pussy", "pussies", "cock", "cocks", "twat", "wanker",
  "bullshit", "shithead", "dipshit",

  // Hindi / Indian common abusive vulgarities & gaalis (latinized)
  "bhenchod", "ben chod", "bhen chod", "bc", "mc", "madarchod", "madar chod", "bhadwa",
  "bhadwe", "chutiya", "chutiye", "chutiyap", "gandu", "gaandu", "harami", "haraami",
  "lauda", "lavda", "lund", "lodu", "randi", "raandi", "saala", "kutta",
  "kutiya", "kamina", "kaminey", "chodu", "bosadika", "bhosadike", "bhosadika", "bhosdiwala",
  "bsdk", "mkl", "tatte", "jhant", "jhaant",
]

// 2. Hate speech, discrimination, casteist & religious derogatory slurs
const HATE_SPEECH_WORDS = [
  "nigger", "nigga", "faggot", "fag", "dyke", "retard", "retarded",
  "chamar", "bhangi", "chakka", "hijra", "katwa", "mulla", "jihadi",
  "paki", "chinki", "terrorist", "genocide", "subhuman",
]

// 3. Harassment, cyberbullying, death threats & self-harm incitement
const HARASSMENT_PATTERNS = [
  "kill yourself", "kys", "go die", "die in a fire", "hang yourself",
  "cut your wrist", "i will kill you", "i will murder you", "shoot up",
  "i will rape you", "gonna kill you", "slit your throat",
]

// 4. Extreme violence & terror threats
const VIOLENCE_PATTERNS = [
  "plant a bomb", "bomb the college", "school shooting", "mass shooting",
  "rape threat", "acid attack", "lynch them", "burn them alive",
]

// 5. Explicit NSFW & sexual solicitation
const EXPLICIT_WORDS = [
  "nsfw", "porn", "porno", "pornography", "xxx", "blowjob", "handjob", "deepthroat",
  "orgasm", "masturbate", "masturbation", "erotic", "nude pics", "send nudes",
  "sexting", "escort service", "call girls", "sex chat", "striptease",
  "onlyfans leak", "hardcore porn", "xvideos", "pornhub",
]

// 6. Scam / illegal promotion spam
const SPAM_PATTERNS = [
  "free money hack", "crypto double", "earn 10000 daily fast",
  "whatsapp sex chat", "telegram leak link", "hack exam portal", "buy fake degree",
]

// Leetspeak / obfuscation normalization table
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "+": "t",
  "7": "t",
  "v": "u",
}

/**
 * Normalizes input text by:
 * - Converting to lowercase
 * - Stripping zero-width characters and spaces between single letters (e.g. "f u c k")
 * - Converting leetspeak substitutions
 * - Collapsing multiple consecutive identical letters (e.g. "fuuuuck" -> "fuck")
 */
export function normalizeText(input: string): string {
  if (!input) return ""
  let text = input.toLowerCase()

  // Remove zero-width spaces and soft hyphens
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")

  // Decode leetspeak characters
  let decoded = ""
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    decoded += LEET_MAP[char] ?? char
  }

  // Collapse space-separated single letters (e.g. "f u c k" -> "fuck")
  decoded = decoded.replace(/\b([a-z])\s+([a-z])\s+([a-z])(?:\s+([a-z]))?\b/g, "$1$2$3$4")

  // Collapse 3+ repeated characters to 1 or 2 (e.g. "fuuuuck" -> "fuck")
  decoded = decoded.replace(/(.)\1{2,}/g, "$1$1")

  return decoded
}

/**
 * Validates post text and hashtags against inappropriate and NSFW content guidelines.
 * Returns { isAllowed: true, isNsfw: false } if clean, or { isAllowed: false, isNsfw: true/false, category, message } if violating.
 */
export function checkInappropriateContent(
  text: string,
  hashtags: string[] = [],
): ModerationResult {
  const combined = `${text} ${hashtags.join(" ")}`.trim()
  if (!combined) {
    return { isAllowed: true, isNsfw: false, message: "" }
  }

  const normalized = normalizeText(combined)
  const cleanPunctuation = normalized.replace(/[^\w\s]/g, " ")
  const words = cleanPunctuation.split(/\s+/).filter(Boolean)
  const wordSet = new Set(words)

  // 1. Check Explicit NSFW Content
  for (const explicit of EXPLICIT_WORDS) {
    if (wordSet.has(explicit) || normalized.includes(explicit)) {
      return {
        isAllowed: false,
        isNsfw: true,
        category: "nsfw",
        flaggedWord: explicit,
        message:
          "This post contains sexually explicit or NSFW material and cannot be uploaded.",
      }
    }
  }

  // 2. Check Harassment & Threats (phrase matching)
  for (const phrase of HARASSMENT_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "harassment",
        flaggedWord: phrase,
        message:
          "This post contains harassment, bullying, or threats against others.",
      }
    }
  }

  // 3. Check Violence (phrase matching)
  for (const phrase of VIOLENCE_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "violence",
        flaggedWord: phrase,
        message:
          "This post contains violent threats or harmful content.",
      }
    }
  }

  // 4. Check Hate Speech & Slurs (exact word & phrase matching)
  for (const slur of HATE_SPEECH_WORDS) {
    if (wordSet.has(slur) || normalized.includes(` ${slur} `)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "hate_speech",
        flaggedWord: slur,
        message:
          "This post contains hate speech, derogatory slurs, or discriminatory language.",
      }
    }
  }

  // 5. Check Spam & Scams
  for (const spam of SPAM_PATTERNS) {
    if (normalized.includes(spam)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "spam",
        flaggedWord: spam,
        message:
          "This post contains promotional spam, scams, or malicious links.",
      }
    }
  }

  // 6. Check Profanity & Vulgar Abuses (strict word boundaries to avoid false positives)
  for (const badWord of PROFANITY_WORDS) {
    if (wordSet.has(badWord)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "profanity",
        flaggedWord: badWord,
        message:
          "This post contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }

    if (badWord.includes(" ") && normalized.includes(badWord)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "profanity",
        flaggedWord: badWord,
        message:
          "This post contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }
  }

  return {
    isAllowed: true,
    isNsfw: false,
    message: "",
  }
}

/**
 * Handles automated removal of a violating post and applies strikes / bans to the author.
 * After 10 strikes, the account is permanently banned (with tiered temporary suspensions at 3 and 6 strikes).
 */
export async function processPostViolation(
  postId: string,
  userId: string,
  reason: string,
): Promise<StrikeResult> {
  const supabase = createSupabaseBrowserClient()

  // 1. Immediately delete the violating post from Supabase
  try {
    await supabase.from("posts").delete().eq("id", postId)
  } catch (err) {
    console.error("Failed to delete violating post in Supabase:", err)
  }

  // Also remove from local store
  usePostStore.getState().deletePost(postId).catch(() => {})

  // 2. Fetch current strikes for the user
  let currentStrikes = 0
  try {
    const { data } = await supabase
      .from("profiles")
      .select("strike_count, is_banned, banned_until")
      .eq("id", userId)
      .maybeSingle()

    if (data) {
      currentStrikes = Number(data.strike_count) || 0
    }
  } catch {}

  // Fallback to local storage if needed
  if (typeof window !== "undefined") {
    const localKey = `krantind_strikes_${userId}`
    const stored = Number(localStorage.getItem(localKey)) || 0
    currentStrikes = Math.max(currentStrikes, stored)
  }

  const newStrikes = currentStrikes + 1
  let isBanned = false
  let bannedUntil: string | null = null
  let banReason = ""
  let message = ""

  // 3. Apply strike & ban tiers:
  if (newStrikes >= 10) {
    // 10 Strikes: Permanent Ban!
    isBanned = true
    bannedUntil = null // permanent
    banReason = "Account permanently banned: Reached 10 NSFW / Community Guidelines violations."
    message = `Your post was removed for NSFW / inappropriate content. You have reached 10 strikes — your account has been permanently banned.`
  } else if (newStrikes >= 6) {
    // 6 to 9 Strikes: 7-Day Temporary Ban
    isBanned = true
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    bannedUntil = until.toISOString()
    banReason = `Account temporarily suspended for 7 days (Strike ${newStrikes}/10).`
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Your account is temporarily suspended for 7 days.`
  } else if (newStrikes >= 3) {
    // 3 to 5 Strikes: 24-Hour Temporary Restriction
    isBanned = true
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000)
    bannedUntil = until.toISOString()
    banReason = `Account temporarily restricted for 24 hours (Strike ${newStrikes}/10).`
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Your account is temporarily restricted for 24 hours.`
  } else {
    // 1 to 2 Strikes: Warning
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Repeated violations will result in account suspension.`
  }

  // 4. Update profiles in Supabase
  try {
    await supabase
      .from("profiles")
      .update({
        strike_count: newStrikes,
        is_banned: isBanned,
        banned_until: bannedUntil,
        ban_reason: banReason || null,
      })
      .eq("id", userId)
  } catch (err) {
    console.error("Failed to update profile strikes in Supabase:", err)
  }

  // Save to local storage for instant sync
  if (typeof window !== "undefined") {
    localStorage.setItem(`krantind_strikes_${userId}`, String(newStrikes))
    if (isBanned) {
      localStorage.setItem(`krantind_banned_${userId}`, JSON.stringify({ isBanned, bannedUntil, banReason }))
    }
  }

  // Refresh current user auth profile
  useAuthStore.getState().refreshProfile().catch(() => {})

  return {
    postRemoved: true,
    strikeCount: newStrikes,
    isBanned,
    bannedUntil,
    banReason,
    message,
  }
}

/**
 * Checks if a user is currently banned. Handles expiration of temporary bans.
 */
export function checkUserBanStatus(user: User | null | undefined): {
  isBanned: boolean
  remainingDays?: number
  isPermanent: boolean
} {
  if (!user) return { isBanned: false, isPermanent: false }

  if (!user.isBanned) return { isBanned: false, isPermanent: false }

  // Check if temporary ban has expired
  if (user.bannedUntil) {
    const expiresAt = new Date(user.bannedUntil).getTime()
    const now = Date.now()
    if (now >= expiresAt) {
      // Ban has expired!
      return { isBanned: false, isPermanent: false }
    }
    const remainingMs = expiresAt - now
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    return { isBanned: true, remainingDays, isPermanent: false }
  }

  // Permanent ban (bannedUntil is null)
  return { isBanned: true, isPermanent: true }
}
