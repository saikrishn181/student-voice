import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Shield, Scale, AlertTriangle, FileText, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui"
import { Logo } from "@/components/feature"

export const metadata: Metadata = {
  title: "Terms of Service — Krantind",
  description:
    "Terms of Service and Intermediary Due Diligence rules for Krantind under the Information Technology Act, 2000 and IT Rules, 2021.",
}

export default function TermsPage() {
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
        <div className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 border border-primary-200 mb-3">
          <Scale size={14} />
          Statutory Intermediary Terms (Rule 3(1)(a) IT Rules, 2021)
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Terms of Service & User Agreement
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Welcome to Krantind (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing, browsing, registering, or submitting content on <code className="text-primary-700 font-mono">krantind.xyz</code>, you agree to be bound by these Terms of Service. If you do not agree, please discontinue using the Platform immediately.
        </p>
      </div>

      {/* Intermediary Declaration Notice */}
      <Card className="border-l-4 border-l-primary-600 bg-primary-50/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Shield size={22} className="text-primary-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-primary-950">
              1. Intermediary Status & Safe Harbor under Section 79 of the IT Act, 2000
            </h2>
            <p className="mt-1 text-xs text-primary-900 leading-relaxed">
              Krantind is an <strong>Intermediary</strong> as defined under Section 2(1)(w) of the Information Technology Act, 2000. In accordance with Section 79 of the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, Krantind does not initiate the transmission, select the receiver of the transmission, or modify the user-generated information contained in transmissions. Krantind is immune from civil and criminal liability for third-party user content, provided users adhere to these terms.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Sections */}
      <div className="flex flex-col gap-6 text-sm text-slate-700 leading-relaxed">
        {/* Section 2 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>2. Eligibility & Student Code of Conduct</span>
          </h2>
          <p>
            You must be at least 16 years of age or enrolled in a recognized higher education college, university, polytechnic, or school in India. You represent and warrant that all registration details provided are accurate and that your use of the Platform complies with all applicable local, state, and national laws in India.
          </p>
        </section>

        {/* Section 3: Prohibited Content */}
        <section className="flex flex-col gap-3 rounded-card border border-red-200 bg-red-50/40 p-4 sm:p-5">
          <h2 className="text-base font-bold text-red-950 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <span>3. Prohibited Content (Rule 3(1)(b) of the IT Rules, 2021)</span>
          </h2>
          <p className="text-xs text-red-900">
            In compliance with Indian law, users are strictly prohibited from hosting, displaying, uploading, modifying, publishing, transmitting, storing, updating, or sharing any information that:
          </p>
          <ul className="list-disc pl-5 text-xs text-red-900 space-y-1.5">
            <li>
              <strong>Defamatory, Libelous, or Slanderous:</strong> Unverified personal attacks, slurs, or character assassination against individual professors, students, or staff by name without documentary justification (violating Section 356 BNS / Section 499 IPC).
            </li>
            <li>
              <strong>Obscene, Pornographic, or Invasive of Privacy:</strong> Any sexually explicit content, non-consensual imagery, or voyeuristic media (violating Section 67/67A IT Act).
            </li>
            <li>
              <strong>Public Mischief & Fake News:</strong> Forged University circulars, fake exam postponement notices, or rumors intended to cause institutional panic (Section 353 BNS).
            </li>
            <li>
              <strong>Hate Speech & Harassment:</strong> Content promoting violence, discrimination, caste-based hatred, or communal disharmony.
            </li>
            <li>
              <strong>Ragging & Intimidation:</strong> Content promoting, facilitating, or glorifying ragging, in contravention of Supreme Court of India and UGC Anti-Ragging Directives.
            </li>
            <li>
              <strong>Infringing Intellectual Property:</strong> Copyrighted question papers, paid course materials, or proprietary college data without authorization.
            </li>
            <li>
              <strong>Harmful to National Sovereignty:</strong> Threats to the unity, integrity, defence, security, or sovereignty of India.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">
            4. Whistleblower Anonymity & Privacy Terms
          </h2>
          <p>
            Krantind offers an <em>Anonymous Whistleblower Mode</em> to protect students raising genuine campus welfare grievances from unfair administrative retaliation (e.g. attendance deductions, grade penalties). When using Anonymous Mode:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li>Your name, profile link, and avatar are strictly hidden from the public feed and college administrators.</li>
            <li>You remain subject to community guidelines. Anonymity cannot be used as a shield to post false allegations, extortion threats, or personal harassment.</li>
            <li>In compliance with Indian Cyber Laws and Section 69 of the IT Act, metadata is preserved internally and will only be disclosed upon a lawful, written order issued by a competent Indian Court of Law or authorized Law Enforcement Agency.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">
            5. Content Moderation & Automated Strike System
          </h2>
          <p>
            Krantind employs real-time algorithmic scanning, visual content analysis, and community report triggers to enforce safety:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Automated Blur:</strong> Posts receiving 3+ unique community reports are auto-blurred pending review.</li>
            <li><strong>Automated Removal:</strong> Posts receiving 5+ verified reports or containing severe violations are removed automatically.</li>
            <li><strong>Progressive 10-Strike Ban Policy:</strong> Users accumulating multiple content violations receive progressive suspensions (Warning &rarr; 24h &rarr; 7d &rarr; Permanent Ban).</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">
            6. Limitation of Liability & User Indemnity
          </h2>
          <p>
            To the maximum extent permitted by Indian Law, Krantind, its founders, developers, and operators shall not be liable for any indirect, incidental, consequential, or punitive damages arising out of your access to or inability to access the Platform, or for any third-party content published on the site. You agree to defend, indemnify, and hold harmless Krantind against any claims, losses, or legal costs arising from your willful violation of these Terms or Indian Law.
          </p>
        </section>

        {/* Section 7 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">
            7. Grievance Officer & Statutory Takedowns (IT Rules, 2021)
          </h2>
          <p>
            In accordance with Rule 3(2) of the Information Technology Rules, 2021, Krantind has appointed a designated <strong>Resident Grievance Officer</strong> for receiving grievances and legal takedown notices:
          </p>
          <div className="rounded-card border border-slate-200 bg-slate-50 p-4 text-xs space-y-1">
            <p><strong>Grievance & Legal Desk:</strong> Krantind Legal & Compliance Cell</p>
            <p><strong>Email for Legal Notices & Takedowns:</strong> <a href="mailto:1krantind@gmail.com" className="text-primary-600 font-semibold underline">1krantind@gmail.com</a></p>
            <p><strong>Response Timeline:</strong> Acknowledgement within 24 hours; Redressal within 15 days (24 hours for emergency safety issues).</p>
            <p><strong>Grievance Portal:</strong> <Link href="/grievance" className="text-primary-600 font-semibold underline">krantind.xyz/grievance</Link></p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">
            8. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms of Service shall be governed by, construed, and enforced in accordance with the <strong>Laws of the Republic of India</strong>. Any dispute, claim, or controversy arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent Courts in India.
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-primary-600 underline">Privacy Policy</Link>
          <Link href="/grievance" className="hover:text-primary-600 underline">Grievance Redressal</Link>
          <Link href="/guidelines" className="hover:text-primary-600 underline">Community Guidelines</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
