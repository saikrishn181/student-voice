#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

function loadEnv() {
  const envFiles = [".env.local", ".env"]
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "")
        }
      }
    }
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.argv[2]
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[3]

if (!url || !key) {
  console.log(`
Usage:
  node scripts/view-posts.mjs [SUPABASE_URL] [SUPABASE_KEY]

Or create a .env.local file:
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`)
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log("\nFetching posts from Supabase database...\n")
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id,
      text,
      category,
      state,
      hashtags,
      support_count,
      comment_count,
      created_at,
      author_id,
      profiles:author_id (name, username)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching posts:", error.message)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log("No posts found in the database yet.")
    return
  }

  console.log(`Found ${posts.length} post(s):\n` + "=".repeat(60) + "\n")

  posts.forEach((p, index) => {
    const author = p.profiles?.name || "Unknown Author"
    const handle = p.profiles?.username ? `@${p.profiles.username}` : "no handle"
    const tags = Array.isArray(p.hashtags) && p.hashtags.length > 0
      ? p.hashtags.map((t) => `#${t}`).join(" ")
      : "none"

    console.log(`[#${index + 1}] ${author} (${handle}) | Region: ${p.state || "N/A"} | Category: ${p.category || "General"}`)
    console.log(`Date: ${new Date(p.created_at).toLocaleString()}`)
    console.log(`Supports: ${p.support_count} | Comments: ${p.comment_count} | Tags: ${tags}`)
    console.log("-".repeat(60))
    console.log(p.text)
    console.log("=".repeat(60) + "\n")
  })
}

main().catch(console.error)
