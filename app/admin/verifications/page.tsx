"use client"

// Admin moderation page: review organization verification requests and open
// post reports. Only users with profiles.is_admin = true can access it (the
// "Admins can update any profile" RLS policy backs the approve/reject actions).
// Gate yourself as admin in the SQL editor:
//   update public.profiles set is_admin = true where email = 'you@example.com';
import { useEffect, useState } from "react"
import Link from "next/link"
import { ShieldCheck, ShieldX, Lock, Inbox, ExternalLink } from "lucide-react"
import { Button, Card, EmptyState, Badge, Avatar } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { timeAgo } from "@/lib/utils"

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
  postAuthorName?: string
  postAuthorUsername?: string
  postAuthorAvatar?: string
}

export default function AdminVerificationsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
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
          setLoading(false)
          return
        }

        const rawReports = reportsRes.data ?? []
        if (rawReports.length === 0) {
          setReports([])
          setLoading(false)
          return
        }

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
          ? await supabase.from("posts").select("id, content, author_id").in("id", postIds)
          : { data: [] }
        const postsMap = new Map((postsData ?? []).map((p) => [p.id, p]))

        // Fetch post authors
        const postAuthorIds = Array.from(new Set((postsData ?? []).map((p) => p.author_id).filter(Boolean)))
        const { data: authorsData } = postAuthorIds.length > 0
          ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", postAuthorIds)
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
            postContent: post?.content || "Post unavailable or removed",
            postAuthorName,
            postAuthorUsername,
            postAuthorAvatar: author?.avatar_url,
          }
        })

        setReports(hydratedReports)
      } catch (err) {
        console.error("Admin data load error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [showToast])

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

  if (currentUser && !currentUser.isAdmin) {
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
      <div>
        <h1 className="flex items-center gap-2 text-h2 text-slate-900">
          <ShieldCheck className="text-primary-600" aria-hidden /> {s["admin.title"]}
        </h1>
        <p className="text-body-sm text-slate-500">{s["admin.subtitle"]}</p>
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