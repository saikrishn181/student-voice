import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Scale } from "lucide-react"
import { Card } from "@/components/ui"

export const metadata: Metadata = {
  title: "Privacy Policy — Krantind",
  description:
    "Privacy Policy for Krantind in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and Information Technology Act, 2000.",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/feed" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
        <span className="text-xs font-semibold text-slate-400">Last Updated: August 2026</span>
      </div>

      {/* Hero */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 mb-3">
          <ShieldCheck size={14} />
          Digital Personal Data Protection Act, 2023 (DPDP Act) Compliant
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Privacy Policy & Data Protection Notice
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Krantind (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to safeguarding the privacy and personal data of our users. This Privacy Policy describes how we collect, process, store, and protect your data when you use <code className="text-primary-700 font-mono">krantind.xyz</code> in accordance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>.
        </p>
      </div>

      {/* Quick Summary Card */}
      <Card className="border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Lock size={16} className="text-primary-600" />
          Key Privacy Principles at Krantind
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="rounded-card bg-white p-3 border border-slate-200">
            <p className="font-bold text-slate-900 mb-1">🎭 Whistleblower Protection</p>
            <p>Anonymous posts mask your identity from college admins and peers completely.</p>
          </div>
          <div className="rounded-card bg-white p-3 border border-slate-200">
            <p className="font-bold text-slate-900 mb-1">🚫 No Third-Party Selling</p>
            <p>We never sell, rent, or trade your student data to advertisers or commercial brokers.</p>
          </div>
          <div className="rounded-card bg-white p-3 border border-slate-200">
            <p className="font-bold text-slate-900 mb-1">🗑️ Right to Erasure</p>
            <p>You can request account and post deletion at any time in your Settings.</p>
          </div>
        </div>
      </Card>

      {/* Main Privacy Body */}
      <div className="flex flex-col gap-6 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
          <p>We collect only the minimum data necessary to operate a secure, authenticated campus forum:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Account Data:</strong> Email address, name, optional profile bio, avatar image, and verified college/university affiliation.</li>
            <li><strong>User Content:</strong> Posts, text grievances, poll votes, comments, images/media, and event RSVP statuses submitted by you.</li>
            <li><strong>Technical & Log Data:</strong> Browser user-agent, IP address, device type, and login timestamps retained for security, session management, and anti-spam verification.</li>
            <li><strong>Verification Credentials:</strong> Student ID card uploads (for verified organization / student badge applications), processed strictly for identity verification.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">2. How We Use Your Data</h2>
          <p>We process your personal data for the following legitimate purposes (Section 4, DPDP Act 2023):</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li>To provide, maintain, and personalize your campus grievance and student voice feed.</li>
            <li>To enforce community safety, detect automated bots, prevent hate speech, and operate our 10-strike moderation policy.</li>
            <li>To notify you regarding support signatures, comments, resolutions, and direct chat messages.</li>
            <li>To comply with statutory compliance mandates under the Information Technology Act, 2000.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">3. Anonymous Whistleblower Posts & Anonymity Architecture</h2>
          <p>
            When you create an Anonymous Post on Krantind:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Public Display:</strong> The post appears publicly with masked pseudonymity (e.g. <em>&ldquo;Anonymous Student • [College Name]&rdquo;</em>). Your profile photo, username, and profile hyperlink are omitted from the UI.</li>
            <li><strong>Internal Audit Trail:</strong> The post is linked internally to your authentication record in our encrypted database. This prevents platform abuse and ensures that students cannot use anonymity to commit criminal harassment or defamation.</li>
            <li><strong>College Admin Immunity:</strong> College principals, deans, and management cannot access your identity through Krantind.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">4. Disclosures Required by Indian Law</h2>
          <p>
            We do not share your personal data with third parties except under the following strict statutory exceptions:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Court Orders & Law Enforcement:</strong> Pursuant to a formal, written judicial order or summons issued by a competent Indian Court of Law or authorized Indian Law Enforcement Agency under Section 69/69A of the IT Act.</li>
            <li><strong>Emergency Safety Threats:</strong> To prevent imminent violence, self-harm, or child sexual abuse material (CSAM).</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">5. Data Retention & Erasure Rights (DPDP Act, 2023)</h2>
          <p>
            Under Sections 11 to 13 of the Digital Personal Data Protection Act, 2023, you have the following enforceable rights:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Right to Access & Review:</strong> View all information associated with your account in your Profile & Settings.</li>
            <li><strong>Right to Correction:</strong> Edit or update your profile information and college affiliation at any time.</li>
            <li><strong>Right to Erasure (Deletion):</strong> You may delete individual posts or request permanent account termination. In accordance with Rule 3(1)(h) of the IT Rules 2021, basic registration logs may be retained for 180 days solely for regulatory compliance before final purge.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">6. Data Security & Storage</h2>
          <p>
            All user authentication, passwords, and sessions are secured using industry-standard bcrypt hashing, row-level security (RLS) policies, and TLS 1.3 encryption in transit. Our database infrastructure is hosted in enterprise-grade cloud facilities with automated backup protocols.
          </p>
        </section>

        {/* Section 7 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">7. Data Protection & Grievance Officer Contact</h2>
          <p>
            If you have any questions, concerns, or grievances regarding the processing of your personal data or wish to exercise your data principal rights under the DPDP Act 2023, please contact our Data Protection Grievance Officer:
          </p>
          <div className="rounded-card border border-slate-200 bg-slate-50 p-4 text-xs space-y-1">
            <p><strong>Grievance & Data Protection Cell:</strong> Krantind Legal & Compliance Desk</p>
            <p><strong>Email:</strong> <a href="mailto:1krantind@gmail.com" className="text-primary-600 font-semibold underline">1krantind@gmail.com</a></p>
            <p><strong>Subject Line:</strong> &ldquo;DPDP Act Data Request / Grievance&rdquo;</p>
            <p><strong>Resolution SLA:</strong> Acknowledged within 24 hours, resolved within 15 business days.</p>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary-600 underline">Terms of Service</Link>
          <Link href="/grievance" className="hover:text-primary-600 underline">Grievance Redressal</Link>
          <Link href="/guidelines" className="hover:text-primary-600 underline">Community Guidelines</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
