// Cloudflare R2 (S3-compatible) client — SERVER ONLY. Never import this from
// a "use client" file; credentials must stay out of the browser bundle.
import { S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

export const R2_BUCKET = process.env.R2_BUCKET ?? ""

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured — add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET to your env.",
    )
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

// Browser-safe public base URL for the bucket: R2_PUBLIC_URL should be your
// public bucket domain (r2.dev or custom) WITHOUT trailing slash, e.g.
// "https://pub-abc123.r2.dev".
export function publicUrl(path: string): string {
  const base = process.env.R2_PUBLIC_URL ?? ""
  if (!base) throw new Error("R2_PUBLIC_URL is not set — public bucket domain required.")
  return `${base.replace(/\/+$/, "")}/${path}`
}

// Signed PUT URL the browser can upload directly to (no credentials exposed).
export async function createPresignedUploadUrl(
  path: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: path,
    ContentType: contentType,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds })
}

export async function deleteObject(path: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: path }),
  )
}