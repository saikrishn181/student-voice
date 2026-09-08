"use client"

// Admin moderation page: review organization verification requests and open
// post reports. Only users with profiles.is_admin = true can access it (the
// "Admins can update any profile" RLS policy backs the approve/reject actions).
// Gate yourself as admin in the SQL editor:
//   update public.profiles set is_admin = true where email = 'you@example.com';
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  ShieldCheck,
  ShieldX,
  Lock,
  Inbox,
  ExternalLink,
  EyeOff,
  ShieldAlert,
  Trash2,
  Search,
  Filter,
  Ban,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
} from "lucide-react"
import { Button, Card, EmptyState, Badge, Avatar, Modal, Input } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { adminManageStudentStrikes } from "@/lib/moderation"
import { CATEGORIES } from "@/constants"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { cn, timeAgo } from "@/lib/utils"

interface OrgRow {
  id: string
  name: string
  email: string
  organization_type: string | null
  verification_status: "pending" | "verified" | "rejected"
  state: string | null
  bio: string | null
  created_at: string
}

interface ReportItem {
  id: string
  reporter_id: string
  post_id: string
  reason: string
  details: string | null
  status: "open" | "reviewed" | "dismissed"
  created_at: string
  reporterName: string
  reporterUsername: string
  reporterAvatar?: string
  postContent?: string
  postAuthorId?: string
  postAuthorName?: string
  postAuthorUsername?: string
  postAuthorAvatar?: string
}

interface AnonymousPostItem {
  id: string
  authorId: string
  text: string
  category: string
  createdAt: string
  authorName: string
  authorUsername?: string
  authorEmail?: string
  authorCollege?: string
  authorAvatar?: string
  strikeCount: number
  isBanned: boolean
  bannedUntil?: string | null
  banReason?: string | null
}

