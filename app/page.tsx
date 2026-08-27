// Landing page: purpose made crystal clear in seconds — hero says exactly
// what the app does, followed by a 3-step "How it works". Fully static, so
// no "use client" is needed here.
import Link from "next/link"
import { ArrowRight, MapPin, HelpCircle, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/feature"
import s from "@/lib/strings"

const STEPS = [
  {
    icon: MapPin,
    titleKey: "hero.features.region.title" as const,
    textKey: "hero.features.region.text" as const,
    tile: "bg-primary-50 text-primary-700",
  },
  {
    icon: HelpCircle,
    titleKey: "hero.features.post.title" as const,
    textKey: "hero.features.post.text" as const,
    tile: "bg-accent-50 text-accent-600",
  },
  {
    icon: HeartHandshake,
    titleKey: "hero.features.support.title" as const,
    textKey: "hero.features.support.text" as const,
    tile: "bg-emerald-50 text-emerald-600",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh w-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-card focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-card"
      >
        {s["a11y.skipToContent"]}
      </a>
      {/* Top bar */}
      <header className="w-full border-b border-[#E8E1D6] bg-[#FDFBF7]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="transition-app hover:opacity-90">
            <Logo size="md" />
          </Link>
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
      <main id="main-content">
      <section className="mx-auto flex w-full max-w-content flex-col items-center px-4 pb-14 pt-14 text-center sm:px-6 md:pt-20 lg:px-8">
        <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-pill border border-accent-200 bg-accent-50 px-3.5 py-1.5 text-xs font-semibold text-accent-700">
          🇮🇳 {s["hero.builtForIndia"]}
        </span>
        <h1 className="animate-fade-up mt-5 max-w-3xl font-display text-display text-ink [animation-delay:60ms]">
          {s["hero.title"]} <span className="text-primary-700">{s["hero.titleHighlight"]}</span>
        </h1>
        <p className="animate-fade-up mt-4 max-w-2xl text-body-lg text-slate-600 [animation-delay:120ms]">
          {s["hero.subtitle"]}
        </p>

        <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row [animation-delay:180ms]">
          <Link href="/signup" className="flex-1 sm:flex-none">
            <Button size="lg" fullWidth className="group sm:min-w-44">
              {s["hero.cta.createAccount"]}
              <ArrowRight
                size={18}
                aria-hidden
                className="transition-app group-hover:translate-x-0.5"
              />
            </Button>
          </Link>
          <Link href="/login" className="flex-1 sm:flex-none">
            <Button size="lg" variant="outline" fullWidth className="sm:min-w-40">
              {s["hero.cta.login"]}
            </Button>
          </Link>
        </div>
      </section>

      {/* How Krantind works — 3 steps */}
      <section className="w-full border-t border-[#E8E1D6] bg-[#FDFBF7]">
        <div className="mx-auto w-full max-w-content px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-h2 text-ink">{s["how.title"]}</h2>
          <div className="mx-auto mt-10 grid w-full max-w-4xl gap-5 md:grid-cols-3">
            {STEPS.map((f, i) => (
              <div
                key={f.titleKey}
                className="surface-card transition-app flex flex-col gap-3 p-6 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.tile}`}>
                    <f.icon size={22} aria-hidden />
                  </span>
                  <span className="font-display text-2xl font-semibold text-[#E0D6C6]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-h4 text-ink">{s[f.titleKey]}</h3>
                <p className="text-body-sm text-slate-600">{s[f.textKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E8E1D6] bg-[#FDFBF7]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-3 px-4 py-10 text-center sm:px-6 lg:px-8">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              href="/about"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              {s["footer.about"]}
            </Link>
            <Link
              href="/impact"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              🏆 Impact
            </Link>
            <Link
              href="/terms"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              Privacy Policy
            </Link>
            <Link
              href="/grievance"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              Grievance Officer
            </Link>
            <Link
              href="/guidelines"
              className="rounded-pill border border-[#E8E1D6] bg-white px-3 py-1 text-slate-600 transition-app hover:border-primary-300 hover:text-primary-700 font-medium"
            >
              Campus Rules
            </Link>
          </div>
          <p className="max-w-md text-body-sm text-slate-500 mt-1">{s["footer.tagline"]}</p>
          <p className="text-xs text-slate-400">{s["footer.madeBy"]}</p>
          <p className="text-xs font-medium text-slate-500">{s["footer.copyright"]}</p>
        </div>
      </footer>
    </div>
  )
}
