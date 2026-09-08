// Google Gemini AI integration for generating compelling Instagram social media
// posts, graphics copy, and hashtags for the Student Voice / Kranti platform.

export type SocialTheme = "midnight" | "amber" | "crimson" | "emerald" | "violet"
export type SocialFormat = "square" | "portrait"

export interface GeneratedSocialPost {
  headline: string
  subheadline: string
  badge: string
  bulletPoints: string[]
  statNumber: string
  statLabel: string
  cta: string
  colorTheme: SocialTheme
  format: SocialFormat
  caption: string
  hashtags: string[]
  strategyNotes?: string
}

export interface GeneratePostOptions {
  prompt?: string
  campaignType?:
    | "whistleblower"
    | "hostel_mess"
    | "fee_hike"
    | "mental_health"
    | "feature_spotlight"
    | "strike_unity"
    | "custom"
  sourcePost?: {
    id: string
    text: string
    category?: string
    college?: string
    supportsCount?: number
  }
  apiKey?: string
  theme?: SocialTheme
}

const FALLBACK_CAMPAIGNS: Record<string, GeneratedSocialPost> = {
  whistleblower: {
    headline: "Afraid to Speak Up Against Your College?",
    subheadline: "Over 78% of students fear retaliation when exposing campus mismanagement.",
    badge: "100% ANONYMOUS",
    bulletPoints: [
      "Zero identity leaks — real-time cryptographic masking",
      "Administrations cannot trace your device or roll number",
      "Join 4,500+ verified students raising issues safely",
    ],
    statNumber: "100%",
    statLabel: "Protected Anonymity",
    cta: "Speak your truth without fear on Student Voice",
    colorTheme: "midnight",
    format: "square",
    caption: `No student should ever have to stay silent because of attendance threats or disciplinary intimidation.

On Student Voice, your identity is cryptographically protected. Whether it's administrative corruption, hostel safety violations, or unfair penalties — your voice reaches state student unions and verified authorities without putting your academic career on the line.

What's happening on your campus that management wants buried? Drop your thoughts below or report it 100% anonymously via the link in our bio.`,
    hashtags: [
      "#StudentVoice",
      "#StudentRights",
      "#CampusReform",
      "#AnonymousWhistleblower",
      "#CollegeLifeIndia",
      "#EngineeringLife",
      "#MedicalStudent",
      "#UniversityAlert",
      "#CampusIssues",
      "#SpeakUpStudents",
      "#StudentPower",
      "#KrantiApp",
      "#YouthAction",
    ],
    strategyNotes:
      "High psychological resonance with fear of retaliation. Drives urgent app downloads and profile clicks.",
  },
  hostel_mess: {
    headline: "Unsanitary Mess Food & Broken Hostels?",
    subheadline: "Paying high hostel fees while living in substandard conditions ends now.",
    badge: "CAMPUS ALERT",
    bulletPoints: [
      "Document unhygienic water and food with photos and videos",
      "Trigger collective support from your entire hostel block",
      "Direct escalations to statutory university grievance desks",
    ],
    statNumber: "3,200+",
    statLabel: "Hostel Issues Fixed",
    cta: "Expose substandard hostel facilities on Student Voice",
    colorTheme: "amber",
    format: "square",
    caption: `Cockroaches in food, cold water in freezing temperatures, and non-functional Wi-Fi — yet hostel fees increase every semester without explanation.

Enough is enough. When one student complains to the warden, nothing happens. When 300 students verify the grievance collectively on Student Voice, management is forced to take corrective action within 48 hours.

What is the worst thing about your campus hostel right now? Share below or create an anonymous report through the link in bio.`,
    hashtags: [
      "#HostelLife",
      "#HostelProblems",
      "#CollegeMess",
      "#UnhygienicFood",
      "#StudentVoice",
      "#CampusFacilities",
      "#EngineeringHostel",
      "#StudentWelfare",
      "#HostelIssues",
      "#CollegeLife",
      "#KrantiApp",
    ],
    strategyNotes:
      "Universally relatable campus struggle. Highly shareable in college WhatsApp and Telegram groups.",
  },
  fee_hike: {
    headline: "Sudden 30% Fee Hikes & Surprise Exam Fines?",
    subheadline: "Colleges imposing arbitrary penalties without student consent must be held accountable.",
    badge: "FINANCIAL JUSTICE",
    bulletPoints: [
      "Track irregular exam revaluation charges and arbitrary fines",
      "Mobilize campus-wide petitions with verified upvotes",
      "Present organized student data to university oversight boards",
    ],
    statNumber: "Rs. 14L+",
    statLabel: "Unfair Fines Challenged",
    cta: "Organize against extortionate fees on Student Voice",
    colorTheme: "crimson",
    format: "square",
    caption: `How many times has your college introduced 'miscellaneous development fees' or massive exam rechecking charges with zero justification?

Education is a right, not an extortion racket. With Student Voice, students can unite across departments, gather verified upvotes, and legally challenge predatory campus fees with backing from registered student organizations.

Has your college hiked fees this year? Let us know in the comments and take collective action via the link in our bio.`,
    hashtags: [
      "#NoFeeHike",
      "#StudentRights",
      "#EducationNotBusiness",
      "#StudentVoice",
      "#CollegeFees",
      "#ExamRevaluation",
      "#StudentUnion",
      "#CampusJustice",
      "#IndianStudents",
      "#KrantiApp",
    ],
    strategyNotes:
      "Evokes strong sense of injustice and collective solidarity. Generates heavy comment engagement and saves.",
  },
  feature_spotlight: {
    headline: "One App. Every Campus Grievance. Real Solutions.",
    subheadline: "The modern platform where Indian college students hold administrations accountable.",
    badge: "PLATFORM SPOTLIGHT",
    bulletPoints: [
      "Anonymous post mode with end-to-end author masking",
      "Interactive state-by-state campus grievance heatmap",
      "Verified student organizations & official response tracking",
    ],
    statNumber: "45+",
    statLabel: "Universities Active",
    cta: "Join the student revolution — Link in bio",
    colorTheme: "emerald",
    format: "square",
    caption: `Tired of endless bureaucracy and complaint boxes that lead to nowhere?

Meet Student Voice — the community-driven platform built exclusively for Indian university students.
- Post campus problems in seconds with photos & videos
- Toggle Anonymous Mode to protect your identity completely
- Mobilize collective campus backing to enforce real changes
- Track which states and universities have the highest grievance resolution rates

Your voice matters. Make it impossible to ignore. Join today at the link in bio.`,
    hashtags: [
      "#StudentVoice",
      "#KrantiApp",
      "#CollegeLife",
      "#StudentCommunity",
      "#CampusTech",
      "#EdTechIndia",
      "#StudentEmpowerment",
      "#UniversityLife",
      "#YouthLeadership",
    ],
    strategyNotes: "Clear value proposition and onboarding hook for new students visiting the profile.",
  },
  strike_unity: {
    headline: "When Students Stand Together, Decisions Reverse.",
    subheadline: "Individual voices can be ignored. A unified student body cannot.",
    badge: "COLLECTIVE POWER",
    bulletPoints: [
      "Consolidate department demands into one verified petition",
      "Real-time support counters that track momentum",
      "Verified student union syndication across social media",
    ],
    statNumber: "10,000+",
    statLabel: "Students United",
    cta: "Unite your campus on Student Voice today",
    colorTheme: "violet",
    format: "square",
    caption: `From unfair attendance detentions to unilateral syllabus overhauls, administrations count on students being too fragmented to fight back.

Student Voice bridges that gap. Connect with your peers, amplify shared struggles, and make management listen to data-backed student support.

Tag a classmate who needs to see this. Link in bio to join your campus hub.`,
    hashtags: [
      "#StudentUnity",
      "#StudentMovement",
      "#CampusProtest",
      "#StudentVoice",
      "#YouthUnited",
      "#CollegeStudents",
      "#HigherEducation",
      "#StudentLeadership",
    ],
    strategyNotes: "High viral coefficient through friend tagging and collective peer sharing.",
  },
}

