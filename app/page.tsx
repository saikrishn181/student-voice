"use client"

// Landing page: explains the mission, with a two-column hero on desktop and a
// stacked single-column layout on mobile. Sign Up and Log In CTAs.
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
      <section className="mx-auto grid w-full max-w-content items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            🇮🇳 {s["hero.builtForIndia"]}
          </span>
          <h1 className="mt-4 text-display text-slate-900">
            {s["hero.title"]} <span className="text-primary-700">{s["hero.titleHighlight"]}</span>
          </h1>
          <p className="mt-4 max-w-xl text-body-lg text-slate-600">
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
        </div>

        {/* Illustration (right on desktop, below on mobile) */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="surface-card relative z-10 overflow-hidden p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Megaphone size={18} className="text-primary-700" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-slate-800">{s["hero.demoPost.title"]}</p>
                <p className="text-body-sm text-slate-500">{s["hero.demoPost.location"]}</p>
              </div>
            </div>
            <p className="mt-3 text-body-sm text-slate-600">
              {s["hero.demoPost.body"]}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-pill bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                <HeartHandshake size={14} aria-hidden /> {s["hero.demoPost.support"](42)}
              </span>
              <span className="text-body-sm text-slate-400">2h ago</span>
            </div>
          </div>

          {/* decorative supporting card */}
          <div className="absolute -bottom-4 -right-2 z-0 hidden rounded-card bg-primary-700 px-4 py-3 text-white shadow-popover sm:block">
            <p className="text-sm font-semibold">{s["hero.demoCard.states"]}</p>
          </div>
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