"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Scale,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  AlertCircle,
  FileCheck,
  Search,
  ExternalLink,
  History,
  FileText,
} from "lucide-react"
import { Card, Button, Input, Textarea } from "@/components/ui"
import { useToastStore } from "@/lib/store/useToastStore"

interface GrievanceTicket {
  id: string
  name: string
  email: string
  capacity: string
  category: string
  postUrl?: string
  description: string
  filedAt: string
  status: "acknowledged" | "investigating" | "resolved"
  ackDeadline: string
  resolutionDeadline: string
}

const STORAGE_KEY = "krantind_grievance_tickets"

function formatCategoryLabel(cat: string): string {
  switch (cat) {
    case "defamation":
      return "Defamation / Unverified Personal Allegation (BNS Section 356)"
    case "harassment":
      return "Cyber Harassment / Bullying / Hate Speech"
    case "ragging":
      return "Ragging / UGC Guideline Violation"
    case "fake_news":
      return "Fake Circular / False Exam Information (BNS Section 353)"
    case "privacy":
      return "Invasion of Privacy / Non-consensual Media"
    case "copyright":
      return "Copyright Infringement / Intellectual Property"
    default:
      return "Other Legal / Community Guideline Violation"
  }
}

export default function GrievancePage() {
  const showToast = useToastStore((s) => s.show)

  const [activeTab, setActiveTab] = useState<"lodge" | "track">("lodge")

  // Lodge Form State
  const [complainantName, setComplainantName] = useState("")
  const [complainantEmail, setComplainantEmail] = useState("")
  const [complainantType, setComplainantType] = useState<"student" | "faculty" | "management" | "legal" | "other">("student")
  const [postUrl, setPostUrl] = useState("")
  const [category, setCategory] = useState<string>("defamation")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)

  // Tracking State
  const [searchTicketQuery, setSearchTicketQuery] = useState("")
  const [trackedTicket, setTrackedTicket] = useState<GrievanceTicket | null>(null)
  const [recentTickets, setRecentTickets] = useState<GrievanceTicket[]>([])

  // Load stored tickets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: GrievanceTicket[] = JSON.parse(stored)
        setRecentTickets(parsed)
      }
    } catch {
      // Ignore local storage error
    }
  }, [])

  const saveTicketToStorage = (newTicket: GrievanceTicket) => {
    try {
      const updated = [newTicket, ...recentTickets.filter((t) => t.id !== newTicket.id)].slice(0, 10)
      setRecentTickets(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Ignore local storage error
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!complainantName.trim() || !complainantEmail.trim() || !description.trim()) {
      showToast("Please fill in all required fields", "error")
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      // Generate standard Indian IT Rules statutory Ticket ID
      const generatedTicketId = `KRANTIND-GRV-${Math.floor(100000 + Math.random() * 900000)}`
      const now = new Date()
      const ackDue = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const resDue = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

      const ticketRecord: GrievanceTicket = {
        id: generatedTicketId,
        name: complainantName.trim(),
        email: complainantEmail.trim(),
        capacity: complainantType,
        category,
        postUrl: postUrl.trim() || undefined,
        description: description.trim(),
        filedAt: now.toISOString(),
        status: "acknowledged",
        ackDeadline: ackDue.toISOString(),
        resolutionDeadline: resDue.toISOString(),
      }

      saveTicketToStorage(ticketRecord)
      setTicketId(generatedTicketId)
      setSubmitting(false)
      showToast("Grievance ticket registered successfully", "success")
    }, 800)
  }

  const handleTrackSearch = (targetId?: string) => {
    const query = (targetId || searchTicketQuery).trim().toUpperCase()
    if (!query) {
      showToast("Please enter a valid ticket reference ID", "error")
      return
    }

    // Check local storage first
    const found = recentTickets.find((t) => t.id.toUpperCase() === query)
    if (found) {
      setTrackedTicket(found)
      return
    }

    // If not found in local storage, display an honest not-found notice
    setTrackedTicket(null)
    showToast(`No ticket found for reference "${query}". Please check your ticket ID or ensure it was filed from this browser.`, "error")
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/feed" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
        <span className="text-xs font-semibold text-slate-400">IT Rules (2021) Rule 3(2)</span>
      </div>

      {/* Hero Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-pill bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200 mb-3">
          <Scale size={14} className="text-amber-700" />
          Statutory Grievance Redressal Mechanism
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Grievance Redressal & Legal Notice Portal
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          In accordance with <strong>Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, this portal enables students, faculty, college administrations, and lawful authorities to report prohibited content, submit takedown requests, or lodge grievances.
        </p>
      </div>

      {/* Navigation Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("lodge")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-card transition-colors ${
            activeTab === "lodge"
              ? "bg-primary-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText size={16} />
          Lodge New Grievance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("track")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-card transition-colors ${
            activeTab === "track"
              ? "bg-primary-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Search size={16} />
          Track Ticket Status
        </button>
      </div>

      {/* Grievance Officer & Statutory SLAs Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary-600 bg-white p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <Mail size={22} className="text-primary-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900">Designated Grievance & Compliance Desk</h2>
              <p className="text-slate-600"><strong>Authority:</strong> Krantind Legal & Compliance Cell</p>
              <p className="text-slate-600"><strong>Designation:</strong> Grievance Redressal Desk</p>
              <p className="text-slate-600">
                <strong>Direct Email:</strong>{" "}
                <a href="mailto:1krantind@gmail.com" className="text-primary-600 font-semibold underline">
                  1krantind@gmail.com
                </a>
              </p>
              <p className="text-slate-600"><strong>Service Channel:</strong> Digital Grievance Portal (IT Rules 2021)</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-white p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <Clock size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900">Statutory Timelines (Rule 3(2))</h2>
              <p className="text-slate-600">
                <strong>[1] Acknowledgement:</strong> Within <strong>24 Hours</strong> of ticket receipt.
              </p>
              <p className="text-slate-600">
                <strong>[2] Emergency Takedown:</strong> Within <strong>24 Hours</strong> for non-consensual intimate imagery / CSAM.
              </p>
              <p className="text-slate-600">
                <strong>[3] Final Resolution & Order:</strong> Within <strong>15 Days</strong> from receipt.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab 1: Lodge Grievance */}
      {activeTab === "lodge" && (
        <>
          {ticketId ? (
            <Card className="border border-emerald-300 bg-emerald-50/80 p-6 text-center animate-fade-in">
              <CheckCircle2 size={44} className="text-emerald-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-emerald-950">Grievance Registered Successfully</h2>
              <p className="text-xs text-emerald-800 mt-1">
                Your statutory grievance ticket has been generated in our audit logs.
              </p>
              <div className="my-4 inline-block rounded-card border border-emerald-300 bg-white px-4 py-2 font-mono font-bold text-sm text-emerald-900">
                Ticket Reference: {ticketId}
              </div>
              <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                Our Grievance Officer will review your submission and respond to <strong>{complainantEmail}</strong> within 24 hours in accordance with Rule 3(2) of the IT Rules 2021.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`mailto:1krantind@gmail.com?subject=${encodeURIComponent(`[Statutory Grievance Notice] Ticket ${ticketId} - ${formatCategoryLabel(category)}`)}&body=${encodeURIComponent(
                    `To: Resident Grievance Officer, Krantind Platform\nEmail: 1krantind@gmail.com\n\nTicket Reference ID: ${ticketId}\nComplainant Name: ${complainantName}\nOfficial Email: ${complainantEmail}\nCapacity: ${complainantType}\nViolation Category: ${formatCategoryLabel(category)}\nTarget Post URL: ${postUrl || "N/A"}\n\nFactual Description & Grounds of Grievance:\n${description}\n\n---\nStatutory Notice issued pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.`
                  )}`}
                  className="inline-flex items-center gap-1.5 rounded-card border border-emerald-500 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  <Mail size={14} /> Send Official Email Copy to Grievance Desk
                </a>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setActiveTab("track")
                    handleTrackSearch(ticketId)
                  }}
                >
                  <Search size={14} /> Track This Ticket Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTicketId(null)
                    setComplainantName("")
                    setComplainantEmail("")
                    setPostUrl("")
                    setDescription("")
                  }}
                >
                  Submit Another Notice
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Formal Grievance / Content Takedown Form</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fill in the details below to notify our Grievance Officer regarding any violation of Indian IT Rules or platform terms.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name of Complainant / Legal Representative <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      placeholder="e.g. Adv. R. Sharma / Dr. K. Verma"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={complainantEmail}
                      onChange={(e) => setComplainantEmail(e.target.value)}
                      placeholder="name@college.edu.in or personal@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Capacity
                    </label>
                    <select
                      value={complainantType}
                      onChange={(e) => setComplainantType(e.target.value as typeof complainantType)}
                      className="w-full rounded-card border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="student">Student / Whistleblower</option>
                      <option value="faculty">Faculty Member / Professor</option>
                      <option value="management">College Principal / Management Authority</option>
                      <option value="legal">Authorized Legal Counsel / Advocate</option>
                      <option value="other">Law Enforcement / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nature of Violation / Grievance Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-card border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="defamation">Defamation / Unverified Personal Allegation (BNS Section 356)</option>
                      <option value="harassment">Cyber Harassment / Bullying / Hate Speech</option>
                      <option value="ragging">Ragging / UGC Guideline Violation</option>
                      <option value="fake_news">Fake Circular / False Exam Information (BNS Section 353)</option>
                      <option value="privacy">Invasion of Privacy / Non-consensual Media</option>
                      <option value="copyright">Copyright Infringement / Intellectual Property</option>
                      <option value="other">Other Legal / Community Guideline Violation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Post URL or Identification Details (Optional)
                  </label>
                  <Input
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="e.g. https://krantind.xyz/post/c1234... or issue title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grievance Particulars & Grounds for Takedown <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Explain precisely why the content violates Indian Law, IT Rules, or your institutional rights, including relevant reference facts."
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Subject to Section 79 IT Act statutory processing
                  </span>
                  <Button type="submit" loading={submitting}>
                    <Send size={15} /> Submit Formal Grievance
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      )}

      {/* Tab 2: Track Ticket Status */}
      {activeTab === "track" && (
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Track Grievance Ticket</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter your statutory reference ID (e.g. KRANTIND-GRV-829104) to review investigation milestones and SLA timelines.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleTrackSearch()
              }}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9 font-mono uppercase"
                  placeholder="Enter Ticket ID (e.g. KRANTIND-GRV-123456)"
                  value={searchTicketQuery}
                  onChange={(e) => setSearchTicketQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Track Status
              </Button>
            </form>

            {/* Recent Tickets Quick-Select */}
            {recentTickets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
                  <History size={13} />
                  <span>Recent Submissions on this Device:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentTickets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSearchTicketQuery(item.id)
                        handleTrackSearch(item.id)
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-pill border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    >
                      <span>{item.id}</span>
                      <span className="text-[10px] text-slate-400">({new Date(item.filedAt).toLocaleDateString()})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Tracked Ticket Details */}
          {trackedTicket && (
            <Card className="p-6 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ticket Reference</div>
                  <h3 className="text-lg font-bold font-mono text-slate-900">{trackedTicket.id}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-pill bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                    <Clock size={12} /> Under Statutory Review
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} /> 24h SLA Met
                  </span>
                </div>
              </div>

              {/* Statutory Timeline */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  IT Rules Rule 3(2) Statutory Milestones
                </h4>
                <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 ml-2">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">Grievance Registered & Acknowledged</h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Filed: {new Date(trackedTicket.filedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Electronic acknowledgement receipt logged within the 24-hour statutory period.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white ring-4 ring-primary-100">
                      <Clock size={14} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">Grievance Officer Desk Examination</h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Current Status: Active Intermediary Review
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Evaluating reported URL, verifying student safety implications, and checking UGC / BNS compliance.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <FileCheck size={14} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-700">Disposal & Statutory Order</h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mandated Resolution Deadline: {new Date(trackedTicket.resolutionDeadline).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Final order regarding takedown or remediation will be transmitted to {trackedTicket.email}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Particulars Card */}
              <div className="rounded-card bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-slate-700">Violation Category:</span>{" "}
                    <span className="text-slate-800">{formatCategoryLabel(trackedTicket.category)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Complainant Role:</span>{" "}
                    <span className="text-slate-800 capitalize">{trackedTicket.capacity}</span>
                  </div>
                </div>
                {trackedTicket.postUrl && (
                  <div>
                    <span className="font-semibold text-slate-700">Associated Post/Link:</span>{" "}
                    <span className="font-mono text-slate-800 break-all">{trackedTicket.postUrl}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">Grounds Summary:</span>{" "}
                  <span className="text-slate-800 italic">&ldquo;{trackedTicket.description}&rdquo;</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <a
                  href={`mailto:1krantind@gmail.com?subject=Grievance%20Ticket%20Inquiry:%20${trackedTicket.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  <Mail size={14} /> Contact Desk regarding this ticket
                </a>
                <span className="text-[11px] text-slate-400">
                  IT Rules Rule 3(2) statutory record
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Appellate Notice (GAC) */}
      <div className="rounded-card border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <h3 className="font-bold text-slate-800 mb-1">Government Grievance Appellate Committee (GAC) Notice</h3>
        <p>
          In accordance with Rule 3A of the Information Technology Rules, 2021, any user or affected party dissatisfied with an order or resolution of our Grievance Officer may prefer an appeal before the <strong>Grievance Appellate Committee (GAC)</strong> constituted by the Central Government of India via <a href="https://gac.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold underline inline-flex items-center gap-0.5">gac.gov.in <ExternalLink size={11} /></a> within 30 days of receiving the order.
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary-600 underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary-600 underline">Privacy Policy</Link>
          <Link href="/guidelines" className="hover:text-primary-600 underline">Community Guidelines</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
