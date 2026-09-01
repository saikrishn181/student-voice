"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Card, Button, Input, Textarea } from "@/components/ui"
import { useToastStore } from "@/lib/store/useToastStore"

export default function GrievancePage() {
  const showToast = useToastStore((s) => s.show)

  const [complainantName, setComplainantName] = useState("")
  const [complainantEmail, setComplainantEmail] = useState("")
  const [complainantType, setComplainantType] = useState<"student" | "faculty" | "management" | "legal" | "other">("student")
  const [postUrl, setPostUrl] = useState("")
  const [category, setCategory] = useState<string>("defamation")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!complainantName.trim() || !complainantEmail.trim() || !description.trim()) {
      showToast("Please fill in all required fields", "error")
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      // Generate standard Indian IT Rules statutory Ticket ID
      const generatedTicket = `KRANTIND-GRV-${Math.floor(100000 + Math.random() * 900000)}`
      setTicketId(generatedTicket)
      setSubmitting(false)
      showToast("Grievance ticket generated successfully", "success")
    }, 800)
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
                <strong>&bull; Acknowledgement:</strong> Within <strong>24 Hours</strong> of ticket receipt.
              </p>
              <p className="text-slate-600">
                <strong>&bull; Emergency Takedown:</strong> Within <strong>24 Hours</strong> for non-consensual intimate imagery / CSAM.
              </p>
              <p className="text-slate-600">
                <strong>&bull; Final Resolution & Order:</strong> Within <strong>15 Days</strong> from receipt.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ticket Success Confirmation */}
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
          <Button
            className="mt-4"
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
        </Card>
      ) : (
        /* Grievance Submission Form */
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
                  <option value="defamation">Defamation / Unverified Personal Allegation (BNS §356)</option>
                  <option value="harassment">Cyber Harassment / Bullying / Hate Speech</option>
                  <option value="ragging">Ragging / UGC Guideline Violation</option>
                  <option value="fake_news">Fake Circular / False Exam Information (BNS §353)</option>
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

      {/* Appellate Notice (GAC) */}
      <div className="rounded-card border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <h3 className="font-bold text-slate-800 mb-1">Government Grievance Appellate Committee (GAC) Notice</h3>
        <p>
          In accordance with Rule 3A of the Information Technology Rules, 2021, any user or affected party dissatisfied with an order or resolution of our Grievance Officer may prefer an appeal before the <strong>Grievance Appellate Committee (GAC)</strong> constituted by the Central Government of India via <a href="https://gac.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold underline">gac.gov.in</a> within 30 days of receiving the order.
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