export default function AdminVerificationsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [anonPosts, setAnonPosts] = useState<AnonymousPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Search and filter for anonymous posts
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Student moderation / strike modal state
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string
    name: string
    email?: string
    strikeCount: number
    isBanned: boolean
    bannedUntil?: string | null
    banReason?: string | null
  } | null>(null)
  const [strikeAction, setStrikeAction] = useState<"strike" | "suspend_24h" | "suspend_7d" | "ban" | "pardon">("strike")
  const [strikeReason, setStrikeReason] = useState("")
  const [strikeBusy, setStrikeBusy] = useState(false)

  useEffect(() => {
    if (!currentUser || !currentUser.isAdmin) {
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    
    async function loadData() {
      try {
        // 1. Fetch pending organizations
        const orgsRes = await supabase
          .from("profiles")
          .select("*")
          .eq("account_type", "organization")
          .eq("verification_status", "pending")
          .order("created_at", { ascending: false })

        if (orgsRes.error) showToast(orgsRes.error.message, "error")
        setOrgs((orgsRes.data ?? []) as OrgRow[])

        // 2. Fetch open reports
        const reportsRes = await supabase
          .from("reports")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })

        if (reportsRes.error) {
          showToast(reportsRes.error.message, "error")
        }

        const rawReports = reportsRes.data ?? []
        if (rawReports.length > 0) {
          // Collect IDs for bulk lookup
          const reporterIds = Array.from(new Set(rawReports.map((r) => r.reporter_id).filter(Boolean)))
          const postIds = Array.from(new Set(rawReports.map((r) => r.post_id).filter(Boolean)))

          // Fetch reporters
          const { data: reportersData } = reporterIds.length > 0
            ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", reporterIds)
            : { data: [] }
          const reportersMap = new Map((reportersData ?? []).map((u) => [u.id, u]))

          // Fetch posts
          const { data: postsData } = postIds.length > 0
            ? await supabase.from("posts").select("id, text, author_id").in("id", postIds)
            : { data: [] }
          const postsMap = new Map((postsData ?? []).map((p) => [p.id, p]))

          // Fetch post authors
          const postAuthorIds = Array.from(new Set((postsData ?? []).map((p) => p.author_id).filter(Boolean)))
          const { data: authorsData } = postAuthorIds.length > 0
            ? await supabase.from("profiles").select("id, name, username, avatar_url, email, strike_count, is_banned, banned_until, ban_reason").in("id", postAuthorIds)
            : { data: [] }
          const authorsMap = new Map((authorsData ?? []).map((u) => [u.id, u]))

          // Hydrate rich ReportItem records
          const hydratedReports: ReportItem[] = rawReports.map((r) => {
            const reporter = reportersMap.get(r.reporter_id)
            const post = postsMap.get(r.post_id)
            const author = post ? authorsMap.get(post.author_id) : null

            const reporterName = reporter?.name?.trim() || reporter?.username?.trim() || "Student Reporter"
            const reporterUsername = reporter?.username ? `@${reporter.username}` : "student"
            const postAuthorName = author?.name?.trim() || author?.username?.trim() || "Student Author"
            const postAuthorUsername = author?.username ? `@${author.username}` : "author"

            return {
              id: r.id,
              reporter_id: r.reporter_id,
              post_id: r.post_id,
              reason: r.reason,
              details: r.details,
              status: r.status,
              created_at: r.created_at,
              reporterName,
              reporterUsername,
              reporterAvatar: reporter?.avatar_url,
              postContent: post?.text || "Post unavailable or removed",
              postAuthorId: post?.author_id,
              postAuthorName,
              postAuthorUsername,
              postAuthorAvatar: author?.avatar_url,
            }
          })
          setReports(hydratedReports)
        } else {
          setReports([])
        }

        // 3. Fetch anonymous posts for Admin Intelligence Audit
        const anonRes = await supabase
          .from("posts")
          .select("id, author_id, text, category, created_at, is_anonymous")
          .eq("is_anonymous", true)
          .order("created_at", { ascending: false })
          .limit(50)

        const rawAnon = (anonRes.data ?? []) as {
          id: string
          author_id: string
          text: string
          category?: string
          created_at: string
          is_anonymous: boolean
        }[]

        if (rawAnon.length > 0) {
          const anonAuthorIds = Array.from(new Set(rawAnon.map((p) => p.author_id).filter(Boolean)))
          const { data: anonAuthorsData } = anonAuthorIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, name, username, email, avatar_url, college_name, strike_count, is_banned, banned_until, ban_reason")
                .in("id", anonAuthorIds)
            : { data: [] }
          const anonAuthorsMap = new Map((anonAuthorsData ?? []).map((u) => [u.id, u]))

          const hydratedAnonPosts: AnonymousPostItem[] = rawAnon.map((p) => {
            const author = anonAuthorsMap.get(p.author_id)
            return {
              id: p.id,
              authorId: p.author_id,
              text: p.text,
              category: p.category ?? "General",
              createdAt: p.created_at,
              authorName: author?.name?.trim() || "Student Author",
              authorUsername: author?.username ? `@${author.username}` : undefined,
              authorEmail: author?.email,
              authorCollege: author?.college_name,
              authorAvatar: author?.avatar_url,
              strikeCount: Number(author?.strike_count) || 0,
              isBanned: Boolean(author?.is_banned),
              bannedUntil: author?.banned_until ?? null,
              banReason: author?.ban_reason ?? null,
            }
          })
          setAnonPosts(hydratedAnonPosts)
        } else {
          setAnonPosts([])
        }
      } catch (err) {
        console.error("Admin data load error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [showToast])

  const deleteAnonPost = async (postId: string) => {
    setBusyId(postId)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from("posts").delete().eq("id", postId)
    setBusyId(null)
    if (error) {
      showToast(error.message || "Could not delete post", "error")
      return
    }
    showToast("Anonymous post removed by admin", "success")
    setAnonPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const handleApplyStrike = async () => {
    if (!selectedStudent) return
    setStrikeBusy(true)
    try {
      const res = await adminManageStudentStrikes(selectedStudent.id, {
        action: strikeAction,
        reason: strikeReason.trim(),
      })
      showToast(res.message, "success")
      setAnonPosts((prev) =>
        prev.map((p) =>
          p.authorId === selectedStudent.id
            ? { ...p, strikeCount: res.strikes, isBanned: res.isBanned }
            : p,
        ),
      )
      setSelectedStudent(null)
      setStrikeReason("")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to apply moderation action", "error")
    } finally {
      setStrikeBusy(false)
    }
  }

  const filteredAnonPosts = useMemo(() => {
    return anonPosts.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchText = p.text.toLowerCase().includes(q)
        const matchAuthor = p.authorName.toLowerCase().includes(q)
        const matchEmail = (p.authorEmail || "").toLowerCase().includes(q)
        const matchCollege = (p.authorCollege || "").toLowerCase().includes(q)
        if (!matchText && !matchAuthor && !matchEmail && !matchCollege) return false
      }
      return true
    })
  }, [anonPosts, searchQuery, selectedCategory])

  const setVerification = async (orgId: string, status: "verified" | "rejected") => {
    setBusyId(orgId)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: status })
      .eq("id", orgId)
    if (error) {
      setBusyId(null)
      showToast(error.message || "Could not update verification status", "error")
      return
    }
    // Tell the org their verification was approved (no DB trigger for this one).
    if (status === "verified" && currentUser) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: orgId,
        actor_id: currentUser.id,
        type: "verification_approved",
      })
      if (notifError) showToast("Verified, but the org was not notified", "error")
    }
    setBusyId(null)
    showToast(s["admin.orgUpdated"], "success")
    setOrgs((prev) => prev.filter((o) => o.id !== orgId))
  }

  const setReportStatus = async (reportId: string, status: "reviewed" | "dismissed") => {
    setBusyId(reportId)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from("reports").update({ status }).eq("id", reportId)
    setBusyId(null)
    if (error) {
      showToast(error.message || "Could not update the report", "error")
      return
    }
    showToast(status === "reviewed" ? "Report marked as reviewed" : "Report dismissed", "success")
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={ShieldX}
          title={s["admin.notAdmin.title"]}
          description={s["admin.notAdmin.description"]}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-8 text-body-sm text-slate-500 text-center">
        Loading admin dashboard…
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-h2 text-slate-900">
            <ShieldCheck className="text-primary-600" aria-hidden /> {s["admin.title"]}
          </h1>
          <p className="text-body-sm text-slate-500">{s["admin.subtitle"]}</p>
        </div>
        <Link href="/admin/social">
          <Button variant="secondary" size="sm" className="gap-1.5 shadow-sm">
            <Sparkles size={15} className="text-primary-600" /> AI Social Studio
          </Button>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-h4">{s["admin.verificationsHeading"]}</h2>
        {orgs.length === 0 ? (
          <Card className="p-4">
            <p className="text-body-sm text-slate-500">{s["admin.emptyVerifications"]}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {orgs.map((org) => {
              const displayName = org.name?.trim() || "Organization Applicant"
              return (
                <Card key={org.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                        <p className="truncate text-xs text-slate-400">
                          {org.email} · {org.organization_type ?? "Organization"}
                        </p>
                      </div>
                    </div>
                    <Badge tone="neutral">Pending</Badge>
                  </div>
                  {org.bio ? (
                    <p className="line-clamp-2 text-body-sm text-slate-600">{org.bio}</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      {s["admin.joined"]} {timeAgo(org.created_at)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyId === org.id}
                        onClick={() => setVerification(org.id, "rejected")}
                      >
                        <ShieldX size={14} aria-hidden /> {s["admin.reject"]}
                      </Button>
                      <Button
                        size="sm"
                        loading={busyId === org.id}
                        onClick={() => setVerification(org.id, "verified")}
                      >
                        <ShieldCheck size={14} aria-hidden /> {s["admin.approve"]}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h4">{s["admin.reportsHeading"]}</h2>
        {reports.length === 0 ? (
          <Card className="p-4">
            <p className="flex items-center gap-2 text-body-sm text-slate-500">
              <Inbox size={16} aria-hidden /> {s["admin.emptyReports"]}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} onResolve={setReportStatus} busy={busyId === report.id} />
            ))}
          </div>
        )}
      </section>

      {/* Anonymous Posts Intelligence Audit Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-h4 flex items-center gap-2">
              <EyeOff size={18} className="text-purple-600" />
              {s["admin.anonHeading"]}
            </h2>
            <p className="text-xs text-slate-500">{s["admin.anonSubtitle"]}</p>
          </div>
          <span className="rounded-pill bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
            {filteredAnonPosts.length} / {anonPosts.length} posts
          </span>
        </div>

        {/* Search & Filter Controls */}
        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, college, or text..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-card border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredAnonPosts.length === 0 ? (
          <Card className="p-4">
            <p className="flex items-center gap-2 text-body-sm text-slate-500">
              <Inbox size={16} aria-hidden /> {s["admin.emptyAnon"]}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAnonPosts.map((post) => (
              <Card key={post.id} className="flex flex-col gap-3 p-4 border-purple-200/80 bg-white shadow-xs">
                {/* Top row: Real Author Identity */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={post.authorName} src={post.authorAvatar} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/profile/${post.authorId}`}
                          className="text-sm font-bold text-slate-900 hover:underline truncate"
                        >
                          {post.authorName}
                        </Link>
                        {post.authorUsername ? (
                          <span className="text-xs text-slate-400">{post.authorUsername}</span>
                        ) : null}
                        <span className="rounded-pill bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                          Anonymous to Public
                        </span>
                        <span
                          className={cn(
                            "rounded-pill px-2 py-0.5 text-[10px] font-bold border",
                            post.isBanned
                              ? "bg-red-100 text-red-800 border-red-300"
                              : post.strikeCount > 0
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-slate-100 text-slate-600 border-slate-200",
                          )}
                        >
                          {post.isBanned ? "Suspended / Banned" : `${post.strikeCount}/10 Strikes`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {post.authorEmail ? `${post.authorEmail} · ` : ""}
                        {post.authorCollege || "College not set"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(post.createdAt)}</span>
                </div>

                {/* Post Text Preview */}
                <div className="rounded-card bg-purple-50/40 border border-purple-100 p-3 text-xs">
                  <span className="mb-1 inline-block text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Category: {post.category}
                  </span>
                  <p className="text-slate-800 line-clamp-3 leading-relaxed">
                    &ldquo;{post.text}&rdquo;
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/post/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {s["admin.viewPost"]} <ExternalLink size={12} aria-hidden />
                    </Link>
                    <Link
                      href={`/profile/${post.authorId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
                    >
                      View Student Profile <ExternalLink size={12} aria-hidden />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStudent({
                          id: post.authorId,
                          name: post.authorName,
                          email: post.authorEmail,
                          strikeCount: post.strikeCount,
                          isBanned: post.isBanned,
                          bannedUntil: post.bannedUntil,
                          banReason: post.banReason,
                        })
                      }}
                    >
                      <ShieldAlert size={13} className="text-amber-600" /> Moderate Student
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busyId === post.id}
                      onClick={() => deleteAnonPost(post.id)}
                    >
                      <Trash2 size={13} aria-hidden /> Delete Post
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Student Strikes & Moderation Action Modal */}
      {selectedStudent ? (
        <Modal
          open={Boolean(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
          title={
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldAlert size={18} className="text-red-600" />
              <span>Student Moderation & Strikes Control</span>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            {/* Student Overview */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-900">{selectedStudent.name}</p>
                <p className="text-slate-500">{selectedStudent.email || "No email"}</p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-xs font-bold border inline-block",
                    selectedStudent.isBanned
                      ? "bg-red-100 text-red-800 border-red-300"
                      : selectedStudent.strikeCount > 0
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300",
                  )}
                >
                  {selectedStudent.isBanned
                    ? selectedStudent.bannedUntil
                      ? `Suspended until ${new Date(selectedStudent.bannedUntil).toLocaleDateString()}`
                      : "Permanently Banned"
                    : `${selectedStudent.strikeCount}/10 Strikes`}
                </span>
              </div>
            </div>

            {/* Action Select */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Select Moderation Action</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStrikeAction("strike")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors",
                    strikeAction === "strike" ? "border-amber-500 bg-amber-50/70" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-600" /> Issue Official Strike (+1)
                  </span>
                  <span className="text-[11px] text-slate-500">Tiered suspension applies at 3, 6, and 10 strikes.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrikeAction("suspend_24h")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors",
                    strikeAction === "suspend_24h" ? "border-amber-500 bg-amber-50/70" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" /> Suspend for 24 Hours
                  </span>
                  <span className="text-[11px] text-slate-500">Temporarily freeze post creation for 24h.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrikeAction("suspend_7d")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors",
                    strikeAction === "suspend_7d" ? "border-red-500 bg-red-50/70" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock size={13} className="text-red-600" /> Suspend for 7 Days
                  </span>
                  <span className="text-[11px] text-slate-500">Repeated violation suspension for 1 week.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrikeAction("ban")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors",
                    strikeAction === "ban" ? "border-red-600 bg-red-50" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-bold text-red-900 flex items-center gap-1.5">
                    <Ban size={13} className="text-red-700" /> Permanently Ban Account
                  </span>
                  <span className="text-[11px] text-red-700">Permanent lock out from posting across Krantind.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrikeAction("pardon")}
                  className={cn(
                    "sm:col-span-2 p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors",
                    strikeAction === "pardon" ? "border-emerald-500 bg-emerald-50/70" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <RotateCcw size={13} className="text-emerald-600" /> Pardon / Reset Strikes (0)
                  </span>
                  <span className="text-[11px] text-slate-500">Clear all strikes and restore student account to full standing.</span>
                </button>
              </div>
            </div>

            {/* Violation Reason */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Moderator Note / Grounds</label>
              <Input
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value)}
                placeholder="e.g. Inappropriate content, cyber harassment, or repeated guidelines breach..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
                Cancel
              </Button>
              <Button
                variant={strikeAction === "ban" || strikeAction.startsWith("suspend") ? "danger" : "primary"}
                size="sm"
                loading={strikeBusy}
                onClick={handleApplyStrike}
              >
                Execute Action
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function ReportCard({
  report,
  busy,
  onResolve,
}: {
  report: ReportItem
  busy: boolean
  onResolve: (id: string, status: "reviewed" | "dismissed") => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 border-slate-200">
      {/* Top row: Reporter details & reason */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={report.reporterName} src={report.reporterAvatar} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {report.reporterName}
              </span>
              <span className="text-xs text-slate-400">{report.reporterUsername}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Filed report</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone="accent" className="capitalize">{report.reason}</Badge>
          <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
        </div>
      </div>

      {/* Reported post preview box with author name */}
      <div className="rounded-card bg-slate-50 border border-slate-200/80 p-3 text-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <Avatar name={report.postAuthorName ?? "Author"} src={report.postAuthorAvatar} size="sm" />
            <span className="font-semibold text-slate-800">{report.postAuthorName}</span>
            <span className="text-slate-400">{report.postAuthorUsername}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Reported Content</span>
        </div>
        <p className="text-slate-700 italic line-clamp-3 leading-relaxed">
          &ldquo;{report.postContent}&rdquo;
        </p>
      </div>

      {/* Reporter's reason details (if provided) */}
      {report.details ? (
        <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 rounded-card px-3 py-2">
          <span className="font-semibold text-amber-900">Reporter Comment: </span>
          {report.details}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="mt-1 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <Link
          href={`/post/${report.post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
        >
          {s["admin.viewPost"]} <ExternalLink size={12} aria-hidden />
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" loading={busy} onClick={() => onResolve(report.id, "dismissed")}>
            {s["admin.dismiss"]}
          </Button>
          <Button size="sm" loading={busy} onClick={() => onResolve(report.id, "reviewed")}>
            {s["admin.markReviewed"]}
          </Button>
        </div>
      </div>
    </Card>
  )
}