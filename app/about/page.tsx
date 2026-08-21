import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, MapPin, HeartHandshake, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/feature"
import s from "@/lib/strings"

export const metadata: Metadata = {
  title: "About Krantind — India's Student Voice",
  description: "Learn about Krantind, the platform empowering Indian students to speak up, organize, and find solutions together.",
}

const SECTIONS = [
  {
    icon: MapPin,
    titleKey: "about.whatTitle" as const,
    textKey: "about.whatText" as const,
  },
  {
    icon: HeartHandshake,
    titleKey: "about.whoTitle" as const,
    textKey: "about.whoText" as const,
  },
  {
    icon: ShieldCheck,
    titleKey: "about.howTitle" as const,
    textKey: "about.howText" as const,
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-dvh w-full">
      <header className="w-full border-b border-[#E8E1D6] bg-[#FDFBF7]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="transition-app hover:opacity-90">
            <Logo size="md" />
          </Link>
          <Link
            href="/"
            className="transition-app flex items-center gap-1.5 rounded-pill border border-[#E8E1D6] bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700"
          >
            <ArrowLeft size={15} aria-hidden /> {s["about.backHome"]}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-content flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-3">
          <h1 className="font-display text-h1 text-ink">{s["about.title"]}</h1>
          <p className="max-w-xl text-body text-slate-600">{s["about.tagline"]}</p>
        </section>

        {SECTIONS.map((sec) => {
          const Icon = sec.icon
          return (
            <section key={sec.titleKey} className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-card bg-primary-50 text-primary-700">
                  <Icon size={17} aria-hidden />
                </span>
                <h2 className="text-h4 text-ink">{s[sec.titleKey]}</h2>
              </div>
              <p className="max-w-2xl text-body-sm text-slate-600">{s[sec.textKey]}</p>
            </section>
          )
        })}

        <section className="flex flex-col gap-2">
          <h2 className="text-h4 text-ink">{s["about.contactTitle"]}</h2>
          <p className="max-w-2xl text-body-sm text-slate-600">{s["about.contactText"]}</p>
        </section>
      </main>

      <footer className="w-full border-t border-[#E8E1D6]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-2 px-4 py-10 text-center sm:px-6 lg:px-8">
          <Logo size="sm" />
          <p className="max-w-md text-body-sm text-slate-500">{s["footer.tagline"]}</p>
          <p className="text-xs text-slate-400">{s["footer.madeBy"]}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">{s["footer.copyright"]}</p>
        </div>
      </footer>
    </div>
  )
}