// Lightweight runtime validation for required environment variables.
// Surfaces actionable errors early instead of cryptic runtime failures.

export function validateEnv() {
  const missing: string[] = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  if (missing.length > 0 && typeof window !== "undefined") {
    console.error(
      `[Krantind] Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\nPlease create a .env.local file based on .env.example.`,
    )
  }

  return missing.length === 0
}
