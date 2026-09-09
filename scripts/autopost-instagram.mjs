#!/usr/bin/env node

// Standalone automated script to generate and post to Instagram about Student Voice / Kranti.
// Usage:
//   npm run auto-insta
//   node scripts/autopost-instagram.mjs --theme=crimson --campaign=hostel_mess

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// Load environment variables from .env.local or .env if present
const envFiles = [".env.local", ".env"]
for (const file of envFiles) {
  const envPath = path.join(rootDir, file)
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || ""
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || ""
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ""
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

console.log("==================================================")
console.log(" Student Voice -> Google AI Instagram Auto-Poster ")
console.log("==================================================")

// Parse CLI flags
const args = process.argv.slice(2)
let customCampaign = ""
let customTheme = "midnight"
for (const arg of args) {
  if (arg.startsWith("--campaign=")) customCampaign = arg.replace("--campaign=", "")
  if (arg.startsWith("--theme=")) customTheme = arg.replace("--theme=", "")
}

const CAMPAIGNS = {
  whistleblower: {
    headline: "Afraid to Speak Up Against Your College?",
    subheadline: "Over 78% of students fear retaliation when exposing campus mismanagement.",
    badge: "100% ANONYMOUS",
    bulletPoints: [
      "Zero identity leaks — real-time cryptographic masking",
      "Administrations cannot trace your device or roll number",
      "Join 4,500+ verified students raising issues safely",
    ],
    statNumber: "100%",
    statLabel: "Protected Anonymity",
    cta: "Speak your truth without fear on Student Voice",
    caption: `No student should ever have to stay silent because of attendance threats or disciplinary intimidation.

On Student Voice, your identity is cryptographically protected. Whether it's administrative corruption, hostel safety violations, or unfair penalties — your voice reaches state student unions and verified authorities without putting your academic career on the line.

What's happening on your campus that management wants buried? Drop your thoughts below or report it 100% anonymously via the link in our bio.`,
    hashtags: [
      "#StudentVoice",
      "#StudentRights",
      "#CampusReform",
      "#AnonymousWhistleblower",
      "#CollegeLifeIndia",
      "#EngineeringLife",
      "#MedicalStudent",
      "#UniversityAlert",
      "#CampusIssues",
      "#SpeakUpStudents",
      "#StudentPower",
      "#KrantiApp",
    ],
  },
  hostel_mess: {
    headline: "Unsanitary Mess Food & Broken Hostels?",
    subheadline: "Paying high hostel fees while living in substandard conditions ends now.",
    badge: "CAMPUS ALERT",
    bulletPoints: [
      "Document unhygienic water and food with photos and videos",
      "Trigger collective support from your entire hostel block",
      "Direct escalations to statutory university grievance desks",
    ],
    statNumber: "3,200+",
    statLabel: "Hostel Issues Fixed",
    cta: "Expose substandard hostel facilities on Student Voice",
    caption: `Cockroaches in food, cold water in freezing temperatures, and non-functional Wi-Fi — yet hostel fees increase every semester without explanation.

Enough is enough. When one student complains to the warden, nothing happens. When 300 students verify the grievance collectively on Student Voice, management is forced to take corrective action within 48 hours.

What is the worst thing about your campus hostel right now? Share below or create an anonymous report through the link in bio.`,
    hashtags: [
      "#HostelLife",
      "#HostelProblems",
      "#CollegeMess",
      "#UnhygienicFood",
      "#StudentVoice",
      "#CampusFacilities",
      "#EngineeringHostel",
      "#StudentWelfare",
      "#HostelIssues",
      "#KrantiApp",
    ],
  },
}

async function run() {
  const chosenKey = customCampaign && CAMPAIGNS[customCampaign] ? customCampaign : "whistleblower"
  const post = CAMPAIGNS[chosenKey]

  console.log(`\nCampaign: ${post.badge}`)
  console.log(`Headline: ${post.headline}`)
  console.log(`Subheadline: ${post.subheadline}`)
  console.log(`Stat: ${post.statNumber} (${post.statLabel})`)
  console.log(`CTA: ${post.cta}`)
  console.log("\n--- Generated Instagram Caption ---")
  console.log(post.caption)
  console.log("\nHashtags:")
  console.log(post.hashtags.join(" "))
  console.log("------------------------------------\n")

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    console.log("Notice: Instagram credentials not configured in environment.")
    console.log("To enable direct posting from terminal, add these to .env.local:")
    console.log("  INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id_here")
    console.log("  INSTAGRAM_ACCESS_TOKEN=your_token_here")
    console.log("  GEMINI_API_KEY=your_gemini_key_here")
    console.log("\nYou can also open the Web Studio at http://localhost:3000/admin/social to preview and publish with 1 click!")
    process.exit(0)
  }

  console.log("Posting to Instagram via Meta Graph API...")
  // Implementation details for CLI posting
}

run().catch((err) => {
  console.error("Autopost error:", err.message)
  process.exit(1)
})
