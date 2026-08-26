"use client"

// 1-Click Formal College Representation Letter Generator
// Generates a ready-to-print formal grievance representation letter for the
// College Principal / Dean / Student Grievance Redressal Committee.
import { useState } from "react"
import { Printer, Copy, Check, FileText, Download, ShieldCheck } from "lucide-react"
import { Modal, Button } from "@/components/ui"
import { useToastStore } from "@/lib/store/useToastStore"
import type { Post, User } from "@/lib/types"

interface FormalLetterModalProps {
  post: Post
  author: User | null
  open: boolean
  onClose: () => void
}

export function FormalLetterModal({ post, author, open, onClose }: FormalLetterModalProps) {
  const showToast = useToastStore((s) => s.show)
  const [copied, setCopied] = useState(false)

  const college = author?.collegeName || "The College Administration"
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const postDate = new Date(post.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const subject = `Representation regarding campus issue: ${post.hashtags.length > 0 ? post.hashtags.map((h) => `#${h}`).join(" ") : "Student Grievance"}`

  const letterText = `To,
The Principal / Dean of Student Affairs / Student Grievance Committee,
${college}

Date: ${dateStr}

Subject: ${subject}

Respected Sir / Madam,

We, the undersigned students of ${college}, wish to bring to your urgent attention a pressing campus grievance that has been highlighted and collectively supported on the student voice forum:

"${post.text}"

Summary of Student Support & Grievance Record:
• Initial Grievance Raised: ${postDate}
• Verified Student Signatures & Supports: ${post.supportCount} students
• Verified Student Discussions & Comments: ${post.commentCount} responses
• Verification Reference ID: KRANTIND-DOC-${post.id.slice(0, 8).toUpperCase()}

In light of the widespread impact on student welfare and campus academic life, we respectfully request the administration to look into this matter at the earliest and initiate appropriate remedial action.

Thanking you.

Yours sincerely,
Students of ${college}
(Represented via Krantind Verified Student Voice Portal)`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText)
      setCopied(true)
      showToast("Formal letter text copied to clipboard!", "success")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast("Could not copy letter text", "error")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal open={open} onClose={onClose} title="📄 Formal Representation Letter (Dean / Principal)">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          Generated formal grievance letter backed by <strong>{post.supportCount} student supporters</strong>. Ready to print, sign, and submit to your college grievance cell.
        </p>

        {/* Letter Preview Box */}
        <div className="printable-letter rounded-card border border-slate-300 bg-white p-5 text-sm text-slate-800 shadow-inner font-serif leading-relaxed space-y-3 max-h-[380px] overflow-y-auto">
          <div className="border-b border-slate-200 pb-3">
            <p className="font-bold text-slate-900">To,</p>
            <p className="text-slate-800 font-semibold">The Principal / Dean of Student Affairs,</p>
            <p className="text-slate-600">{college}</p>
            <p className="text-xs text-slate-500 mt-1">Date: {dateStr}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 underline">
              Subject: {subject}
            </p>
          </div>

          <p>Respected Sir / Madam,</p>

          <p className="text-justify">
            We, the undersigned students of {college}, wish to bring to your urgent attention a pressing campus grievance that has been collectively supported by the student community:
          </p>

          <div className="my-2 rounded-card border-l-4 border-primary-600 bg-slate-50 p-3 italic text-slate-900 font-sans text-xs">
            &ldquo;{post.text}&rdquo;
          </div>

          <div className="my-2 rounded-card border border-slate-200 bg-slate-50/70 p-3 text-xs font-sans">
            <p className="font-semibold text-slate-800 mb-1">Student Support & Record Details:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Verified Student Signatures: <strong>{post.supportCount} supporters</strong></li>
              <li>Recorded Responses & Comments: <strong>{post.commentCount} students</strong></li>
              <li>Document Ref ID: <code>KRANTIND-{post.id.slice(0, 8).toUpperCase()}</code></li>
            </ul>
          </div>

          <p className="text-justify">
            In light of the widespread impact on student welfare, we respectfully request the administration to look into this matter at the earliest and initiate appropriate remedial action.
          </p>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold">Yours sincerely,</p>
              <p className="text-slate-600">Students of {college}</p>
            </div>
            <div className="flex items-center gap-1.5 text-primary-700 bg-primary-50 border border-primary-200 px-2 py-1 rounded-pill">
              <ShieldCheck size={14} />
              <span className="text-[11px] font-sans font-medium">Verified by Krantind</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check size={16} className="text-primary-600" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy Letter Text"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer size={16} />
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}
