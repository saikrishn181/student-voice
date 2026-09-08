"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Sparkles,
  ShieldCheck,
  Send,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Settings,
  Instagram,
  FileText,
  Palette,
  Layout,
  AlertCircle,
  HelpCircle,
  X,
  Share2,
} from "lucide-react"
import { Button, Card, EmptyState, Badge, Input } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  generateSocialPostWithGemini,
  type GeneratedSocialPost,
  type SocialTheme,
} from "@/lib/ai/gemini"
import { SocialPostCanvas, type SocialPostCanvasRef } from "@/components/feature/SocialPostCanvas"
import { cn } from "@/lib/utils"

interface TrendingPostOption {
  id: string
  text: string
  category?: string
  college?: string
  supportsCount?: number
}

const CAMPAIGN_OPTIONS = [
  { id: "whistleblower", label: "Anonymous Whistleblower", desc: "Fearless reporting & identity protection" },
  { id: "hostel_mess", label: "Hostel & Mess Food", desc: "Unhygienic food, water & living conditions" },
  { id: "fee_hike", label: "Unfair Fee Hikes", desc: "Arbitrary development fees & exam fines" },
  { id: "feature_spotlight", label: "Platform Features", desc: "Onboarding, state heatmaps & verified unions" },
  { id: "strike_unity", label: "Student Unity & Action", desc: "Petitions, protests & collective momentum" },
  { id: "trending_post", label: "Convert Live Campus Post", desc: "Highlight an actual student grievance" },
  { id: "custom", label: "Custom Campaign Brief", desc: "Type your own specific prompt" },
]

const THEME_PRESETS: { id: SocialTheme; label: string; bgClass: string }[] = [
  { id: "midnight", label: "Midnight Gold", bgClass: "bg-slate-900 border-amber-500" },
  { id: "amber", label: "Kranti Amber", bgClass: "bg-amber-900 border-amber-400" },
  { id: "crimson", label: "Crimson Alert", bgClass: "bg-red-950 border-red-500" },
  { id: "emerald", label: "Emerald Campus", bgClass: "bg-emerald-950 border-emerald-400" },
  { id: "violet", label: "Electric Violet", bgClass: "bg-purple-950 border-purple-400" },
]

