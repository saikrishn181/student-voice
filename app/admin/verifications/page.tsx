"use client"

// Admin moderation page: review organization verification requests and open
// post reports. Only users with profiles.is_admin = true can access it (the
// "Admins can update any profile" RLS policy backs the approve/reject actions).
// Gate yourself as admin in the SQL editor:
//   update public.profiles set is_admin = true where email = 'you@example.com';
import { useEffect, useState } from "react"
import { ShieldCheck, ShieldX, Lock, Inbox } from "lucide-react"
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

interface ReportRow {
  id: string
  reporter_id: string
  post_id: string
  reason: string
  details: string | null
  status: "open" | "reviewed" | "dismissed"
  created_at: string
}

export default function AdminVerificationsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("account_type", "organization")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]).then(([orgsRes, reportsRes]) => {
      if (orgsRes.error) showToast(orgsRes.error.message, "error")
      if (reportsRes.error) showToast(reportsRes.error.message, "error")
      setOrgs((orgsRes.data ?? []) as OrgRow[])
      setReports((reportsRes.data ?? []) as ReportRow[])
      setLoading(false)
    })
  }, [showToast])

  const setVerification = async (orgId: string, status: "verified" | "rejected") => {
    setBusyId(orgId)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: status })
      .eq("id", orgId)
    setBusyId(null)
    if (error) {
      showToast(error.message || "Could not update verification status", "error")
      return
    }
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
      <div className="mx-auto w-full max-w-2xl px-4 pt-8 text-body-sm text-slate-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4">
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
            {orgs.map((org) => (
              <Card key={org.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={org.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{org.name}</p>
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
            ))}
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
  report: ReportRow
  busy: boolean
  onResolve: (id: string, status: "reviewed" | "dismissed") => void
}) {
  const reporter = useUserById(report.reporter_id)
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={reporter?.name ?? "?"} src={reporter?.avatarUrl} size="sm" />
          <span className="text-sm font-semibold text-slate-800">
            {reporter?.name ?? s["post.unknownName"]}
          </span>
          <Badge tone="accent">{report.reason}</Badge>
        </div>
        <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
      </div>
      <p className="text-xs text-slate-400">post: {report.post_id}</p>
      {report.details ? <p className="text-body-sm text-slate-600">{report.details}</p> : null}
      <div className="mt-1 flex justify-end gap-2">
        <Button size="sm" variant="outline" loading={busy} onClick={() => onResolve(report.id, "dismissed")}>
          {s["admin.dismiss"]}
        </Button>
        <Button size="sm" loading={busy} onClick={() => onResolve(report.id, "reviewed")}>
          {s["admin.markReviewed"]}
        </Button>
      </div>
    </Card>
  )
}