export async function generateSocialPostWithGemini(
  options: GeneratePostOptions = {},
): Promise<GeneratedSocialPost> {
  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const campaign = options.campaignType || "whistleblower"
  const defaultFallback = FALLBACK_CAMPAIGNS[campaign] || FALLBACK_CAMPAIGNS.whistleblower

  if (!apiKey) {
    if (options.sourcePost) {
      return transformSourcePostToFallback(options.sourcePost, options.theme)
    }
    if (options.prompt && options.prompt.trim()) {
      return generateCustomFallback(options.prompt, options.theme)
    }
    return defaultFallback
  }

  const systemInstruction = `You are a social media creative director and viral copywriter for "Student Voice" (also known as Kranti), a digital platform for Indian college students.
The platform allows students to:
1. Post campus problems (hostel hygiene, bad mess food, fee hikes, attendance harassment, lab equipment)
2. Post anonymously without fear of academic punishment or administration revenge
3. Gather student upvotes/supports to prove collective demand
4. Connect with verified student organizations and legal/grievance desks to enforce accountability
5. Track campus issue resolution rates across all Indian states

Generate an Instagram post package strictly adhering to the JSON schema.
Ensure the tone is authentic, urgent, and empowering.
Do not use informal emojis or symbols in the text.
Use proper paragraph breaks in the caption.
Include 15 to 25 strategic, high-reach hashtags relevant to Indian college life and student rights.`

  let userPrompt = ""
  if (options.sourcePost) {
    userPrompt = `Create a high-impact Instagram post spotlighting this real student grievance reported on our platform:
Grievance: "${options.sourcePost.text}"
Category: ${options.sourcePost.category || "Campus Life"}
College/University: ${options.sourcePost.college || "Major University"}
Upvotes/Supports: ${options.sourcePost.supportsCount || 120}

Highlight the injustice, explain how Student Voice protects student identity, and invite students from that campus and state to support the cause.`
  } else if (options.prompt && options.prompt.trim()) {
    userPrompt = `Create a high-impact Instagram post based on this campaign brief: "${options.prompt.trim()}". Theme preference: ${options.theme || "midnight"}.`
  } else {
    userPrompt = `Create a high-impact Instagram post for campaign theme: "${campaign}". Theme preference: ${options.theme || "amber"}.`
  }

  const promptPayload = `${userPrompt}

Return ONLY valid JSON matching this exact structure:
{
  "headline": "Short punchy hook headline for the visual graphic (max 8-10 words)",
  "subheadline": "Compelling supporting line or statistic (max 15 words)",
  "badge": "2-3 word uppercase category tag (e.g., CAMPUS ALERT, 100% ANONYMOUS, STUDENT RIGHTS)",
  "bulletPoints": [
    "First concrete bullet point for the visual card",
    "Second concrete bullet point for the visual card",
    "Third concrete bullet point for the visual card"
  ],
  "statNumber": "Short punchy stat (e.g., 100%, 4,500+, 48 Hrs, Rs. 12L+)",
  "statLabel": "Short 2-3 word label for the stat",
  "cta": "Graphic footer call to action (e.g., Raise your voice on Student Voice)",
  "colorTheme": "midnight" or "amber" or "crimson" or "emerald" or "violet",
  "format": "square",
  "caption": "Full Instagram caption (3-4 paragraphs with hooks, student struggle context, app solution, and link in bio CTA)",
  "hashtags": ["#StudentVoice", "#CampusLife", "#CollegeLifeIndia"],
  "strategyNotes": "1-2 sentences on why this post will perform well"
}`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\n${promptPayload}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.75,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn("Gemini API call failed, using smart fallback:", errText)
      return defaultFallback
    }

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      return defaultFallback
    }

    const parsed = JSON.parse(content) as GeneratedSocialPost
    return {
      headline: parsed.headline || defaultFallback.headline,
      subheadline: parsed.subheadline || defaultFallback.subheadline,
      badge: (parsed.badge || defaultFallback.badge).toUpperCase(),
      bulletPoints: Array.isArray(parsed.bulletPoints) && parsed.bulletPoints.length > 0
        ? parsed.bulletPoints.slice(0, 3)
        : defaultFallback.bulletPoints,
      statNumber: parsed.statNumber || defaultFallback.statNumber,
      statLabel: parsed.statLabel || defaultFallback.statLabel,
      cta: parsed.cta || defaultFallback.cta,
      colorTheme: (["midnight", "amber", "crimson", "emerald", "violet"].includes(parsed.colorTheme)
        ? parsed.colorTheme
        : options.theme || defaultFallback.colorTheme) as SocialTheme,
      format: "square",
      caption: parsed.caption || defaultFallback.caption,
      hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
        ? parsed.hashtags
        : defaultFallback.hashtags,
      strategyNotes: parsed.strategyNotes || defaultFallback.strategyNotes,
    }
  } catch (err) {
    console.error("Gemini parse error:", err)
    return defaultFallback
  }
}

