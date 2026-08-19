"use client"

// Tag page — every post carrying #tag, fetched straight from Supabase so the
// view is complete even if the feed store has only loaded the first pages.
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Hash, Inbox, AlertTriangle, RefreshCw } from "lucide-react"
import { PostCard } from "@/components/feature"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { EmptyState, Button } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { categoryFromHashtags, cn } from "@/lib/utils"
import s from "@/lib/strings"
import type { Post } from "@/lib/types"

interface PostRow {
  id: string
  author_id: string
  text: string
  media_url: string | null
  media_type: string | null
  media_aspect_ratio: number | null
  state: string | null
  hashtags: string[] | null
  support_count: number
  comment_count: number
  is_pinned: boolean
  updated_at: string | null
  view_count: number
  scheduled_for: string | null
  event_at: string | null
  event_location: string | null
  poll_json: unknown | null
  created_at: string
}

function rowToPost(row: PostRow): Post {
  const rawPoll = row.poll_json as { question?: string; options?: string[]; ends_at?: string } | null
  return {
    id: row.id,
    authorId: row.author_id,
    text: row.text,
    mediaUrl: row.media_url,
    mediaType: (row.media_type as Post["mediaType"]) ?? null,
    mediaAspectRatio: row.media_aspect_ratio,
    state: row.state ?? "",
    category: categoryFromHashtags(row.hashtags ?? []),
    hashtags: row.hashtags ?? [],
    supportCount: row.support_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    supportedByCurrentUser: false,
    isPinned: row.is_pinned,
    editedAt: row.updated_at ?? undefined,
    viewCount: row.view_count,
    scheduledFor: row.scheduled_for ?? undefined,
    eventAt: row.event_at ?? undefined,
    eventLocation: row.event_location ?? undefined,
    poll:
      rawPoll && Array.isArray(rawPoll.options) && rawPoll.options.length > 0
        ? {
            question: rawPoll.question ?? "",
            options: rawPoll.options,
            endsAt: rawPoll.ends_at ?? undefined,
          }
        : null,
    savedByCurrentUser: false,
  }
}

export default function TagPage() {
  const params = useParams<{ tag: string }>()
  const tag = decodeURIComponent(params.tag)
  const currentUser = useAuthStore((s) => s.currentUser)
  const followedTopics = usePostStore((s) => s.followedTopics)
  const toggleFollowTopic = usePostStore((s) => s.toggleFollowTopic)
  const loadFollowedTopics = usePostStore((s) => s.loadFollowedTopics)
  const showToast = useToastStore((s) => s.show)

  const [posts, setPosts] = useState<Post[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [retrying, setRetrying] = useState(false)
  const [topicBusy, setTopicBusy] = useState(false)

  useEffect(() => {
    if (currentUser) void loadFollowedTopics(currentUser.id)
  }, [currentUser, loadFollowedTopics])

  const following = followedTopics.includes(tag)

  const handleToggleTopic = async () => {
    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }
    if (topicBusy) return
    setTopicBusy(true)
    try {
      await toggleFollowTopic(tag, currentUser.id)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setTopicBusy(false)
    }
  }

  const load = () => {
    const supabase = createSupabaseBrowserClient()
    supabase
      .from("posts")
      .select("*")
      .or("scheduled_for.is.null,scheduled_for.lte.now")
      .contains("hashtags", [tag])
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          setStatus("error")
          return
        }
        const rows = (data ?? []) as PostRow[]
        setPosts(rows.map(rowToPost))
        // Prefetch authors so names/avatars never flash "Unknown".
        const missing = Array.from(new Set(rows.map((r) => r.author_id))).filter(
          (id) => id !== currentUser?.id && !useUserStore.getState().users[id],
        )
        missing.forEach((id) => void useUserStore.getState().loadById(id))
        setStatus("ready")
      })
  }

  useEffect(() => {
    setStatus("loading")
    setPosts([])
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag])

  const handleRetry = () => {
    setRetrying(true)
    load()
    setRetrying(false)
  }

  const count = posts.length

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} aria-hidden /> {s["tag.back"]}
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-h2 text-slate-900">
          <Hash className="size-6 text-primary-600" aria-hidden /> {tag}
        </h1>
        <p className="text-body-sm text-slate-500">{s["tag.subtitle"](count)}</p>
        <button
          type="button"
          onClick={handleToggleTopic}
          disabled={topicBusy}
          aria-pressed={following}
          className={cn(
            "mt-3 rounded-pill px-4 py-1.5 text-sm font-semibold transition-app",
            following
              ? "bg-primary-600 text-white hover:bg-primary-700"
              : "border border-primary-200 bg-white text-primary-700 hover:bg-primary-50",
          )}
        >
          {following ? s["explore.following"] : s["explore.follow"]}
        </button>
      </div>

      {status === "loading" ? <PostCardSkeleton count={3} /> : null}

      {status === "error" ? (
        <div className="surface-card">
          <EmptyState
            icon={AlertTriangle}
            title={s["feed.error.title"]}
            description={s["feed.error.description"]}
            action={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={16} />}
                onClick={handleRetry}
                loading={retrying}
              >
                {s["feed.error.retry"]}
              </Button>
            }
          />
        </div>
      ) : null}

      {status === "ready" && posts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={s["tag.empty.title"]}
          description={s["tag.empty.description"]}
        />
      ) : null}

      {status === "ready" && posts.length > 0
        ? posts.map((post) => (
            <PostCard key={post.id} post={post} showFollow={false} />
          ))
        : null}
    </div>
  )
}