"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Scale,
  ShieldCheck,
  ChevronDown,
  BookOpen,
  FileText,
  AlertTriangle,
  Mail,
  Shield,
} from "lucide-react"
import { Card, Button } from "@/components/ui"
import { cn } from "@/lib/utils"

export default function LegalTrustPage() {
  const [openFaq, setOpenFaq] = useState<string | null>("legal")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/settings" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft size={16} />
          Back to Settings
        </Link>
        <span className="rounded-pill bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          Safe Harbor Active &bull; IT Act §79
        </span>
      </div>

      {/* Hero Banner */}
      <div className="rounded-card border border-primary-200 bg-linear-to-r from-primary-950 via-primary-900 to-slate-900 p-6 text-white shadow-lift sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
          <Scale size={16} className="text-amber-400" />
          <span>Constitution of India &bull; Digital Due Diligence</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold font-serif sm:text-3xl text-white">
          Legal, Rules & Platform Trust Hub
        </h1>
        <p className="mt-2 text-sm text-primary-100/90 max-w-2xl leading-relaxed">
          Learn how Krantind operates under Section 79 of the Information Technology Act (2000), how student whistleblowers are constitutionally protected from retaliation, and our transparent grievance redressal mechanism.
        </p>
      </div>

      {/* Core Legal Documents Navigation Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Statutory Legal Policies & Codes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/terms"
            className="group flex items-start gap-3.5 rounded-card border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-primary-400 hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary-50 text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-colors">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                Terms of Service (User Agreement)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Section 79 Safe Harbor declaration, user warranties, and prohibited content rules under Rule 3(1)(b) IT Rules.
              </p>
            </div>
          </Link>

          <Link
            href="/privacy"
            className="group flex items-start gap-3.5 rounded-card border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-400 hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Privacy Policy (DPDP Act, 2023)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Notice & consent terms, data principal rights, right to erasure, and anonymity architecture.
              </p>
            </div>
          </Link>

          <Link
            href="/grievance"
            className="group flex items-start gap-3.5 rounded-card border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-amber-400 hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Grievance Redressal & Legal Notice Portal
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Resident Grievance Officer details, 24-hr acknowledgement SLA, and formal takedown form for authorities.
              </p>
            </div>
          </Link>

          <Link
            href="/guidelines"
            className="group flex items-start gap-3.5 rounded-card border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-purple-400 hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                Campus Guidelines & Anti-Defamation Code
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Protected institutional criticism vs personal defamation, anti-ragging UGC rules, and strike tiers.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Comprehensive FAQs Accordion */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Frequently Asked Questions & Rights
        </h2>

        <div className="flex flex-col gap-3">
          {/* FAQ 1 */}
          <div className="rounded-card border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "legal" ? null : "legal")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🏛️</span> Is Krantind 100% legal under the Constitution of India?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-400 transition-transform shrink-0", openFaq === "legal" && "rotate-180")}
              />
            </button>
            {openFaq === "legal" ? (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  <strong>Yes, 100% legal.</strong> Under <strong>Article 19(1)(a) of the Constitution of India</strong>, all students possess the fundamental right to freedom of speech and expression. Discussing educational infrastructure, mess food hygiene, hostel conditions, fee transparency, and campus safety is constitutionally protected democratic discourse.
                </p>
                <p>
                  In landmark Supreme Court of India precedents (including <em>Shreya Singhal v. Union of India, 2015</em>), online discussion forums and citizen grievance portals were affirmed as protected speech.
                </p>
                <p>
                  Under <strong>Section 79 of the Information Technology Act, 2000</strong>, Krantind operates as a certified Intermediary. As long as our statutory due diligence (Grievance Officer, Terms of Service, Privacy Policy, and 24h/15d takedown mechanism) is maintained, the platform and its operators have absolute immunity from third-party user posts.
                </p>
              </div>
            ) : null}
          </div>

          {/* FAQ 2 */}
          <div className="rounded-card border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "whistleblower" ? null : "whistleblower")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🎭</span> How does Anonymous Whistleblower mode protect me from college retaliation?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-400 transition-transform shrink-0", openFaq === "whistleblower" && "rotate-180")}
              />
            </button>
            {openFaq === "whistleblower" ? (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  Many Indian college administrations use attendance marks, internal exam scores, or disciplinary rustication threats to silence students.
                </p>
                <p>
                  When you select <strong>&ldquo;🎭 Post Anonymously&rdquo;</strong>, Krantind strips your name, avatar, username, and profile link from the public feed, search index, and notifications. It displays simply as <em>&ldquo;Anonymous Student • [College Name]&rdquo;</em>.
                </p>
                <p>
                  College management cannot demand your identity from Krantind. User records are only disclosed when served with a formal, written subpoena issued by an Indian High Court or authorized law enforcement agency under Section 69 of the IT Act.
                </p>
              </div>
            ) : null}
          </div>

          {/* FAQ 3 */}
          <div className="rounded-card border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "defamation" ? null : "defamation")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>⚖️</span> What if my college management threatens a Defamation Legal Notice?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-400 transition-transform shrink-0", openFaq === "defamation" && "rotate-180")}
              />
            </button>
            {openFaq === "defamation" ? (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  Private college managements often issue Cease and Desist letters to intimidate students. Under Indian law:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>Institutional Grievances are NOT Defamation:</strong> Highlighting real problems like cold water in hostels, broken lab equipment, spoiled mess food, or unannounced fee hikes constitutes genuine student consumer feedback and public welfare discourse under Exception 1 to Section 356 BNS / Section 499 IPC.</li>
                  <li><strong>Golden Rule:</strong> Always frame your grievances around <em>facilities, policies, processes, and safety</em> rather than posting personal slurs against specific named professors.</li>
                  <li><strong>Statutory Redressal:</strong> If a college claims a post contains unlawful defamation, they must submit a formal takedown notice to our <Link href="/grievance" className="text-primary-600 underline font-semibold">Grievance Portal</Link> for statutory review under Rule 3(2) of the IT Rules 2021.</li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* FAQ 4 */}
          <div className="rounded-card border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "moderation" ? null : "moderation")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🛡️</span> How does Krantind keep the platform clean and safe ($0 Cost)?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-400 transition-transform shrink-0", openFaq === "moderation" && "rotate-180")}
              />
            </button>
            {openFaq === "moderation" ? (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  Krantind uses an automated, multi-tiered zero-cost moderation engine:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>In-Browser Pixel Scanner:</strong> Analyzes image chrominance & luminance before upload to detect and block explicit content.</li>
                  <li><strong>Multi-Language Abusive Slang Filter:</strong> Scans Hindi, English, Hinglish, Telugu, Tamil, and Marathi profanity in real-time.</li>
                  <li><strong>Community Auto-Mod:</strong> 3+ reports trigger auto-blur; 5+ reports trigger instant auto-removal.</li>
                  <li><strong>10-Strike Ban Policy:</strong> Progressive penalties for repeat offenders (Warning &rarr; 24h &rarr; 7d &rarr; Permanent Ban).</li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grievance Officer Contact Box */}
      <Card className="border-l-4 border-l-primary-600 bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <Mail size={22} className="text-primary-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Resident Grievance & Compliance Officer</h3>
            <p className="text-slate-600">
              For law enforcement notices, formal legal communications, or statutory grievance escalations:
            </p>
            <p className="text-slate-800 font-semibold pt-1">
              N. S. Rao &bull; Email: <a href="mailto:grievance@krantind.xyz" className="text-primary-600 underline">grievance@krantind.xyz</a>
            </p>
            <p className="text-slate-500 text-[11px]">
              Response SLA: Acknowledged within 24 hours &bull; Redressal within 15 days (IT Rules 2021 Rule 3(2))
            </p>
          </div>
        </div>
      </Card>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary-600 underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary-600 underline">Privacy Policy</Link>
          <Link href="/grievance" className="hover:text-primary-600 underline">Grievance Redressal</Link>
          <Link href="/guidelines" className="hover:text-primary-600 underline">Campus Rules</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
