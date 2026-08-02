"use client"

// Landing page: explains the mission, with a two-column hero on desktop and a
// stacked single-column layout on mobile. Sign Up and Log In CTAs.
import Link from "next/link"
import { Megaphone, ArrowRight, MapPin, HelpCircle, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/Button"

const FEATURES = [
  {
    icon: MapPin,
    title: "Region by region",
    text: "Problems are anchored to your state and district so support comes from the people closest to you.",
  },
  {
    icon: HelpCircle,
    title: "Post problems",
    text: "Students and student organizations can share real issues — from campus facilities to fees and transport.",
  },
  {
    icon: HeartHandshake,
    title: "Get real support",
    text: "The community — and relevant organizations — step in to help, upvote, and act.",
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
              <Megaphone size={20} />
            </span>
            <span className="text-lg font-bold text-primary-700">StudentVoice</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-content items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            🇮🇳 Built for students of India
          </span>
          <h1 className="mt-4 text-display text-slate-900">
            Your voice, heard &amp; supported —{" "}
            <span className="text-primary-700">region by region</span>
          </h1>
          <p className="mt-4 max-w-xl text-body-lg text-slate-600">
            StudentVoice helps students and student organizations post the problems that matter on
            campus, and get real support from the people closest to them. No noise — just genuine
            help where you live.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="flex-1 sm:flex-none">
              <Button size="lg" fullWidth className="sm:min-w-44">
                Create your account
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/login" className="flex-1 sm:flex-none">
              <Button size="lg" variant="outline" fullWidth className="sm:min-w-40">
                Log In
              </Button>
            </Link>
          </div>
        </div>

        {/* Illustration (right on desktop, below on mobile) */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="surface-card relative z-10 overflow-hidden p-5">
<div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Megaphone size={18} className="text-primary-700" />
              </span>
              <div>
                <p className="font-semibold text-slate-800">Campus Water Issue</p>
                <p className="text-body-sm text-slate-500">Mumbai, Maharashtra</p>
              </div>
            </div>
            <p className="mt-3 text-body-sm text-slate-600">
              Hostel watering is broken for 3 days. Need the warden&apos;s action and student
              support.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-pill bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                <HeartHandshake size={14} /> 42 Support
              </span>
              <span className="text-body-sm text-slate-400">2h ago</span>
            </div>
          </div>

          {/* decorative supporting card */}
          <div className="absolute -bottom-4 -right-2 z-0 hidden rounded-card bg-primary-700 px-4 py-3 text-white shadow-popover sm:block">
            <p className="text-sm font-semibold">6 districts active today</p>
          </div>
        </div>
      </section>

      {/* Mission/values strip */}
      <section className="w-full border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-50 text-primary-700">
                <f.icon size={22} />
              </span>
              <h3 className="text-h4 text-slate-900">{f.title}</h3>
              <p className="text-body-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}