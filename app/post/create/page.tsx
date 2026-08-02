"use client"

// Create post: text (required), optional media, required Category, and region
// auto-filled from the current user (editable). On submit, adds to the post
// store and redirects to the new post's detail page.
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Button, Card, Select, Textarea } from "@/components/ui"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { CATEGORY_OPTIONS, STATES, getDistrictsForState } from "@/constants"
import type { Category } from "@/lib/types"

export default function CreatePostPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addPost = usePostStore((s) => s.addPost)
  const showToast = useToastStore((s) => s.show)

  const [text, setText] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [state, setState] = useState(currentUser?.state ?? "")
  const [district, setDistrict] = useState(currentUser?.district ?? "")
  const [media, setMedia] = useState<PickedMedia | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Keep form synchronized with the user's region if it changes elsewhere.
  useEffect(() => {
    if (currentUser?.state && !state) setState(currentUser.state)
    if (currentUser?.district && !district) setDistrict(currentUser.district)
  }, [currentUser, state, district])

  const districtOptions = useMemo(
    () => getDistrictsForState(state).map((d) => ({ value: d, label: d })),
    [state],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

if (!currentUser) {
      // This page is route-protected, but guard anyway.
      showToast("Please log in to post", "error")
      router.push("/login")
      return
    }
    if (!text.trim()) {
      showToast("Please write something before posting", "error")
      return
    }
    if (!category) {
      showToast("Please choose a category", "error")
      return
    }
    if (!state || !district) {
      showToast("Please select your state and district", "error")
      return
    }

    setSubmitting(true)
    // TODO: replace with real Supabase insert (posts + storage for the file).
    await new Promise((r) => setTimeout(r, 500))
    const newId = addPost({
      authorId: currentUser.id,
      text: text.trim(),
      mediaUrl: media?.url ?? null,
      mediaType: media?.type ?? null,
      state,
      district,
      category,
    })
    showToast("Post published successfully", "success")
    router.push(`/post/${newId}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-h2 text-slate-900">Create a post</h1>
        <p className="text-body-sm text-slate-500">
          Share a problem you&apos;re facing so your community can help.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <Textarea
            label="What's going on?"
            name="post-text"
            rows={5}
            required
            placeholder="Describe the issue clearly… who is affected, since when, and what kind of help would help?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <Select
            label="Category"
            name="category"
            options={CATEGORY_OPTIONS}
            placeholder="Choose a category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="State"
              options={STATES.map((s) => ({ value: s, label: s }))}
              placeholder="Select state"
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                setDistrict("") // reset district on state change
              }}
              required
            />
            <Select
              label="District"
              options={districtOptions}
              placeholder="Select district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!state}
              required
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h4">Add media (optional)</h2>
          <MediaUploader value={media} onChange={setMedia} />
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:max-w-xs">
          <Send size={18} />
          Publish post
        </Button>
      </form>
    </div>
  )
}