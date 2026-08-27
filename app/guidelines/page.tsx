import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, HeartHandshake, AlertTriangle, BookOpen } from "lucide-react"
import { Card } from "@/components/ui"

export const metadata: Metadata = {
  title: "Campus Community Guidelines — Krantind",
  description:
    "Community Guidelines and Anti-Defamation Code for students and college organizations on Krantind.",
}

export default function GuidelinesPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/feed" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
        <span className="text-xs font-semibold text-slate-400">Student Code & Conduct</span>
      </div>

      {/* Hero */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-pill bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-200 mb-3">
          <HeartHandshake size={14} />
          Safe, Responsible & Constructive Campus Voice
        </div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 sm:text-3xl">
          Campus Community Guidelines & Anti-Defamation Code
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Krantind exists to empower Indian students to raise real campus problems and drive constructive change. To maintain a safe, impactful, and legally protected environment under Article 19(1)(a) of the Constitution of India, all users must abide by these Community Guidelines.
        </p>
      </div>

      {/* The Core Golden Rule: Institutional Critique vs Personal Defamation */}
      <Card className="border border-indigo-200 bg-linear-to-br from-indigo-50/70 to-purple-50/50 p-5">
        <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2 mb-2">
          <BookOpen size={18} className="text-indigo-600" />
          The Golden Rule: Focus on Issues, Not Personal Defamation
        </h2>
        <p className="text-xs text-indigo-900 leading-relaxed mb-3">
          Indian courts protect genuine student discussions on institutional issues (Article 19(1)(a)), but strictly penalize unverified personal defamation naming individuals (Section 356 BNS / Section 499 IPC). Here is the difference:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-card border border-emerald-300 bg-white p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>ALLOWED: Institutional Grievances</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>&ldquo;Hostel Block B mess served spoiled food today. Mess committee please inspect.&rdquo;</li>
              <li>&ldquo;Physics Lab apparatus #4 is broken since 3 weeks, practical exam affected.&rdquo;</li>
              <li>&ldquo;Bus transport route 7 is consistently 45 mins late.&rdquo;</li>
              <li>&ldquo;Fee breakdown shows library charges but library is closed on weekends.&rdquo;</li>
            </ul>
          </div>

          <div className="rounded-card border border-red-300 bg-white p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-800 font-bold">
              <XCircle size={16} className="text-red-600" />
              <span>PROHIBITED: Personal Defamation</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Posting unverified rumors or character accusations naming specific individual professors.</li>
              <li>Calling individual students or faculty derogatory personal slurs or abusive names.</li>
              <li>Sharing personal phone numbers, home addresses, or private photos without consent.</li>
              <li>Fake claims targeting a person without any factual or documentary basis.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Guidelines Grid */}
      <div className="flex flex-col gap-6 text-sm text-slate-700 leading-relaxed">
        {/* Policy 1 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">1. Zero Tolerance for Ragging & Bullying</h2>
          <p>
            In alignment with the Supreme Court of India and UGC Anti-Ragging Directives:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li>Any post promoting, justifying, or facilitating ragging or intimidation of junior students will be banned immediately with <strong>permanent strike removal</strong>.</li>
            <li>Victims of ragging are encouraged to use Anonymous Whistleblower mode to safely report incidents or call the National Anti-Ragging Helpline at <code className="font-mono font-bold text-primary-700">1800-180-5522</code>.</li>
          </ul>
        </section>

        {/* Policy 2 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">2. Authenticity & No Forged University Circulars</h2>
          <p>
            Never post fake university holiday circulars, fabricated fee notices, or false exam postponement letters. Spreading fabricated institutional circulars creates public mischief and is punishable under Section 353 of the Bharatiya Nyaya Sanhita (BNS).
          </p>
        </section>

        {/* Policy 3 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">3. Verified College Organizations & Councils</h2>
          <p>
            Student unions, clubs, and placement cells holding a <strong>Verified Organization Badge</strong> must use their account solely for verified campus announcements, official resolutions, and offering genuine assistance to students.
          </p>
        </section>

        {/* Policy 4 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-slate-900">4. Automated Moderation & Ban Policy</h2>
          <p>
            Violations result in progressive strikes:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Strike 1–2:</strong> Formal Warning Notification.</li>
            <li><strong>Strike 3:</strong> 24-hour temporary posting restriction.</li>
            <li><strong>Strike 6:</strong> 7-day temporary suspension.</li>
            <li><strong>Strike 10:</strong> Permanent account ban across the platform.</li>
          </ul>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-primary-600 underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary-600 underline">Privacy Policy</Link>
          <Link href="/grievance" className="hover:text-primary-600 underline">Grievance Redressal</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Krantind. All rights reserved.</p>
      </div>
    </div>
  )
}
