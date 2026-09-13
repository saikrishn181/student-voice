"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, HelpCircle, ShieldCheck, UserCheck, EyeOff, Scale, MessageSquare } from "lucide-react"
import { Card } from "@/components/ui"
import { cn } from "@/lib/utils"

interface FaqItem {
  q: string
  a: string
  category: string
}

const FAQS: FaqItem[] = [
  {
    category: "Anonymity & Privacy",
    q: "Is anonymous posting really anonymous?",
    a: "Yes. When you post anonymously, your real user ID, name, avatar, and profile link are completely scrubbed before the post is displayed to anyone. Other users, college staff, and followers cannot see your identity.",
  },
  {
    category: "Anonymity & Privacy",
    q: "Can my college administration trace my anonymous post back to me?",
    a: "No. Krantind is an independent platform not controlled by your university. College administrations do not have access to backend databases or internal audit logs.",
  },
  {
    category: "Posting & Content",
    q: "What is the difference between institutional criticism and defamation?",
    a: "Constructive feedback on college facilities (mess quality, hostel hygiene, fee structures, schedule delays) is legally protected under Article 19(1)(a). Naming individual professors or students with unverified personal allegations constitutes defamation under Section 356 of Bharatiya Nyaya Sanhita (BNS) and is strictly disallowed.",
  },
  {
    category: "Posting & Content",
    q: "How do posts get resolved on Krantind?",
    a: "When a post gains student supports, verified student unions or administrations notice the issue. Once actions are taken (e.g. geysers repaired, fee refund issued), the author or admin marks the grievance as 'Resolved', turning it into a campus victory on the Impact Leaderboard.",
  },
  {
    category: "Verification & Trust",
    q: "How do organizations and student clubs get verified?",
    a: "Student unions, college clubs, and NGOs can submit verification proof (official letterhead, university email, or charter documents) in their profile settings. Our admin team reviews every application manually.",
  },
  {
    category: "Legal & Compliance",
    q: "How do I report illegal content or seek a takedown?",
    a: "You can tap 'Report' directly on any post or file a formal legal notice through our statutory Grievance Redressal Portal under Rule 3(2) of the IT Rules 2021. Our designated Grievance Officer reviews reports within statutory timelines.",
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href="/feed"
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
        <span className="text-xs font-semibold text-slate-400">Help Center</span>
      </div>

      {/* Hero */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 border border-blue-200 mb-3">
          <HelpCircle size={14} className="text-blue-700" />
          Common Inquiries
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
          Everything you need to know about student rights, whistleblower safety, verification badges, and how Krantind protects your voice.
        </p>
      </div>

      {/* FAQs List */}
      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <Card
              key={faq.q}
              className={cn(
                "overflow-hidden border transition-colors",
                isOpen ? "border-primary-300 bg-white" : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left font-medium text-slate-900"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
                    {faq.category}
                  </span>
                  <span className="text-sm font-semibold">{faq.q}</span>
                </div>
                <ChevronDown
                  size={18}
                  className={cn("shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-primary-600")}
                />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-2 text-xs text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border border-slate-200 bg-slate-50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Still have questions?</h3>
          <p className="text-xs text-slate-600 mt-0.5">Reach out to our student support or legal team directly.</p>
        </div>
        <Link href="/contact">
          <button className="rounded-lg bg-primary-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-800 transition-colors">
            Contact Support
          </button>
        </Link>
      </Card>
    </div>
  )
}
