"use client"

// Create post: text (required), hashtags (instead of a fixed category), optional
// media. State is auto-filled from the current user's profile (not editable) so
// the post lands in their home state feed automatically.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_POST_CHARS } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { parseHashtags } from "@/lib/utils"
import s from "@/lib/strings"

export default function CreatePostPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addPost = usePostStore((s) => s.addPost)
  const showToast = useToastStore((s) => s.show)

  const [text, setText] = useState("")
  const [hashtagInput, setHashtagInput] = useState("")
  const [media, setMedia] = useState<PickedMedia | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [textError, setTextError] = useState("")
  const [tagError, setTagError] = useState("")

  const state = currentUser?.state ?? ""

  // Keep hashtag preview live as the user types.
  const previewTags = parseHashtags(hashtagInput)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTextError("")
    setTagError("")

    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      router.push("/login")
      return
    }
    if (!text.trim()) {
      setTextError(s["validation.postEmpty"])
      return
    }
    if (text.trim().length > MAX_POST_CHARS) {
      setTextError(s["validation.postTooLong"])
      return
    }
    if (!state) {
      showToast(s["validation.regionRequired"], "error")
      router.push("/onboarding/profile")
      return
    }
    if (previewTags.error) {
      setTagError(s[previewTags.error])
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
        hashtags: previewTags.tags,
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
            maxLength={MAX_POST_CHARS}
            error={textError || undefined}
          />

          <Input
            label={s["createPost.hashtagsLabel"]}
            name="hashtags"
            placeholder={s["createPost.hashtagsPlaceholder"]}
            value={hashtagInput}
            onChange={(e) => { setHashtagInput(e.target.value); setTagError("") }}
            error={tagError || undefined}
          />
          <p className="-mt-2 text-body-sm text-slate-500">{s["createPost.hashtagsHint"]}</p>

          {previewTags.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previewTags.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="rounded-card bg-slate-50 px-3 py-2 text-body-sm text-slate-600">
            {s["createPost.stateAuto"].replace("{state}", state)}
          </p>
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
