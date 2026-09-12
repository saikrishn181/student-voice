"use client"

// Create post: text (required), hashtags (instead of a fixed category), optional
// media (up to 4 photos or 1 video). Organizations additionally get event
// fields, scheduling, and embedded polls. State is auto-filled from the current
// user's profile (not editable) so the post lands in their home state feed.
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BarChart3, CalendarClock, Send, Trash2, X, ShieldAlert, ShieldCheck, Users, Lock, UserCheck, BookmarkCheck, PartyPopper, BookOpen, Megaphone } from "lucide-react"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { MediaUploader, type PickedMedia } from "@/components/feature/MediaUploader"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_POST_CHARS } from "@/constants"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { cn, parseHashtags } from "@/lib/utils"
import { checkInappropriateContent, scanImageFile } from "@/lib/moderation"
import s from "@/lib/strings"
import type { Poll, PostVibe } from "@/lib/types"

const MAX_IMAGES = 4

type VibeOption = PostVibe

const VIBE_CONFIG: Record<
  VibeOption,
  { title: string; label: string; desc: string; placeholder: string; starterTag: string }
> = {
  issue: {
    title: "Campus Issue",
    label: "📢 Campus Issue",
    desc: "Mess food, hostel, fee transparency, admin accountability, or harassment (Whistleblower protection available)",
    placeholder: "What's the problem on campus? Describe what's happening, who's responsible, and what needs fixing...",
    starterTag: "#CampusIssue",
  },
  life: {
    title: "Campus Life",
    label: "🎉 Campus Life",
    desc: "College fests, cultural nights, fresher & farewell parties, hostel banter, canteen, or campus memes",
    placeholder: "What's buzzing on campus? Share fest moments, parties, hostel banter, campus memes, or college memories...",
    starterTag: "#CampusLife",
  },
  study: {
    title: "Study Hub",
    label: "📚 Study Hub",
    desc: "Handwritten notes, previous year questions (PYQs), exam tips, placement prep, or study hacks",
    placeholder: "Share study notes, exam strategies, previous year questions, or placement prep advice...",
    starterTag: "#StudyNotes",
  },
  other: {
    title: "Other",
    label: "💬 Other",
    desc: "General campus discussions, questions, college ideas, thoughts, or open conversations",
    placeholder: "Ask a question, share an open thought, start a discussion, or connect with batchmates...",
    starterTag: "#CampusGeneral",
  },
}

const VIBE_TAGS: Record<VibeOption, string[]> = {
  issue: ["MessFood", "HostelIssue", "FeeTransparency", "AdminAccountability", "Sanitation", "CampusWiFi", "ExamDelay"],
  life: ["CampusLife", "FestSeason", "HostelDiaries", "CollegeParty", "Freshers2026", "CampusVibes", "CanteenReview"],
  study: ["StudyNotes", "PYQ", "ExamPrep", "PlacementTips", "CheatSheet", "InternshipDrive", "StudyHub"],
  other: ["CampusGeneral", "AskCampus", "StudentLife", "Question", "Discussion", "CampusIdeas", "Batch2026"],
}

function CreatePostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addPost = usePostStore((s) => s.addPost)
  const showToast = useToastStore((s) => s.show)

  const initialVibeParam = searchParams.get("vibe") as VibeOption
  const [vibe, setVibe] = useState<VibeOption>(
    initialVibeParam === "life" || initialVibeParam === "study" || initialVibeParam === "other" || initialVibeParam === "issue"
      ? initialVibeParam
      : "issue",
  )

  const [text, setText] = useState("")
  const [hashtagInput, setHashtagInput] = useState(
    initialVibeParam === "life"
      ? "#CampusLife"
      : initialVibeParam === "study"
        ? "#StudyNotes"
        : initialVibeParam === "other"
          ? "#CampusGeneral"
          : "",
  )
  const [media, setMedia] = useState<PickedMedia[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [textError, setTextError] = useState("")
  const [tagError, setTagError] = useState("")
  const [moderationError, setModerationError] = useState("")

  const handleVibeSelect = (selectedVibe: VibeOption) => {
    setVibe(selectedVibe)
    const currentTags = parseHashtags(hashtagInput).tags
    if (currentTags.length === 0) {
      setHashtagInput(VIBE_CONFIG[selectedVibe].starterTag)
    }
  }

  const handleToggleTag = (tag: string) => {
    const cleanTag = tag.replace(/^#+/, "").toLowerCase()
    const currentTags = parseHashtags(hashtagInput).tags
    if (currentTags.includes(cleanTag)) {
      const updated = currentTags.filter((t) => t !== cleanTag).map((t) => `#${t}`).join(" ")
      setHashtagInput(updated)
    } else {
      if (currentTags.length >= 5) {
        showToast("Maximum 5 hashtags allowed", "info")
        return
      }
      const updated = [...currentTags, cleanTag].map((t) => `#${t}`).join(" ")
      setHashtagInput(updated)
    }
  }

  useEffect(() => {
    const qVibe = searchParams.get("vibe") as VibeOption
    if (qVibe && (qVibe === "issue" || qVibe === "life" || qVibe === "study" || qVibe === "other")) {
      setVibe(qVibe)
      const currentTags = parseHashtags(hashtagInput).tags
      if (currentTags.length === 0) {
        setHashtagInput(VIBE_CONFIG[qVibe].starterTag)
      }
    }
  }, [searchParams])

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
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Private account audience controls: "followers" | "anonymous"
  const [audience, setAudience] = useState<"followers" | "anonymous">("followers")
  const [friendsAlso, setFriendsAlso] = useState(false)
  const [alwaysUse, setAlwaysUse] = useState(false)

  // Load saved preference on mount so private accounts don't have to tap every time
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem("sv_private_post_pref")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.audience === "followers" || parsed.audience === "anonymous") {
          setAudience(parsed.audience)
        }
        if (typeof parsed.friendsAlso === "boolean") {
          setFriendsAlso(parsed.friendsAlso)
        }
        if (parsed.always) {
          setAlwaysUse(true)
        }
      }
    } catch {}
  }, [])

  const handleAudienceChange = (val: "followers" | "anonymous") => {
    setAudience(val)
    if (alwaysUse) {
      try {
        localStorage.setItem(
          "sv_private_post_pref",
          JSON.stringify({ audience: val, friendsAlso, always: true }),
        )
      } catch {}
    }
  }

  const handleFriendsAlsoChange = (val: boolean) => {
    setFriendsAlso(val)
    if (alwaysUse) {
      try {
        localStorage.setItem(
          "sv_private_post_pref",
          JSON.stringify({ audience, friendsAlso: val, always: true }),
        )
      } catch {}
    }
  }

  const handleAlwaysChange = (val: boolean) => {
    setAlwaysUse(val)
    try {
      if (val) {
        localStorage.setItem(
          "sv_private_post_pref",
          JSON.stringify({ audience, friendsAlso, always: true }),
        )
      } else {
        localStorage.removeItem("sv_private_post_pref")
      }
    } catch {}
  }

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

    // Pre-upload image computer vision scan
    let effectiveContentWarning = contentWarning
    for (const picked of media) {
      if (picked.type === "photo") {
        const imgScan = await scanImageFile(picked.file)
        if (imgScan.isNsfw && !effectiveContentWarning) {
          effectiveContentWarning = "nsfw"
          setContentWarning("nsfw")
          showToast("Sensitive image detected — automatically marked as 18+ NSFW with blur overlay.", "info")
        }
      }
    }

    try {
      const isPrivate = Boolean(currentUser?.isPrivate)
      const postIsFollowersOnly = isPrivate && audience === "followers"
      const postIsAnonymous = isPrivate
        ? audience === "anonymous"
        : Boolean(isAnonymous)
      const postFriendsAlso = isPrivate && audience === "anonymous" && friendsAlso

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
        contentWarning: effectiveContentWarning || null,
        isAnonymous: postIsAnonymous,
        isFollowersOnly: postIsFollowersOnly,
        friendsAlso: postFriendsAlso,
      })
      media.forEach((m) => {
        if (m.url.startsWith("blob:")) URL.revokeObjectURL(m.url)
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
          {vibe === "issue"
            ? "Speak up about campus issues, mess food, hostel, or administration accountability."
            : vibe === "life"
              ? "Share your college fest updates, parties, hostel banter, and campus moments."
              : "Share study notes, previous year questions (PYQs), and placement strategies."}
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

        {/* Modern Human-Designed Post Composer */}
        <Card className="flex flex-col gap-5 p-4 sm:p-6 border-[#E8E1D6] bg-white shadow-xs rounded-2xl">
          {/* Post Vibe / Type Selector — Sleek Rounded Pills */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Post Category:
            </label>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {(
                [
                  { id: "issue" as const, label: "📢 Campus Issue", active: "bg-rose-600 text-white border-rose-600 shadow-xs" },
                  { id: "life" as const, label: "🎉 Campus Life", active: "bg-purple-600 text-white border-purple-600 shadow-xs" },
                  { id: "study" as const, label: "📚 Study Hub", active: "bg-emerald-600 text-white border-emerald-600 shadow-xs" },
                  { id: "other" as const, label: "💬 Other", active: "bg-slate-800 text-white border-slate-800 shadow-xs" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleVibeSelect(item.id)}
                  className={cn(
                    "rounded-pill px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
                    vibe === item.id
                      ? item.active
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 pl-0.5 leading-relaxed">
              {VIBE_CONFIG[vibe].desc}
            </p>
          </div>

          {/* Text input */}
          <Textarea
            label={s["createPost.textLabel"]}
            name="post-text"
            rows={5}
            required
            placeholder={VIBE_CONFIG[vibe].placeholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setTextError("")
              setModerationError("")
            }}
            maxLength={MAX_POST_CHARS}
            error={textError || undefined}
          />

          {/* Media uploader integrated right inside */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">{s["createPost.mediaHeading"]}</span>
              {!media.some((m) => m.type === "video") ? (
                <span className="text-[11px] text-slate-400">{s["createPost.multiImageHint"](MAX_IMAGES)}</span>
              ) : null}
            </div>
            <MediaUploader value={media} onChange={setMedia} />
          </div>

          {/* Hashtags input & Quick 1-tap tag chips */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
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

            {/* Quick 1-tap tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Suggested tags:
              </span>
              {VIBE_TAGS[vibe].map((tag) => {
                const isSelected = previewTags.tags.includes(tag.toLowerCase())
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "rounded-pill px-2.5 py-0.5 text-xs font-semibold transition-all border cursor-pointer",
                      isSelected
                        ? "bg-primary-600 text-white border-primary-600 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200",
                    )}
                  >
                    #{tag} {isSelected ? "✓" : "+"}
                  </button>
                )
              })}
            </div>

            {previewTags.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 self-center">Active:</span>
                {previewTags.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Organizations Advanced Section */}
          {isOrg ? (
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s["createPost.advancedHeading"]}</h2>

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
            </div>
          ) : null}

          {/* Sensitive Content / NSFW Option */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label htmlFor="content-warning" className="text-xs font-semibold text-slate-700">
                {s["createPost.warningLabel"]}
              </label>
              <select
                id="content-warning"
                name="content-warning"
                value={contentWarning}
                onChange={(e) => setContentWarning(e.target.value)}
                className="rounded-pill border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="">None (Safe for all)</option>
                <option value="ragging">Ragging / Violence</option>
                <option value="harassment">Harassment / Bullying</option>
                <option value="mental_health">Mental Health</option>
                <option value="sensitive">Sensitive Content</option>
                <option value="nsfw">18+ NSFW</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setContentWarning((prev) => (prev === "nsfw" ? "" : "nsfw"))}
              className={cn(
                "rounded-pill border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                contentWarning === "nsfw"
                  ? "border-red-500 bg-red-600 text-white shadow-2xs"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
              )}
            >
              {contentWarning === "nsfw" ? "18+ NSFW Active" : "18+ NSFW"}
            </button>
          </div>

          {/* Private Account Audience OR Public Whistleblower / Anonymous Mode */}
          {!isOrg && currentUser?.isPrivate ? (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-purple-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Private Account Post Audience
                  </span>
                </div>
                <span className="rounded-pill bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold">
                  Private Account
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAudienceChange("followers")}
                  className={cn(
                    "rounded-pill px-3 py-1 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
                    audience === "followers"
                      ? "border-primary-600 bg-primary-600 text-white shadow-2xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Users size={13} />
                  Only for followers
                </button>
                <button
                  type="button"
                  onClick={() => handleAudienceChange("anonymous")}
                  className={cn(
                    "rounded-pill px-3 py-1 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
                    audience === "anonymous"
                      ? "border-purple-600 bg-purple-600 text-white shadow-2xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <ShieldCheck size={13} />
                  Anonymous (Everyone)
                </button>
              </div>

              {audience === "anonymous" ? (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={friendsAlso}
                    onChange={(e) => handleFriendsAlsoChange(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Also reveal identity to accepted mutual friends</span>
                </label>
              ) : null}

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={alwaysUse}
                  onChange={(e) => handleAlwaysChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span>Remember this preference</span>
              </label>
            </div>
          ) : !isOrg ? (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={cn(isAnonymous ? "text-purple-600" : "text-slate-400")} />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      Post Anonymously (Whistleblower Mode)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hides your name and profile from public view & administration.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnonymous((prev) => !prev)}
                  className={cn(
                    "rounded-pill border px-3 py-1 text-xs font-semibold transition-all cursor-pointer shrink-0 ml-2",
                    isAnonymous
                      ? "border-purple-600 bg-purple-600 text-white shadow-2xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {isAnonymous ? "Anonymous Active" : "Enable Anonymous"}
                </button>
              </div>

              {isAnonymous ? (
                <p className="text-xs text-purple-900 bg-purple-50/80 p-2.5 rounded-lg border border-purple-200/80 leading-relaxed mt-1">
                  Appears as <em>&ldquo;Anonymous Student • {currentUser?.collegeName || "Verified College"}&rdquo;</em>. Your personal profile and email are cryptographically decoupled in secure backend tables to protect against campus retaliation.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
              <span>📍 Posted to:</span>
              <span className="font-semibold text-slate-700">{state || "All Regions"}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-slate-400">
                {text.length}/{MAX_POST_CHARS}
              </span>
              <Button type="submit" size="md" loading={submitting} className="min-w-32">
                <Send size={16} aria-hidden />
                {s["createPost.submitButton"]}
              </Button>
            </div>
          </div>
        </Card>

        {/* Statutory Compliance Notice */}
        <p className="text-[11px] text-slate-500 text-center sm:text-left leading-relaxed px-1">
          By posting, you confirm this post complies with the{" "}
          <Link href="/guidelines" className="text-primary-600 underline font-semibold">
            Campus Guidelines
          </Link>{" "}
          and Indian IT Rules (2021). Focus on constructive student community and institutional accountability; do not post personal defamation, hate speech, or fake notices.
        </p>
      </form>
    </div>
  )
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl p-8 text-center text-slate-400">Loading editor...</div>}>
      <CreatePostContent />
    </Suspense>
  )
}
