"use client"

// Create post: text (required), hashtags (instead of a fixed category), optional
// media (up to 4 photos or 1 video). Organizations additionally get event
// fields, scheduling, and embedded polls. State is auto-filled from the current
// user's profile (not editable) so the post lands in their home state feed.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarClock, Send, Trash2, X, ShieldAlert } from "lucide-react"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_POST_CHARS } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { cn, parseHashtags } from "@/lib/utils"
import { checkInappropriateContent } from "@/lib/moderation"
import s from "@/lib/strings"
import type { Poll } from "@/lib/types"

const MAX_IMAGES = 4

export default function CreatePostPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addPost = usePostStore((s) => s.addPost)
  const showToast = useToastStore((s) => s.show)

  const [text, setText] = useState("")
  const [hashtagInput, setHashtagInput] = useState("")
  const [media, setMedia] = useState<PickedMedia[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [textError, setTextError] = useState("")
  const [tagError, setTagError] = useState("")
  const [moderationError, setModerationError] = useState("")

  // Poll editor (orgs only).
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [pollError, setPollError] = useState("")

  // Event fields (orgs only).
  const [eventEnabled, setEventEnabled] = useState(false)
  const [eventAt, setEventAt] = useState("")
  const [eventLocation, setEventLocation] = useState("")

  // Scheduling (orgs only).
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledFor, setScheduledFor] = useState("")
  const [contentWarning, setContentWarning] = useState("")

  const state = currentUser?.state ?? ""
  const isOrg = currentUser?.accountType === "organization"

  // Keep hashtag preview live as the user types.
  const previewTags = parseHashtags(hashtagInput)

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.accountType === "organization") return
    // Students never see the poll/event/schedule panels.
    setPollEnabled(false)
    setEventEnabled(false)
    setScheduleEnabled(false)
  }, [currentUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTextError("")
    setTagError("")
    setPollError("")
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
    if (!state) {
      showToast(s["validation.regionRequired"], "error")
      router.push("/onboarding/profile")
      return
    }
    if (previewTags.error) {
      setTagError(s[previewTags.error])
      return
    }

    let poll: Poll | null = null
    if (pollEnabled) {
      const options = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (!pollQuestion.trim() || options.length < 2) {
        setPollError(s["createPost.pollError"])
        return
      }
      poll = { question: pollQuestion.trim(), options }
    }

    let eventAtISO: string | null = null
    if (eventEnabled) {
      if (!eventAt) {
        showToast(s["createPost.eventError"], "error")
        return
      }
      eventAtISO = new Date(eventAt).toISOString()
    }

    let scheduledForISO: string | null = null
    if (scheduleEnabled) {
      if (!scheduledFor) {
        showToast(s["createPost.scheduleError"], "error")
        return
      }
      const when = new Date(scheduledFor)
      if (when.getTime() <= Date.now()) {
        showToast(s["createPost.schedulePast"], "error")
        return
      }
      scheduledForISO = when.toISOString()
    }

    setSubmitting(true)

    // Upload every picked file; join image URLs with a space (video is single).
    let mediaUrl: string | null = null
    let mediaType: PickedMedia["type"] | null = null
    let mediaAspectRatio: number | null = null
    try {
      const uploads: string[] = []
      for (const picked of media) {
        const upload = await uploadPostMedia(picked.file)
        if (!upload.ok) {
          showToast(upload.error ?? "Could not upload media. Please try again.", "error")
          setSubmitting(false)
          return
        }
        uploads.push(upload.url ?? "")
        mediaType = picked.type
        if (!mediaAspectRatio && upload.aspectRatio) mediaAspectRatio = upload.aspectRatio
        if (picked.url.startsWith("blob:")) URL.revokeObjectURL(picked.url)
      }
      if (uploads.length > 0) {
        mediaUrl = uploads.filter(Boolean).join(" ")
        if (uploads.length > MAX_IMAGES) {
          showToast(s["media.uploader.maxPhotos"](MAX_IMAGES), "error")
        }
      }
    } catch (err) {
      setSubmitting(false)
      showToast(err instanceof Error ? err.message : "Could not upload media. Please try again.", "error")
      return
    }

    try {
      const post = await addPost({
        authorId: currentUser.id,
        text: text.trim(),
        mediaUrl,
        mediaType: mediaType ?? null,
        mediaAspectRatio,
        state,
        hashtags: previewTags.tags,
        scheduledFor: scheduledForISO,
        eventAt: eventAtISO,
        eventLocation: eventLocation.trim() || null,
        poll,
        contentWarning: contentWarning || null,
      })
      showToast(s["toast.postPublished"], "success")
      router.push(`/post/${post.id}`)
    } catch (err) {
      setSubmitting(false)
      const errorMsg = err instanceof Error ? err.message : "Could not publish post. Please try again."
      setModerationError(errorMsg)
      showToast(errorMsg, "error")
    }
  }

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  const addPollOption = () => {
    if (pollOptions.length >= 4) return
    setPollOptions((prev) => [...prev, ""])
  }

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return
    setPollOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleSection = (setter: (v: boolean) => void, current: boolean) => {
    setter(!current)
    setPollError("")
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
            {s["createPost.stateAuto"].replace("{state}", state)}
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h4">{s["createPost.mediaHeading"]}</h2>
          <MediaUploader value={media} onChange={setMedia} />
          {!media.some((m) => m.type === "video") ? (
            <p className="text-body-sm text-slate-500">{s["createPost.multiImageHint"](MAX_IMAGES)}</p>
          ) : null}
        </Card>

        {isOrg ? (
          <>
            <Card className="flex flex-col gap-4">
              <h2 className="text-h4">{s["createPost.advancedHeading"]}</h2>

              {/* Poll */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection(setPollEnabled, pollEnabled)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-app",
                      pollEnabled ? "border-primary-600 bg-primary-600" : "border-slate-300 bg-white",
                    )}
                  >
                    {pollEnabled ? <X size={12} className="text-white" /> : <BarChart3 size={12} className="text-slate-400" />}
                  </span>
                  {s["createPost.pollToggle"]}
                </button>
                {pollEnabled ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <Input
                      label={s["createPost.pollQuestion"]}
                      name="poll-question"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      maxLength={200}
                      placeholder={s["createPost.pollQuestionPlaceholder"]}
                      error={pollError || undefined}
                    />
                    <div className="flex flex-col gap-2">
                      {pollOptions.map((option, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            label={s["createPost.pollOption"](i + 1)}
                            name={`poll-option-${i}`}
                            value={option}
                            onChange={(e) => updatePollOption(i, e.target.value)}
                            maxLength={120}
                            placeholder={s["createPost.pollOptionPlaceholder"](i + 1)}
                          />
                          {pollOptions.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => removePollOption(i)}
                              aria-label={s["createPost.pollRemoveOption"]}
                              className="mt-6 shrink-0 rounded-card p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {pollOptions.length < 4 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={addPollOption}
                      >
                        {s["createPost.pollAddOption"]}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Event */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection(setEventEnabled, eventEnabled)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-app",
                      eventEnabled ? "border-primary-600 bg-primary-600" : "border-slate-300 bg-white",
                    )}
                  >
                    <CalendarClock size={12} className={eventEnabled ? "text-white" : "text-slate-400"} />
                  </span>
                  {s["createPost.eventToggle"]}
                </button>
                {eventEnabled ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label={s["createPost.eventAt"]}
                      name="event-at"
                      type="datetime-local"
                      value={eventAt}
                      onChange={(e) => setEventAt(e.target.value)}
                    />
                    <Input
                      label={s["createPost.eventLocation"]}
                      name="event-location"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      maxLength={200}
                      placeholder={s["createPost.eventLocationPlaceholder"]}
                    />
                  </div>
                ) : null}
              </div>

              {/* Schedule */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection(setScheduleEnabled, scheduleEnabled)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-app",
                      scheduleEnabled ? "border-primary-600 bg-primary-600" : "border-slate-300 bg-white",
                    )}
                  >
                    <CalendarClock size={12} className={scheduleEnabled ? "text-white" : "text-slate-400"} />
                  </span>
                  {s["createPost.scheduleToggle"]}
                </button>
                {scheduleEnabled ? (
                  <div className="mt-3">
                    <Input
                      label={s["createPost.scheduleAt"]}
                      name="scheduled-for"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                    <p className="mt-1 text-body-sm text-slate-500">{s["createPost.scheduleHint"]}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </>
        ) : null}

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
              🔞 {contentWarning === "nsfw" ? "18+ NSFW Active" : s["createPost.nsfwToggle"]}
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
            <option value="nsfw">🔞 18+ NSFW (Not Safe For Work)</option>
            <option value="spoiler">⚠️ Spoiler</option>
            <option value="triggering">⚡ Triggering content</option>
            <option value="graphic">🛑 Graphic content</option>
          </select>
          <p className="text-body-sm text-slate-500">{s["createPost.warningHint"]}</p>
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:max-w-xs">
          <Send size={18} aria-hidden />
          {s["createPost.submitButton"]}
        </Button>
      </form>
    </div>
  )
}
