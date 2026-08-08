"use client"

// Create post: text (required), optional media, required Category, and state
// auto-filled from the current user (editable). On submit, adds to the post
// store and redirects to the new post's detail page.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Button, Card, Select, Textarea } from "@/components/ui"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { CATEGORY_OPTIONS, STATES } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import s from "@/lib/strings"
import type { Category } from "@/lib/types"

export default function CreatePostPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addPost = usePostStore((s) => s.addPost)
  const showToast = useToastStore((s) => s.show)

  const [text, setText] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [state, setState] = useState(currentUser?.state ?? "")
  const [media, setMedia] = useState<PickedMedia | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [textError, setTextError] = useState("")

  // Keep form synchronized with the user's state if it changes elsewhere.
  useEffect(() => {
    if (currentUser?.state && !state) setState(currentUser.state)
  }, [currentUser, state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTextError("")

    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      router.push("/login")
      return
    }
    if (!text.trim()) {
      setTextError(s["validation.postEmpty"])
      return
    }
    if (!category) {
      showToast(s["validation.categoryRequired"], "error")
      return
    }
    if (!state) {
      showToast(s["validation.regionRequired"], "error")
      return
    }

    setSubmitting(true)
    let mediaUrl: string | null = null
    let mediaAspectRatio: number | null = null
    if (media) {
      const upload = await uploadPostMedia(media.file)
      if (!upload.ok) {
        setSubmitting(false)
        showToast(upload.error ?? "Could not upload media. Please try again.", "error")
        return
      }
      mediaUrl = upload.url ?? null
      mediaAspectRatio = upload.aspectRatio ?? null
      // Blob URLs are only for preview — release ours once the file is stored.
      if (media.url.startsWith("blob:")) URL.revokeObjectURL(media.url)
    }

    try {
      const post = await addPost({
        authorId: currentUser.id,
        text: text.trim(),
        mediaUrl,
        mediaType: media?.type ?? null,
        mediaAspectRatio,
        state,
        category,
      })
      showToast(s["toast.postPublished"], "success")
      router.push(`/post/${post.id}`)
    } catch (err) {
      setSubmitting(false)
      showToast(err instanceof Error ? err.message : "Could not publish post. Please try again.", "error")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
      <div>
        <h1 className="text-h2 text-slate-900">{s["createPost.title"]}</h1>
        <p className="text-body-sm text-slate-500">
          {s["createPost.subtitle"]}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <Textarea
            label={s["createPost.textLabel"]}
            name="post-text"
            rows={5}
            required
            placeholder={s["createPost.textPlaceholder"]}
            value={text}
            onChange={(e) => { setText(e.target.value); setTextError("") }}
            error={textError || undefined}
          />

          <Select
            label={s["createPost.categoryLabel"]}
            name="category"
            options={CATEGORY_OPTIONS}
            placeholder={s["createPost.categoryPlaceholder"]}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            required
          />

          <Select
            label={s["createPost.stateLabel"]}
            options={STATES.map((st) => ({ value: st, label: st }))}
            placeholder={s["createPost.statePlaceholder"]}
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h4">{s["createPost.mediaHeading"]}</h2>
          <MediaUploader value={media} onChange={setMedia} />
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:max-w-xs">
          <Send size={18} aria-hidden />
          {s["createPost.submitButton"]}
        </Button>
      </form>
    </div>
  )
}