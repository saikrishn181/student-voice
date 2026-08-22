// Content moderation engine for Krantind.
// Validates text and hashtags during post creation/upload and editing.
// Blocks profanity, hate speech, harassment, threats of violence, explicit NSFW content, and scam spam.

export type ModerationCategory =
  | "profanity"
  | "hate_speech"
  | "harassment"
  | "violence"
  | "explicit"
  | "spam"

export interface ModerationResult {
  isAllowed: boolean
  category?: ModerationCategory
  flaggedWord?: string
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
  "porn", "porno", "pornography", "xxx", "blowjob", "handjob", "deepthroat",
  "orgasm", "masturbate", "masturbation", "erotic", "nude pics", "send nudes",
  "sexting", "escort service", "call girls", "sex chat",
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
function normalizeText(input: string): string {
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
 * Validates post text and hashtags against inappropriate content guidelines.
 * Returns { isAllowed: true } if clean, or { isAllowed: false, category, message } if blocked.
 */
export function checkInappropriateContent(
  text: string,
  hashtags: string[] = [],
): ModerationResult {
  const combined = `${text} ${hashtags.join(" ")}`.trim()
  if (!combined) {
    return { isAllowed: true, message: "" }
  }

  const normalized = normalizeText(combined)
  const cleanPunctuation = normalized.replace(/[^\w\s]/g, " ")
  const words = cleanPunctuation.split(/\s+/).filter(Boolean)
  const wordSet = new Set(words)

  // 1. Check Harassment & Threats (phrase matching)
  for (const phrase of HARASSMENT_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        category: "harassment",
        flaggedWord: phrase,
        message:
          "This post cannot be uploaded because it contains harassment, bullying, or threats against others. Please adhere to community guidelines.",
      }
    }
  }

  // 2. Check Violence (phrase matching)
  for (const phrase of VIOLENCE_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        category: "violence",
        flaggedWord: phrase,
        message:
          "This post cannot be uploaded because it contains violent threats or harmful content.",
      }
    }
  }

  // 3. Check Hate Speech & Slurs (exact word & phrase matching)
  for (const slur of HATE_SPEECH_WORDS) {
    if (wordSet.has(slur) || normalized.includes(` ${slur} `)) {
      return {
        isAllowed: false,
        category: "hate_speech",
        flaggedWord: slur,
        message:
          "This post cannot be uploaded because it contains hate speech, derogatory slurs, or discriminatory language.",
      }
    }
  }

  // 4. Check Explicit / NSFW
  for (const explicit of EXPLICIT_WORDS) {
    if (wordSet.has(explicit) || normalized.includes(explicit)) {
      return {
        isAllowed: false,
        category: "explicit",
        flaggedWord: explicit,
        message:
          "This post cannot be uploaded because it contains sexually explicit, NSFW, or inappropriate content.",
      }
    }
  }

  // 5. Check Spam & Scams
  for (const spam of SPAM_PATTERNS) {
    if (normalized.includes(spam)) {
      return {
        isAllowed: false,
        category: "spam",
        flaggedWord: spam,
        message:
          "This post cannot be uploaded because it contains promotional spam, scams, or malicious links.",
      }
    }
  }

  // 6. Check Profanity & Vulgar Abuses (strict word boundaries to avoid false positives)
  for (const badWord of PROFANITY_WORDS) {
    // Exact word match
    if (wordSet.has(badWord)) {
      return {
        isAllowed: false,
        category: "profanity",
        flaggedWord: badWord,
        message:
          "This post cannot be uploaded because it contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }

    // Compound phrases like "bhen chod", "madar chod", etc.
    if (badWord.includes(" ") && normalized.includes(badWord)) {
      return {
        isAllowed: false,
        category: "profanity",
        flaggedWord: badWord,
        message:
          "This post cannot be uploaded because it contains abusive or vulgar language. Krantind is a student platform — please keep discussions constructive.",
      }
    }
  }

  return {
    isAllowed: true,
    message: "",
  }
}