export default function AdminSocialStudioPage() {
  const { currentUser } = useAuthStore()
  const { show: showToast } = useToastStore()
  const canvasRef = useRef<SocialPostCanvasRef | null>(null)

  // Campaign configuration state
  const [selectedCampaign, setSelectedCampaign] = useState<string>("whistleblower")
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [selectedTheme, setSelectedTheme] = useState<SocialTheme>("midnight")
  const [appHandle, setAppHandle] = useState<string>("@studentvoice.in")

  // Live posts for "Convert Live Campus Post"
  const [trendingPosts, setTrendingPosts] = useState<TrendingPostOption[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string>("")
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false)

  // Generated post state
  const [post, setPost] = useState<GeneratedSocialPost | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)

  // Instagram publishing state
  const [publishing, setPublishing] = useState<boolean>(false)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  const [publishedPermalink, setPublishedPermalink] = useState<string | null>(null)

  // Settings modal & credentials
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [geminiApiKey, setGeminiApiKey] = useState<string>("")
  const [instaAccountId, setInstaAccountId] = useState<string>("")
  const [instaAccessToken, setInstaAccessToken] = useState<string>("")
  const [verifyingInsta, setVerifyingInsta] = useState<boolean>(false)
  const [connectedAccount, setConnectedAccount] = useState<{
    id: string
    username: string
    name?: string
  } | null>(null)

  // Load saved keys from localStorage on mount
  useEffect(() => {
    try {
      const savedGemini = localStorage.getItem("sv_gemini_api_key") || ""
      const savedAccountId = localStorage.getItem("sv_insta_account_id") || ""
      const savedToken = localStorage.getItem("sv_insta_access_token") || ""
      const savedHandle = localStorage.getItem("sv_insta_handle") || "@studentvoice.in"

      if (savedGemini) setGeminiApiKey(savedGemini)
      if (savedAccountId) setInstaAccountId(savedAccountId)
      if (savedToken) setInstaAccessToken(savedToken)
      if (savedHandle) setAppHandle(savedHandle)
    } catch {
      // localStorage not accessible
    }
  }, [])

  // Initial generation on first load
  useEffect(() => {
    handleGeneratePost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load live posts when "trending_post" campaign is selected
  useEffect(() => {
    if (selectedCampaign !== "trending_post") return

    async function loadRecentPosts() {
      setLoadingPosts(true)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from("posts")
        .select("id, text, category, supports_count, is_anonymous")
        .order("supports_count", { ascending: false })
        .limit(20)

      setLoadingPosts(false)
      if (error) {
        showToast("Could not load recent posts", "error")
        return
      }

      const formatted: TrendingPostOption[] = (data ?? []).map((p) => ({
        id: p.id,
        text: p.text,
        category: p.category ?? "Campus Grievance",
        supportsCount: p.supports_count ?? 0,
      }))
      setTrendingPosts(formatted)
      if (formatted.length > 0 && !selectedPostId) {
        setSelectedPostId(formatted[0].id)
      }
    }

    loadRecentPosts()
  }, [selectedCampaign, selectedPostId, showToast])

  const handleGeneratePost = async () => {
    setGenerating(true)
    setPublishStatus(null)
    setPublishedPermalink(null)

    try {
      let sourcePostOption: TrendingPostOption | undefined
      if (selectedCampaign === "trending_post" && selectedPostId) {
        sourcePostOption = trendingPosts.find((p) => p.id === selectedPostId)
      }

      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignType: selectedCampaign === "custom" || selectedCampaign === "trending_post" ? undefined : selectedCampaign,
          prompt: selectedCampaign === "custom" ? customPrompt : undefined,
          sourcePost: sourcePostOption
            ? {
                id: sourcePostOption.id,
                text: sourcePostOption.text,
                category: sourcePostOption.category,
                supportsCount: sourcePostOption.supportsCount,
              }
            : undefined,
          apiKey: geminiApiKey || undefined,
          theme: selectedTheme,
        }),
      })

      const data = await res.json()
      if (!data.ok || !data.post) {
        throw new Error(data.error || "Generation returned invalid payload")
      }

      setPost(data.post)
      setSelectedTheme(data.post.colorTheme)
      showToast("Generated new post with Google AI", "success")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate post"
      showToast(msg, "error")
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("sv_gemini_api_key", geminiApiKey.trim())
      localStorage.setItem("sv_insta_account_id", instaAccountId.trim())
      localStorage.setItem("sv_insta_access_token", instaAccessToken.trim())
      localStorage.setItem("sv_insta_handle", appHandle.trim())
      showToast("Settings and API keys saved", "success")
      setSettingsOpen(false)
    } catch {
      showToast("Could not save to local storage", "error")
    }
  }

  const handleVerifyInstagram = async () => {
    if (!instaAccountId || !instaAccessToken) {
      showToast("Enter Instagram Account ID and Access Token to test", "info")
      return
    }

    setVerifyingInsta(true)
    try {
      const res = await fetch("/api/social/instagram/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: instaAccountId.trim(),
          accessToken: instaAccessToken.trim(),
        }),
      })
      const data = await res.json()
      if (!data.ok || !data.account) {
        throw new Error(data.error || "Connection check failed")
      }
      setConnectedAccount(data.account)
      showToast(`Connected to @${data.account.username}`, "success")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect"
      showToast(msg, "error")
      setConnectedAccount(null)
    } finally {
      setVerifyingInsta(false)
    }
  }

  const handleDownloadGraphic = () => {
    if (!canvasRef.current || !post) return
    const filename = `student-voice-${post.badge.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`
    canvasRef.current.downloadImage(filename)
    showToast("Downloaded 1080x1080 HD Graphic", "success")
  }

  const handleCopyCaption = async () => {
    if (!post) return
    const fullText = `${post.caption}\n\n.\n.\n${(post.hashtags || []).join(" ")}`
    try {
      await navigator.clipboard.writeText(fullText)
      showToast("Caption and hashtags copied to clipboard", "success")
    } catch {
      showToast("Could not copy to clipboard", "error")
    }
  }

  const handlePublishToInstagram = async () => {
    if (!canvasRef.current || !post) return

    if (!instaAccountId || !instaAccessToken) {
      setSettingsOpen(true)
      showToast("Configure Instagram credentials before publishing", "info")
      return
    }

    setPublishing(true)
    setPublishStatus("Exporting high-resolution graphic...")
    setPublishedPermalink(null)

    try {
      const dataUrl = canvasRef.current.exportDataUrl()
      if (!dataUrl) throw new Error("Could not export graphic from canvas")

      setPublishStatus("Uploading graphic to public storage...")
      const captionText = `${post.caption}\n\n.\n.\n${(post.hashtags || []).join(" ")}`

      setPublishStatus("Publishing container to Instagram Graph API...")
      const res = await fetch("/api/social/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          caption: captionText,
          accessToken: instaAccessToken.trim(),
          instagramAccountId: instaAccountId.trim(),
        }),
      })

      const data = await res.json()
      if (!data.ok) {
        throw new Error(data.error || "Publication failed on Meta Graph API")
      }

      setPublishedPermalink(data.permalink || "https://instagram.com")
      setPublishStatus("Published successfully to Instagram!")
      showToast("Post is now LIVE on Instagram!", "success")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish to Instagram"
      setPublishStatus(`Error: ${msg}`)
      showToast(msg, "error")
    } finally {
      setPublishing(false)
    }
  }

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <EmptyState
          icon={ShieldCheck}
          title="Admin Access Required"
          description="You need platform administrator credentials to access the AI Social Media Studio."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Top Header & Admin Nav Tabs */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
              <Sparkles size={18} />
            </span>
            <h1 className="text-h2 font-serif text-slate-900">AI Social Media Studio</h1>
            <Badge tone="primary">Google AI</Badge>
          </div>
          <p className="mt-1 text-body-sm text-slate-500">
            Generate viral Instagram graphics, copy, and publish directly to your feed about Student Voice.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/verifications">
            <Button variant="secondary" size="sm">
              <ShieldCheck size={16} /> Verifications & Moderation
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} /> API Settings
          </Button>
        </div>
      </div>

      {/* Campaign Controls & Topic Generator Bar */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-body font-semibold text-slate-800">Select Campaign Theme & Angle</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Visual Theme:</span>
              <div className="flex items-center gap-1">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    onClick={() => {
                      setSelectedTheme(preset.id)
                      if (post) setPost({ ...post, colorTheme: preset.id })
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      preset.bgClass,
                      selectedTheme === preset.id ? "scale-110 ring-2 ring-primary-500 ring-offset-1" : "opacity-75 hover:opacity-100",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Pills */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {CAMPAIGN_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCampaign(c.id)}
                className={cn(
                  "flex flex-col rounded-xl border p-2.5 text-left transition-all",
                  selectedCampaign === c.id
                    ? "border-primary-600 bg-primary-50/70 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="text-xs font-semibold text-slate-900">{c.label}</span>
                <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{c.desc}</span>
              </button>
            ))}
          </div>

          {/* Sub-inputs for custom or trending post */}
          {selectedCampaign === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Custom Campaign Brief / Angle</label>
              <Input
                placeholder="e.g. Highlight student unity against sudden hostel curfew rules in Delhi colleges"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
          )}

          {selectedCampaign === "trending_post" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Campus Grievance to Amplify</label>
              {loadingPosts ? (
                <p className="text-xs text-slate-400">Loading top student reports...</p>
              ) : trendingPosts.length === 0 ? (
                <p className="text-xs text-slate-400">No student grievances found in database.</p>
              ) : (
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none"
                >
                  {trendingPosts.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      [{tp.category}] {tp.text.slice(0, 90)} ({tp.supportsCount} supports)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Powered by Google Gemini 1.5 Flash
            </span>
            <Button
              onClick={handleGeneratePost}
              loading={generating}
              size="md"
              className="gap-2 shadow-sm"
            >
              <Sparkles size={16} /> Generate Post with Google AI
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Studio Split Screen: Left (Canvas) & Right (Instagram Preview / Publish) */}
      {post && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Graphic Canvas & Quick Tweaker (7 cols) */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout size={18} className="text-primary-600" />
                  <h3 className="text-body font-semibold text-slate-900">Instagram Graphic (1080x1080)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleDownloadGraphic}>
                    <Download size={15} /> Download HD PNG
                  </Button>
                </div>
              </div>

              {/* Responsive Canvas Display */}
              <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
                <SocialPostCanvas
                  ref={canvasRef}
                  post={post}
                  appHandle={appHandle}
                />
              </div>

              {/* Quick Text Editor to Tweak Graphic Copy Directly */}
              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tweak Graphic Content</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Headline</label>
                    <input
                      type="text"
                      value={post.headline}
                      onChange={(e) => setPost({ ...post, headline: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Category Badge</label>
                    <input
                      type="text"
                      value={post.badge}
                      onChange={(e) => setPost({ ...post, badge: e.target.value.toUpperCase() })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600">Subheadline / Quote</label>
                  <input
                    type="text"
                    value={post.subheadline}
                    onChange={(e) => setPost({ ...post, subheadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Stat Highlight</label>
                    <input
                      type="text"
                      value={post.statNumber}
                      onChange={(e) => setPost({ ...post, statNumber: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Stat Label</label>
                    <input
                      type="text"
                      value={post.statLabel}
                      onChange={(e) => setPost({ ...post, statLabel: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Instagram Live Preview & Direct Publisher (5 cols) */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram size={18} className="text-pink-600" />
                  <h3 className="text-body font-semibold text-slate-900">Instagram Feed Preview</h3>
                </div>
                <Badge tone="neutral">Ready to Post</Badge>
              </div>

              {/* Instagram Mobile Card Mock */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Insta Post Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                        SV
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">studentvoice.app</p>
                      <p className="text-[10px] text-slate-400">Campus Community</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs font-semibold tracking-widest">•••</span>
                </div>

                {/* Graphic Snapshot Placeholder / Thumbnail */}
                <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center text-center p-6">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">{post.badge}</p>
                    <p className="text-sm font-semibold line-clamp-3 px-2">{post.headline}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{post.subheadline}</p>
                  </div>
                </div>

                {/* Insta Post Actions */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-4 text-slate-700">
                    <span className="hover:text-red-500 cursor-pointer text-sm font-bold">♥</span>
                    <span className="hover:text-slate-900 cursor-pointer text-xs font-bold">💬</span>
                    <Share2 size={16} className="cursor-pointer hover:text-slate-900" />
                  </div>
                  <span className="text-slate-600 text-sm font-bold">☖</span>
                </div>

                {/* Caption View */}
                <div className="px-3 pb-3">
                  <p className="text-xs font-bold text-slate-900">
                    studentvoice.app{" "}
                    <span className="font-normal text-slate-700 whitespace-pre-line">
                      {post.caption}
                    </span>
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-blue-600">
                    {(post.hashtags || []).slice(0, 10).join(" ")}
                  </p>
                </div>
              </div>

              {/* Caption Editor & Copy Box */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Caption & Strategic Hashtags</label>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                  >
                    <Copy size={13} /> Copy All
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={post.caption}
                  onChange={(e) => setPost({ ...post, caption: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Instagram Publishing Status / Result Banner */}
              {publishStatus && (
                <div
                  className={cn(
                    "rounded-xl p-3 text-xs flex flex-col gap-1.5",
                    publishedPermalink
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : publishStatus.startsWith("Error")
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-blue-50 text-blue-800 border border-blue-200",
                  )}
                >
                  <p className="font-semibold">{publishStatus}</p>
                  {publishedPermalink && (
                    <a
                      href={publishedPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline"
                    >
                      <ExternalLink size={13} /> View Live Post on Instagram
                    </a>
                  )}
                </div>
              )}

              {/* Publish Action Button */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <Button
                  onClick={handlePublishToInstagram}
                  loading={publishing}
                  variant="primary"
                  size="lg"
                  className="w-full gap-2 shadow-md bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:opacity-95 text-white"
                >
                  <Instagram size={18} /> Publish Directly to Instagram
                </Button>
                <p className="text-center text-[11px] text-slate-400">
                  Posts instantly to your connected Instagram Creator or Business account.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Settings & Credentials Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-700" />
                <h3 className="text-h4 font-serif text-slate-900">API Keys & Instagram Integration</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {/* Google Gemini Key */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">Google Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary-600 hover:underline flex items-center gap-1"
                  >
                    Get free key <ExternalLink size={11} />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Used by the studio to generate captions, hooks, and campaign strategies.
                </p>
              </div>

              {/* Instagram Account ID */}
              <div>
                <label className="text-xs font-semibold text-slate-800">
                  Instagram Business / Creator Account ID
                </label>
                <Input
                  placeholder="17841400000000000"
                  value={instaAccountId}
                  onChange={(e) => setInstaAccountId(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Found in Meta Graph API Explorer or your Facebook Page Settings &gt; Linked Instagram.
                </p>
              </div>

              {/* Meta Access Token */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">Meta User / Page Access Token</label>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary-600 hover:underline flex items-center gap-1"
                  >
                    Meta Graph Explorer <ExternalLink size={11} />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder="EAA..."
                  value={instaAccessToken}
                  onChange={(e) => setInstaAccessToken(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Must have permissions: <code>instagram_content_publish</code> and <code>instagram_basic</code>.
                </p>
              </div>

              {/* App Handle */}
              <div>
                <label className="text-xs font-semibold text-slate-800">Instagram Handle Watermark</label>
                <Input
                  placeholder="@studentvoice.in"
                  value={appHandle}
                  onChange={(e) => setAppHandle(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Account Connection Status */}
              {connectedAccount && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                  <Check size={16} className="text-emerald-600" />
                  <span>
                    Verified connection to <strong>@{connectedAccount.username}</strong>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleVerifyInstagram}
                  loading={verifyingInsta}
                >
                  Test Instagram Connection
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
