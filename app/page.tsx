// Landing page: explains the mission, with a two-column hero on desktop and a
// stacked single-column layout on mobile. Sign Up and Log In CTAs. Fully
// static, so no "use client" is needed here.
import Link from "next/link"
import { Megaphone, ArrowRight, MapPin, HelpCircle, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/Button"
import s from "@/lib/strings"

const FEATURES = [
  {
    icon: MapPin,
    titleKey: "hero.features.region.title" as const,
    textKey: "hero.features.region.text" as const,
  },
  {
    icon: HelpCircle,
    titleKey: "hero.features.post.title" as const,
    textKey: "hero.features.post.text" as const,
  },
  {
    icon: HeartHandshake,
    titleKey: "hero.features.support.title" as const,
    textKey: "hero.features.support.text" as const,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh w-full bg-slate-50">
      {/* Top bar */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-card bg-primary-700 text-white">
              <Megaphone size={20} aria-hidden />
            </span>
            <span className="text-lg font-bold text-primary-700">{s["app.name"]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {s["auth.login.button"]}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{s["auth.signup.studentButton"]}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-content flex-col items-center px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
          🇮🇳 {s["hero.builtForIndia"]}
        </span>
        <h1 className="mt-4 max-w-3xl text-display text-slate-900">
          {s["hero.title"]} <span className="text-primary-700">{s["hero.titleHighlight"]}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-slate-600">
          {s["hero.subtitle"]}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="flex-1 sm:flex-none">
            <Button size="lg" fullWidth className="sm:min-w-44">
              {s["hero.cta.createAccount"]}
              <ArrowRight size={18} aria-hidden />
            </Button>
          </Link>
          <Link href="/login" className="flex-1 sm:flex-none">
            <Button size="lg" variant="outline" fullWidth className="sm:min-w-40">
              {s["hero.cta.login"]}
            </Button>
          </Link>
        </div>
      </section>

      {/* Mission/values strip */}
      <section className="w-full border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="flex flex-col gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-50 text-primary-700">
                <f.icon size={22} aria-hidden />
              </span>
              <h3 className="text-h4 text-slate-900">{s[f.titleKey]}</h3>
              <p className="text-body-sm text-slate-600">{s[f.textKey]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}