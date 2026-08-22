// Test runner wrapper for moderation engine
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
  "bsdk", "mkl", "tatte", "jhant", "jhaant",
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
  "porn", "porno", "pornography", "xxx", "blowjob", "handjob", "deepthroat",
  "orgasm", "masturbate", "masturbation", "erotic", "nude pics", "send nudes",
  "sexting", "escort service", "call girls", "sex chat",
]

const SPAM_PATTERNS = [
  "free money hack", "crypto double", "earn 10000 daily fast",
  "whatsapp sex chat", "telegram leak link", "hack exam portal", "buy fake degree",
]

const LEET_MAP = {
  "@": "a", "4": "a", "8": "b", "3": "e", "1": "i", "!": "i",
  "|": "i", "0": "o", "5": "s", "$": "s", "+": "t", "7": "t", "v": "u",
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
  if (!combined) return { isAllowed: true, message: "" }

  const normalized = normalizeText(combined)
  const cleanPunctuation = normalized.replace(/[^\w\s]/g, " ")
  const words = cleanPunctuation.split(/\s+/).filter(Boolean)
  const wordSet = new Set(words)

  for (const phrase of HARASSMENT_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        category: "harassment",
        flaggedWord: phrase,
        message: "This post cannot be uploaded because it contains harassment, bullying, or threats against others.",
      }
    }
  }

  for (const phrase of VIOLENCE_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        isAllowed: false,
        category: "violence",
        flaggedWord: phrase,
        message: "This post cannot be uploaded because it contains violent threats or harmful content.",
      }
    }
  }

  for (const slur of HATE_SPEECH_WORDS) {
    if (wordSet.has(slur) || normalized.includes(` ${slur} `)) {
      return {
        isAllowed: false,
        category: "hate_speech",
        flaggedWord: slur,
        message: "This post cannot be uploaded because it contains hate speech or derogatory slurs.",
      }
    }
  }

  for (const explicit of EXPLICIT_WORDS) {
    if (wordSet.has(explicit) || normalized.includes(explicit)) {
      return {
        isAllowed: false,
        category: "explicit",
        flaggedWord: explicit,
        message: "This post cannot be uploaded because it contains sexually explicit content.",
      }
    }
  }

  for (const spam of SPAM_PATTERNS) {
    if (normalized.includes(spam)) {
      return {
        isAllowed: false,
        category: "spam",
        flaggedWord: spam,
        message: "This post cannot be uploaded because it contains promotional spam or scams.",
      }
    }
  }

  for (const badWord of PROFANITY_WORDS) {
    if (wordSet.has(badWord)) {
      return {
        isAllowed: false,
        category: "profanity",
        flaggedWord: badWord,
        message: "This post cannot be uploaded because it contains abusive or vulgar language.",
      }
    }
    if (badWord.includes(" ") && normalized.includes(badWord)) {
      return {
        isAllowed: false,
        category: "profanity",
        flaggedWord: badWord,
        message: "This post cannot be uploaded because it contains abusive or vulgar language.",
      }
    }
  }

  return { isAllowed: true, message: "" }
}
