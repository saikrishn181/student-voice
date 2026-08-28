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
  Mail,
  Shield,
  CheckCircle2,
} from "lucide-react"
import { Card } from "@/components/ui"
import { cn } from "@/lib/utils"

export default function LegalTrustPage() {
  const [openFaq, setOpenFaq] = useState<string | null>("legal")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-2">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-800 transition-colors hover:text-primary-700"
        >
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </Link>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 shadow-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
          Safe Harbor Active &bull; IT Act §79
        </span>
      </div>

      {/* High-Contrast Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary-800">
          <Scale size={18} className="text-amber-600" />
          <span>Constitution of India &bull; Digital Due Diligence</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl font-extrabold text-slate-950 sm:text-3xl">
          Legal, Rules & Platform Trust Hub
        </h1>
        <p className="mt-3 text-base text-slate-800 font-medium max-w-2xl leading-relaxed">
          Learn how Krantind operates under Section 79 of the Information Technology Act (2000), how student whistleblowers are constitutionally protected from retaliation under Article 19(1)(a), and our transparent statutory grievance redressal mechanism.
        </p>

        {/* 3 Key Protections Highlights */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t-2 border-slate-200 pt-5">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 mt-0.5">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-950">Article 19(1)(a)</p>
              <p className="text-xs text-slate-700 font-medium">Freedom of speech on campus welfare</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-900 mt-0.5">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-950">Section 79 IT Act</p>
              <p className="text-xs text-slate-700 font-medium">Intermediary safe harbor protection</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 mt-0.5">
              <Scale size={16} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-950">IT Rules 2021</p>
              <p className="text-xs text-slate-700 font-medium">24h SLA Grievance Officer redressal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Legal Documents Navigation Grid */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-3">
          Statutory Legal Policies & Codes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/terms"
            className="group flex items-start gap-3.5 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-primary-600 hover:shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800 group-hover:bg-primary-700 group-hover:text-white transition-colors">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950 group-hover:text-primary-800 transition-colors">
                Terms of Service (User Agreement)
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                Section 79 Safe Harbor declaration, user warranties, and prohibited content rules under Rule 3(1)(b) IT Rules.
              </p>
            </div>
          </Link>

          <Link
            href="/privacy"
            className="group flex items-start gap-3.5 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-600 hover:shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950 group-hover:text-emerald-800 transition-colors">
                Privacy Policy (DPDP Act, 2023)
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                Notice & consent terms, data principal rights, right to erasure, and anonymity architecture.
              </p>
            </div>
          </Link>

          <Link
            href="/grievance"
            className="group flex items-start gap-3.5 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-amber-600 hover:shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-700 group-hover:text-white transition-colors">
              <Scale size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950 group-hover:text-amber-800 transition-colors">
                Grievance Redressal Portal
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                Resident Grievance Officer details, 24-hr acknowledgement SLA, and formal takedown portal for college authorities.
              </p>
            </div>
          </Link>

          <Link
            href="/guidelines"
            className="group flex items-start gap-3.5 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-purple-600 hover:shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800 group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950 group-hover:text-purple-800 transition-colors">
                Campus Guidelines & Anti-Defamation Code
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                Protected institutional criticism vs personal defamation, anti-ragging UGC rules, and strike tiers.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Comprehensive FAQs Accordion */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-3">
          Frequently Asked Questions & Rights
        </h2>

        <div className="flex flex-col gap-3">
          {/* FAQ 1 */}
          <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "legal" ? null : "legal")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-extrabold text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🏛️</span> Is Krantind 100% legal under the Constitution of India?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-600 transition-transform shrink-0", openFaq === "legal" && "rotate-180")}
              />
            </button>
            {openFaq === "legal" ? (
              <div className="border-t border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-800 leading-relaxed space-y-2 font-medium">
                <p>
                  <strong className="text-slate-950 font-extrabold">Yes, 100% legal.</strong> Under <strong className="text-slate-950 font-extrabold">Article 19(1)(a) of the Constitution of India</strong>, all students possess the fundamental right to freedom of speech and expression. Discussing educational infrastructure, mess food hygiene, hostel conditions, fee transparency, and campus safety is constitutionally protected democratic discourse.
                </p>
                <p>
                  In landmark Supreme Court of India precedents (including <em>Shreya Singhal v. Union of India, 2015</em>), online discussion forums and citizen grievance portals were affirmed as protected speech.
                </p>
                <p>
                  Under <strong className="text-slate-950 font-extrabold">Section 79 of the Information Technology Act, 2000</strong>, Krantind operates as a certified Intermediary. As long as our statutory due diligence (Grievance Officer, Terms of Service, Privacy Policy, and 24h/15d takedown mechanism) is maintained, the platform and its operators have absolute immunity from third-party user posts.
                </p>
              </div>
            ) : null}
          </div>

          {/* FAQ 2 */}
          <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "whistleblower" ? null : "whistleblower")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-extrabold text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🎭</span> How does Anonymous Whistleblower mode protect me from college retaliation?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-600 transition-transform shrink-0", openFaq === "whistleblower" && "rotate-180")}
              />
            </button>
            {openFaq === "whistleblower" ? (
              <div className="border-t border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-800 leading-relaxed space-y-2 font-medium">
                <p>
                  Many Indian college administrations use attendance marks, internal exam scores, or disciplinary rustication threats to silence students.
                </p>
                <p>
                  When you select <strong className="text-slate-950 font-extrabold">&ldquo;🎭 Post Anonymously&rdquo;</strong>, Krantind strips your name, avatar, username, and profile link from the public feed, search index, and notifications. It displays simply as <em>&ldquo;Anonymous Student • [College Name]&rdquo;</em>.
                </p>
                <p>
                  College management cannot demand your identity from Krantind. User records are only disclosed when served with a formal, written subpoena issued by an Indian High Court or authorized law enforcement agency under Section 69 of the IT Act.
                </p>
              </div>
            ) : null}
          </div>

          {/* FAQ 3 */}
          <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "defamation" ? null : "defamation")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-extrabold text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>⚖️</span> What if my college management threatens a Defamation Legal Notice?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-600 transition-transform shrink-0", openFaq === "defamation" && "rotate-180")}
              />
            </button>
            {openFaq === "defamation" ? (
              <div className="border-t border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-800 leading-relaxed space-y-2 font-medium">
                <p>
                  Private college managements often issue Cease and Desist letters to intimidate students. Under Indian law:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-800">
                  <li><strong className="text-slate-950 font-extrabold">Institutional Grievances are NOT Defamation:</strong> Highlighting real problems like cold water in hostels, broken lab equipment, spoiled mess food, or unannounced fee hikes constitutes genuine student consumer feedback and public welfare discourse under Exception 1 to Section 356 BNS / Section 499 IPC.</li>
                  <li><strong className="text-slate-950 font-extrabold">Golden Rule:</strong> Always frame your grievances around <em>facilities, policies, processes, and safety</em> rather than posting personal slurs against specific named professors.</li>
                  <li><strong className="text-slate-950 font-extrabold">Statutory Redressal:</strong> If a college claims a post contains unlawful defamation, they must submit a formal takedown notice to our <Link href="/grievance" className="text-primary-700 underline font-extrabold">Grievance Portal</Link> for statutory review under Rule 3(2) of the IT Rules 2021.</li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* FAQ 4 */}
          <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === "moderation" ? null : "moderation")}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-extrabold text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🛡️</span> How does Krantind keep the platform clean and safe ($0 Cost)?
              </span>
              <ChevronDown
                size={18}
                className={cn("text-slate-600 transition-transform shrink-0", openFaq === "moderation" && "rotate-180")}
              />
            </button>
            {openFaq === "moderation" ? (
              <div className="border-t border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-800 leading-relaxed space-y-2 font-medium">
                <p>
                  Krantind uses an automated, multi-tiered zero-cost moderation engine:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-800">
                  <li><strong className="text-slate-950 font-extrabold">In-Browser Pixel Scanner:</strong> Analyzes image chrominance & luminance before upload to detect and block explicit content.</li>
                  <li><strong className="text-slate-950 font-extrabold">Multi-Language Abusive Slang Filter:</strong> Scans Hindi, English, Hinglish, Telugu, Tamil, and Marathi profanity in real-time.</li>
                  <li><strong className="text-slate-950 font-extrabold">Community Auto-Mod:</strong> 3+ reports trigger auto-blur; 5+ reports trigger instant auto-removal.</li>
                  <li><strong className="text-slate-950 font-extrabold">10-Strike Ban Policy:</strong> Progressive penalties for repeat offenders (Warning &rarr; 24h &rarr; 7d &rarr; Permanent Ban).</li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grievance Officer Contact Box */}
      <Card className="border-l-4 border-l-primary-700 bg-slate-50 p-5 shadow-xs border border-slate-200">
        <div className="flex items-start gap-3">
          <Mail size={24} className="text-primary-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="text-sm font-extrabold text-slate-950">Resident Grievance & Compliance Officer</h3>
            <p className="text-slate-800 font-medium">
              For law enforcement notices, formal legal communications, or statutory grievance escalations:
            </p>
            <p className="text-slate-950 font-bold pt-1">
              N. S. Rao &bull; Email: <a href="mailto:grievance@krantind.xyz" className="text-primary-700 underline font-extrabold">grievance@krantind.xyz</a>
            </p>
            <p className="text-slate-600 text-xs font-semibold">
              Response SLA: Acknowledged within 24 hours &bull; Redressal within 15 days (IT Rules 2021 Rule 3(2))
            </p>
          </div>
        </div>
      </Card>

      {/* Footer Navigation */}
      <div className="border-t border-slate-300 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700 font-medium">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary-800 underline font-semibold">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary-800 underline font-semibold">Privacy Policy</Link>
          <Link href="/grievance" className="hover:text-primary-800 underline font-semibold">Grievance Redressal</Link>
          <Link href="/guidelines" className="hover:text-primary-800 underline font-semibold">Campus Rules</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
