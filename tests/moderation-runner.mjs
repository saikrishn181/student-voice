// Test runner wrapper for moderation & 10-strike ban engine
const PROFANITY_WORDS = [
  "fuck", "fucking", "fucker", "fucked", "fuckoff", "motherfucker", "mf",
  "bitch", "bitches", "bitching", "bastard", "bastards",
  "asshole", "assholes", "dickhead", "dick", "dicks",
  "cunt", "cunts", "whore", "whores", "slut", "sluts",
  "pussy", "pussies", "cock", "cocks", "twat", "wanker",
  "bullshit", "shithead", "dipshit",
  "bhenchod", "ben chod", "bhen chod", "bc", "mc", "madarchod", "madar chod", "bhadwa",
  "bhadwe", "chutiya", "chutiye", "chutiyap", "gandu", "gaandu", "harami", "haraami",
  "lauda", "lavda", "lund", "lodu", "randi", "raandi", "saala", "kutta",
  "kutiya", "kamina", "kaminey", "chodu", "bosadika", "bhosadike", "bhosadika", "bhosdiwala",
  "bsdk", "mkl", "tatte", "jhant", "jhaant", "chut", "gaand", "chudai",
  "lanja", "lanjakodaka", "modda", "dengu", "gudha", "puku", "munda",
  "thevidiya", "othalaka", "sunni", "punda", "oombu",
  "lavdya", "zavnya", "bhadvya",
]

const HATE_SPEECH_WORDS = [
  "nigger", "nigga", "faggot", "fag", "dyke", "retard", "retarded",
  "chamar", "bhangi", "chakka", "hijra", "katwa", "mulla", "jihadi",
  "paki", "chinki", "terrorist", "genocide", "subhuman",
]

const HARASSMENT_PATTERNS = [
  "kill yourself", "kys", "go die", "die in a fire", "hang yourself",
  "cut your wrist", "i will kill you", "i will murder you", "shoot up",
  "i will rape you", "gonna kill you", "slit your throat",
]

const VIOLENCE_PATTERNS = [
  "plant a bomb", "bomb the college", "school shooting", "mass shooting",
  "rape threat", "acid attack", "lynch them", "burn them alive",
]

const EXPLICIT_WORDS = [
  "nsfw", "porn", "porno", "pornography", "xxx", "blowjob", "handjob", "deepthroat",
  "orgasm", "masturbate", "masturbation", "erotic", "nude pics", "send nudes",
  "sexting", "escort service", "call girls", "sex chat", "striptease",
  "onlyfans leak", "hardcore porn", "xvideos", "pornhub",
]

const SPAM_PATTERNS = [
  "free money hack", "crypto double", "earn 10000 daily fast",
  "whatsapp sex chat", "telegram leak link", "hack exam portal", "buy fake degree",
]

const LEET_MAP = {
  "@": "a", "4": "a", "8": "b", "3": "e", "1": "i", "!": "i",
  "|": "i", "0": "o", "5": "s", "$": "s", "+": "t", "7": "t",
}

function normalizeText(input) {
  if (!input) return ""
  let text = input.toLowerCase()
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
  let decoded = ""
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    decoded += LEET_MAP[char] ?? char
  }
  decoded = decoded.replace(/\b([a-z])\s+([a-z])\s+([a-z])(?:\s+([a-z]))?\b/g, "$1$2$3$4")
  decoded = decoded.replace(/(.)\1{2,}/g, "$1$1")
  return decoded
}

export function checkInappropriateContent(text, hashtags = []) {
  const combined = `${text} ${hashtags.join(" ")}`.trim()
  if (!combined) return { isAllowed: true, isNsfw: false, message: "" }

  const normalized = normalizeText(combined)
  const cleanPunctuation = normalized.replace(/[^\w\s]/g, " ")
  const words = cleanPunctuation.split(/\s+/).filter(Boolean)
  const wordSet = new Set(words)

  for (const explicit of EXPLICIT_WORDS) {
    if (wordSet.has(explicit) || normalized.includes(explicit)) {
      return {
        isAllowed: false,
        isNsfw: true,
        category: "nsfw",
        flaggedWord: explicit,
        message: "This post contains sexually explicit or NSFW material and cannot be uploaded.",
      }
    }
  }

  for (const phrase of HARASSMENT_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "harassment",
        flaggedWord: phrase,
        message: "This post contains harassment, bullying, or threats against others.",
      }
    }
  }

  for (const phrase of VIOLENCE_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "violence",
        flaggedWord: phrase,
        message: "This post contains violent threats or harmful content.",
      }
    }
  }

  for (const slur of HATE_SPEECH_WORDS) {
    if (wordSet.has(slur) || normalized.includes(` ${slur} `)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "hate_speech",
        flaggedWord: slur,
        message: "This post contains hate speech, derogatory slurs, or discriminatory language.",
      }
    }
  }

  for (const spam of SPAM_PATTERNS) {
    if (normalized.includes(spam)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "spam",
        flaggedWord: spam,
        message: "This post contains promotional spam, scams, or malicious links.",
      }
    }
  }

  for (const badWord of PROFANITY_WORDS) {
    if (wordSet.has(badWord)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "profanity",
        flaggedWord: badWord,
        message: "This post contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }
    if (badWord.includes(" ") && normalized.includes(badWord)) {
      return {
        isAllowed: false,
        isNsfw: false,
        category: "profanity",
        flaggedWord: badWord,
        message: "This post contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }
  }

  return { isAllowed: true, isNsfw: false, message: "" }
}

export function calculateStrikePolicy(currentStrikes) {
  const newStrikes = currentStrikes + 1
  let isBanned = false
  let bannedUntil = null
  let banReason = ""
  let message = ""

  if (newStrikes >= 10) {
    isBanned = true
    bannedUntil = null
    banReason = "Account permanently banned: Reached 10 NSFW / Community Guidelines violations."
    message = `Your post was removed for NSFW / inappropriate content. You have reached 10 strikes — your account has been permanently banned.`
  } else if (newStrikes >= 6) {
    isBanned = true
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    bannedUntil = until.toISOString()
    banReason = `Account temporarily suspended for 7 days (Strike ${newStrikes}/10).`
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Your account is temporarily suspended for 7 days.`
  } else if (newStrikes >= 3) {
    isBanned = true
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000)
    bannedUntil = until.toISOString()
    banReason = `Account temporarily restricted for 24 hours (Strike ${newStrikes}/10).`
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Your account is temporarily restricted for 24 hours.`
  } else {
    message = `Your post was removed for NSFW / inappropriate content. Strike ${newStrikes} of 10. Repeated violations will result in account suspension.`
  }

  return {
    postRemoved: true,
    strikeCount: newStrikes,
    isBanned,
    bannedUntil,
    banReason,
    message,
  }
}

export function checkUserBanStatus(user) {
  if (!user) return { isBanned: false, isPermanent: false }
  if (!user.isBanned) return { isBanned: false, isPermanent: false }

  if (user.bannedUntil) {
    const expiresAt = new Date(user.bannedUntil).getTime()
    const now = Date.now()
    if (now >= expiresAt) {
      return { isBanned: false, isPermanent: false }
    }
    const remainingMs = expiresAt - now
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    return { isBanned: true, remainingDays, isPermanent: false }
  }

  return { isBanned: true, isPermanent: true }
}

export function evaluateReportThreshold(reportCount) {
  if (reportCount >= 5) return { action: "remove", shouldStrike: true }
  if (reportCount >= 3) return { action: "blur", shouldStrike: false }
  return { action: "none", shouldStrike: false }
}