function transformSourcePostToFallback(
  post: { text: string; category?: string; college?: string; supportsCount?: number },
  theme?: SocialTheme,
): GeneratedSocialPost {
  const snippet = post.text.slice(0, 80).trim()
  return {
    headline: `Grievance Spotlight: "${snippet}${post.text.length > 80 ? "..." : ""}"`,
    subheadline: `Reported by students from ${post.college || "University Campus"}`,
    badge: `${(post.category || "CAMPUS GRIEVANCE").toUpperCase()}`,
    bulletPoints: [
      "Verified student grievance published on Student Voice",
      `${post.supportsCount || 50}+ students already backed this complaint`,
      "Direct alert dispatched to student unions & authorities",
    ],
    statNumber: `${post.supportsCount || 50}+`,
    statLabel: "Students Backing This",
    cta: "Support this grievance on Student Voice -> Link in bio",
    colorTheme: theme || "crimson",
    format: "square",
    caption: `Students at ${post.college || "campus"} have raised an urgent grievance:

"${post.text}"

When isolated individuals complain, administrations deflect. But on Student Voice, every student report gathers real-time community backing to hold institutions publicly accountable.

Do you attend this college or face similar problems? Add your support and make your voice heard through the link in our bio.`,
    hashtags: [
      "#CampusGrievance",
      "#StudentVoice",
      "#CollegeIssues",
      "#StudentRights",
      "#HigherEducationIndia",
      "#CollegeLife",
      "#CampusAccountability",
      "#KrantiApp",
    ],
    strategyNotes: "Capitalizes on real student frustration to drive community solidarity and app adoption.",
  }
}

function generateCustomFallback(prompt: string, theme?: SocialTheme): GeneratedSocialPost {
  return {
    headline: prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt,
    subheadline: "Indian college students are breaking their silence and demanding accountability.",
    badge: "STUDENT ALERT",
    bulletPoints: [
      "100% Anonymous student grievance reporting",
      "Real-time campus momentum & petition tracking",
      "Direct escalation to registered student organizations",
    ],
    statNumber: "100%",
    statLabel: "Anonymous & Safe",
    cta: "Stand with your peers on Student Voice -> Link in bio",
    colorTheme: theme || "midnight",
    format: "square",
    caption: `${prompt}

Across colleges in India, thousands of students encounter issues that management ignores. Student Voice provides an anonymous, secure bridge between students, student unions, and campus authorities to get real problems solved.

Download the app or post your issue anonymously through the link in our bio.`,
    hashtags: [
      "#StudentVoice",
      "#CampusIssues",
      "#CollegeLifeIndia",
      "#StudentRights",
      "#CampusReform",
      "#KrantiApp",
      "#StudentsUnite",
    ],
    strategyNotes: "Tailored to the custom prompt topic with high engagement copy and clear CTA.",
  }
}
