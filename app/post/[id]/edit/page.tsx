"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Send, ShieldAlert, X } from "lucide-react"
import { Button, Card, Input, Textarea, EmptyState } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_POST_CHARS } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { cn, parseHashtags } from "@/lib/utils"
import { checkInappropriateContent, scanImageFile } from "@/lib/moderation"
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
  const [moderationError, setModerationError] = useState("")
  const [contentWarning, setContentWarning] = useState("")

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
      setContentWarning(fresh.contentWarning ?? "")
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
      setContentWarning(post.contentWarning ?? "")
      setExistingMediaUrls((post.mediaUrl ?? "").split(" ").filter(Boolean))
      setExistingMediaType(post.mediaType as "photo" | "video" | null)
      setLoaded(true)
    }
  }, [post, loaded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTextError("")
    setTagError("")
    setModerationError("")

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

    // Content moderation validation: blocks profanity, harassment, hate speech, explicit content & scam spam
    const moderation = checkInappropriateContent(text, previewTags.tags)
    if (!moderation.isAllowed) {
      setModerationError(moderation.message)
      showToast(moderation.message, "error")
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

    // Pre-upload image computer vision scan
    let effectiveContentWarning = contentWarning
    for (const picked of media) {
      if (picked.type === "photo") {
        const imgScan = await scanImageFile(picked.file)
        if (imgScan.isNsfw && !effectiveContentWarning) {
          effectiveContentWarning = "nsfw"
          setContentWarning("nsfw")
          showToast("Sensitive visual content detected — post marked as 18+ NSFW with blur overlay.", "info")
        }
      }
    }

    try {
      await updatePost(postId, {
        text: text.trim(),
        hashtags: previewTags.tags,
        state: post?.state ?? currentUser?.state ?? "",
        contentWarning: effectiveContentWarning || null,
        mediaUrl: finalUrls.length > 0 ? finalUrls.join(" ") : null,
        mediaType: finalUrls.length > 0 ? mediaType : null,
        mediaAspectRatio: finalUrls.length > 0 ? mediaAspectRatio : null,
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

  if (loaded && post && (!currentUser || (post.authorId !== currentUser.id && !currentUser.isAdmin))) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={Send}
          title="Unauthorized"
          description="You can only edit posts that you authored."
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
        {moderationError ? (
          <div className="flex items-start gap-3 rounded-card border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm animate-fade-up">
            <ShieldAlert size={22} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-bold text-red-950">Post Blocked by Safety Guidelines</p>
              <p className="mt-1 leading-relaxed text-red-800">{moderationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setModerationError("")}
              aria-label="Dismiss alert"
              className="rounded-full p-1 text-red-400 hover:bg-red-200 hover:text-red-700 transition-app"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <Card className="flex flex-col gap-4">
          <Textarea
            label={s["createPost.textLabel"]}
            name="post-text"
            rows={5}
            required
            placeholder={s["createPost.textPlaceholder"]}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setTextError("")
              setModerationError("")
            }}
            maxLength={MAX_POST_CHARS}
            error={textError || undefined}
          />

          <Input
            label={s["createPost.hashtagsLabel"]}
            name="hashtags"
            placeholder={s["createPost.hashtagsPlaceholder"]}
            value={hashtagInput}
            onChange={(e) => {
              setHashtagInput(e.target.value)
              setTagError("")
              setModerationError("")
            }}
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

        {/* Content warning & NSFW */}
        <Card className="flex flex-col gap-3.5 p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="content-warning" className="text-sm font-semibold text-slate-800">
              {s["createPost.warningLabel"]}
            </label>
            <button
              type="button"
              onClick={() => setContentWarning((prev) => (prev === "nsfw" ? "" : "nsfw"))}
              className={cn(
                "rounded-pill border px-3 py-1 text-xs font-semibold transition-app flex items-center gap-1.5",
                contentWarning === "nsfw"
                  ? "border-red-500 bg-red-600 text-white shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {contentWarning === "nsfw" ? "18+ NSFW Active" : s["createPost.nsfwToggle"]}
            </button>
          </div>
          <select
            id="content-warning"
            name="content-warning"
            value={contentWarning}
            onChange={(e) => setContentWarning(e.target.value)}
            className="w-full rounded-card border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition-app focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">{s["createPost.warningNone"]}</option>
            <option value="nsfw">18+ NSFW (Not Safe For Work)</option>
            <option value="spoiler">Spoiler</option>
            <option value="triggering">Triggering content</option>
            <option value="graphic">Graphic content</option>
          </select>
          <p className="text-body-sm text-slate-500">{s["createPost.warningHint"]}</p>
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:max-w-xs">
          <Send size={18} aria-hidden />
          {s["editPost.save"]}
        </Button>
      </form>
    </div>
  )
}
