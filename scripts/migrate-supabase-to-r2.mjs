// Migrates every object in the Supabase `post-media` bucket to Cloudflare R2,
// then rewrites `posts.media_url` and `profiles.avatar_url` to the new R2
// public URLs (only rows whose URL pointed at Supabase Storage).
//
// Usage:
//   node scripts/migrate-supabase-to-r2.mjs [--delete-source]
//
// Env vars required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (Supabase dashboard → Settings → API)
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_URL                             (public bucket domain, e.g. https://pub-abc123.r2.dev)
//
// `--delete-source` removes the Supabase objects only AFTER they were copied
// and the DB rows updated. Run once without it first to inspect the output.
import { createClient } from "@supabase/supabase-js"
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "")
const DELETE_SOURCE = process.argv.includes("--delete-source")

const required = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL }
for (const [name, value] of Object.entries(required)) {
  if (!value) {
    console.error(`Missing env var: ${name}`)
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// "https://<ref>.supabase.co/storage/v1/object/public/post-media/posts/x.jpg"
const SUPABASE_STORAGE_PREFIX = new URL(SUPABASE_URL).origin + "/storage/v1/object/public/post-media/"

function r2PublicUrl(path) {
  return `${R2_PUBLIC_URL}/${path}`
}

async function listSupabaseObjects(prefix) {
  const objects = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from("post-media").list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw new Error(`list(${prefix}) failed: ${error.message}`)
    objects.push(...data.map((f) => `${prefix}${f.name}`))
    if (data.length < 100) break
    offset += 100
  }
  return objects
}

async function migrate() {
  const paths = [
    ...(await listSupabaseObjects("posts/")),
    ...(await listSupabaseObjects("avatars/")),
  ]
  console.log(`Found ${paths.length} objects in Supabase post-media bucket.`)

  let copied = 0
  const updatedRows = { posts: 0, profiles: 0 }

  for (const path of paths) {
    const { data: blob, error: dlError } = await supabase.storage.from("post-media").download(path)
    if (dlError || !blob) {
      console.error(`  SKIP ${path} (download failed: ${dlError?.message ?? "no data"})`)
      continue
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: blob.type || "application/octet-stream",
      }),
    )
    const newUrl = r2PublicUrl(path)

    const oldUrl = SUPABASE_STORAGE_PREFIX + path
    const { error: postErr } = await supabase
      .from("posts")
      .update({ media_url: newUrl })
      .eq("media_url", oldUrl)
    if (postErr) console.error(`  DB posts update failed for ${path}: ${postErr.message}`)
    else updatedRows.posts += 1

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("avatar_url", oldUrl)
    if (profileErr) console.error(`  DB profiles update failed for ${path}: ${profileErr.message}`)
    else updatedRows.profiles += 1

    if (DELETE_SOURCE) {
      const { error: delError } = await supabase.storage.from("post-media").remove([path])
      if (delError) console.error(`  delete failed for ${path}: ${delError.message}`)
    }
    copied += 1
    console.log(`  ${copied}/${paths.length} ${path} -> ${newUrl}`)
  }

  console.log(`\nDone: copied ${copied}/${paths.length}.`)
  console.log(`DB rows updated: ${updatedRows.posts} posts, ${updatedRows.profiles} profiles.`)
  console.log(DELETE_SOURCE ? "Source objects deleted from Supabase." : "Source objects kept in Supabase. Re-run with --delete-source to remove them.")
  process.exit(0)
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})