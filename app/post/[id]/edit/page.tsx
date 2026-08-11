"use client"

// Edit post: prefills the create form with an existing post and saves via
// usePostStore.updatePost. Only the author can edit (RLS enforces this too).
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Send } from "lucide-react"
import { Button, Card, Select, Textarea, EmptyState } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { CATEGORY_OPTIONS, STATES } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import s from "@/lib/strings"
import type { Category } from "@/lib/types"

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params.id
  const currentUser = useAuthStore((s) => s.currentUser)
  const posts = usePostStore((s) => s.posts)
  const updatePost = usePostStore((s) => s.updatePost)
  const showToast = useToastStore((s) => s.show)

  const post = posts.find((p) => p.id === postId)

  const [text, setText] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [state, setState] = useState("")
  const [media, setMedia] = useState<PickedMedia | null>(null)
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null)
  const [existingMediaType, setExistingMediaType] = useState<"photo" | "video" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [textError, setTextError] = useState("")

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
      setCategory(fresh.category)
      setState(fresh.state)
      setExistingMediaUrl(fresh.mediaUrl)
      setExistingMediaType(fresh.mediaType as "photo" | "video" | null)
      if (fresh.mediaUrl && fresh.mediaType) {
        setMedia({ url: fresh.mediaUrl, type: fresh.mediaType as "photo" | "video", file: new File([], "") })
      }
      setLoaded(true)
    })
  }, [postId, currentUser?.id])

  // Never hydrate from the responsive lookup; but if we already have it, use it.
  useEffect(() => {
    if (post && !loaded) {
      setText(post.text)
      setCategory(post.category)
      setState(post.state)
      setExistingMediaUrl(post.mediaUrl)
      setExistingMediaType(post.mediaType as "photo" | "video" | null)
      if (post.mediaUrl && post.mediaType) {
        setMedia({ url: post.mediaUrl, type: post.mediaType as "photo" | "video", file: new File([], "") })
      }
      setLoaded(true)
    }
  }, [post, loaded])

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
    let mediaUrl = existingMediaUrl
    let mediaType = existingMediaType
    let mediaAspectRatio: number | null = null

    // If a new file was picked, upload it (replacing the old media).
    if (media?.file && media.file.size > 0) {
      const upload = await uploadPostMedia(media.file)
      if (!upload.ok) {
        setSubmitting(false)
        showToast(upload.error ?? "Could not upload media. Please try again.", "error")
        return
      }
      mediaUrl = upload.url ?? null
      mediaType = media.type
      mediaAspectRatio = upload.aspectRatio ?? null
    } else if (media === null) {
      mediaUrl = null
      mediaType = null
      mediaAspectRatio = null
    }

    try {
      await updatePost(postId, {
        text: text.trim(),
        mediaUrl,
        mediaType,
        mediaAspectRatio,
        state,
        category,
      })
      showToast(s["toast.postUpdated"], "success")
      router.push(`/post/${postId}`)
    } catch (err) {
      setSubmitting(false)
      showToast(err instanceof Error ? err.message : "Could not update post. Please try again.", "error")
    }
  }

  function setError(message: string) {
    showToast(message, "error")
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

  if (loaded && post && currentUser && post.authorId !== currentUser.id) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={Send}
          title="Not Authorized"
          description="You do not have permission to edit this post."
          action={
            <Button onClick={() => router.push(`/post/${postId}`)}>
              Return to Post
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
          {s["editPost.save"]}
        </Button>
      </form>
    </div>
  )
}