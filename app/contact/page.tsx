"use client"

import Link from "next/link"
import { ArrowLeft, Mail, Phone, ShieldCheck, MapPin, ExternalLink, HelpCircle } from "lucide-react"
import { Card, Button } from "@/components/ui"

export default function ContactPage() {
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
        <span className="text-xs font-semibold text-slate-400">Support & Contacts</span>
      </div>

      {/* Hero */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-900 border border-primary-200 mb-3">
          <Mail size={14} className="text-primary-700" />
          Get in Touch
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Contact & Grievance Channels
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
          Have an issue with the platform, need administrative help, or want to submit an official institutional query? Reach out through our official channels.
        </p>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Card */}
        <Card className="p-6 border border-slate-200 bg-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 mb-4">
            <Mail size={20} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Student & Platform Support</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            For account issues, bug reports, feature suggestions, or general platform inquiries.
          </p>
          <div className="mt-4">
            <a
              href="mailto:support@krantind.xyz"
              className="text-sm font-semibold text-primary-700 hover:underline"
            >
              support@krantind.xyz
            </a>
          </div>
        </Card>

        {/* Legal & Grievance Officer */}
        <Card className="p-6 border border-slate-200 bg-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 mb-4">
            <ShieldCheck size={20} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Grievance Officer (IT Rules 2021)</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Under Rule 3(2) of the IT (Intermediary Guidelines) Rules, 2021 for legal takedown notices and defamation complaints.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <a
              href="mailto:legal@krantind.xyz"
              className="text-sm font-semibold text-primary-700 hover:underline"
            >
              legal@krantind.xyz
            </a>
            <Link
              href="/grievance"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-700"
            >
              <span>Statutory Grievance Portal</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </Card>

        {/* Emergency National Helpline */}
        <Card className="p-6 border border-red-200 bg-red-50/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 mb-4">
            <Phone size={20} />
          </div>
          <h2 className="text-base font-bold text-slate-900">National Anti-Ragging Helpline</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Toll-free 24x7 emergency helpline monitored directly by UGC for college ragging or severe campus harassment.
          </p>
          <div className="mt-4">
            <a
              href="tel:18001805522"
              className="text-base font-bold text-red-700 hover:underline"
            >
              1800-180-5522 (Toll Free)
            </a>
          </div>
        </Card>

        {/* FAQ Quick Link */}
        <Card className="p-6 border border-slate-200 bg-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 mb-4">
            <HelpCircle size={20} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Quick answers regarding anonymous posting, verification badges, college privacy, and safe harbor.
          </p>
          <div className="mt-4">
            <Link href="/faq">
              <Button variant="outline" size="sm">
                Browse FAQs
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
