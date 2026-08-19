"use client"

// Edit post: prefills the create form with an existing post and saves via
// usePostStore.updatePost. Only the author can edit (RLS enforces this too).
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Button, Card, Input, Textarea, EmptyState } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_POST_CHARS } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { parseHashtags } from "@/lib/utils"
import s from "@/lib/strings"

export default function EditPostPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const params = use(paramsPromise)
  const postId = params.id
  const currentUser = useAuthStore((s) => s.currentUser)
  const posts = usePostStore((s) => s.posts)
  const updatePost = usePostStore((s) => s.updatePost)
  const showToast = useToastStore((s) => s.show)

  const post = posts.find((p) => p.id === postId)

  const [text, setText] = useState("")
  const [hashtagInput, setHashtagInput] = useState("")
  const [media, setMedia] = useState<PickedMedia[]>([])
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([])
  const [existingMediaType, setExistingMediaType] = useState<"photo" | "video" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [textError, setTextError] = useState("")
  const [tagError, setTagError] = useState("")

  // Keep hashtag preview live as the user types.
  const previewTags = parseHashtags(hashtagInput)

  // Hydrate the form once the post is available.
  useEffect(() => {
    if (!postId) return
    usePostStore.getState().loadAll(currentUser?.id).finally(() => {
      const fresh = usePostStore.getState().posts.find((p) => p.id === postId)
      if (!fresh) {
        setLoaded(true)
        return
      }
      setText(fresh.text)
      setHashtagInput(fresh.hashtags.join(" "))
      setExistingMediaUrls((fresh.mediaUrl ?? "").split(" ").filter(Boolean))
      setExistingMediaType(fresh.mediaType as "photo" | "video" | null)
      setLoaded(true)
    })
  }, [postId, currentUser?.id])

  // Never hydrate from the responsive lookup; but if we already have it, use it.
  useEffect(() => {
    if (post && !loaded) {
      setText(post.text)
      setHashtagInput(post.hashtags.join(" "))
      setExistingMediaUrls((post.mediaUrl ?? "").split(" ").filter(Boolean))
      setExistingMediaType(post.mediaType as "photo" | "video" | null)
      setLoaded(true)
    }
  }, [post, loaded])

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
    if (previewTags.error) {
      setTagError(s[previewTags.error])
      return
    }

    setSubmitting(true)

    // Existing media survives unless replaced/removed; new picks upload.
    const finalUrls: string[] = [...existingMediaUrls]
    let mediaType = existingMediaType
    let mediaAspectRatio: number | null = null
    for (const picked of media) {
      const upload = await uploadPostMedia(picked.file)
      if (!upload.ok) {
        setSubmitting(false)
        showToast(upload.error ?? "Could not upload media. Please try again.", "error")
        return
      }
      finalUrls.push(upload.url ?? "")
      mediaType = picked.type
      if (!mediaAspectRatio && upload.aspectRatio) mediaAspectRatio = upload.aspectRatio
      if (picked.url.startsWith("blob:")) URL.revokeObjectURL(picked.url)
    }

    try {
      await updatePost(postId, {
        text: text.trim(),
        mediaUrl: finalUrls.length > 0 ? finalUrls.join(" ") : null,
        mediaType: finalUrls.length > 0 ? mediaType : null,
        mediaAspectRatio,
        state: currentUser?.state ?? "",
        hashtags: previewTags.tags,
      })
      showToast(s["toast.postUpdated"], "success")
      router.push(`/post/${postId}`)
    } catch (err) {
      setSubmitting(false)
      showToast(err instanceof Error ? err.message : "Could not update post. Please try again.", "error")
    }
  }

  if (loaded && !post) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={Send}
          title={s["postDetail.notFound.title"]}
          description={s["postDetail.notFound.description"]}
          action={
            <Button onClick={() => router.push("/feed")}>
              {s["postDetail.notFound.backToFeed"]}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
      <div>
        <h1 className="text-h2 text-slate-900">{s["editPost.title"]}</h1>
        <p className="text-body-sm text-slate-500">{s["editPost.subtitle"]}</p>
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

          <p className="rounded-card bg-paper-deep px-3 py-2 text-body-sm text-slate-600">
            {s["createPost.stateAuto"].replace("{state}", currentUser?.state ?? "")}
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h4">{s["createPost.mediaHeading"]}</h2>
          <MediaUploader value={media} onChange={setMedia} />
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:max-w-xs">
          <Send size={18} aria-hidden />
          {s["editPost.save"]}
        </Button>
      </form>
    </div>
  )
}
