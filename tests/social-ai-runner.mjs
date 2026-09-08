// Runner module for social AI and Instagram integration tests in Node.js test runner

const FALLBACK_CAMPAIGNS = {
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

Meet Student Voice — the community-driven platform built exclusively for Indian university students.`,
    hashtags: [
      "#StudentVoice",
      "#KrantiApp",
      "#CollegeLife",
      "#StudentCommunity",
      "#CampusTech",
      "#EdTechIndia",
    ],
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
    caption: `From unfair attendance detentions to unilateral syllabus overhauls, administrations count on students being too fragmented to fight back.`,
    hashtags: [
      "#StudentUnity",
      "#StudentMovement",
      "#CampusProtest",
      "#StudentVoice",
    ],
  },
}

export function generateSocialPostSync(options = {}) {
  const campaign = options.campaignType || "whistleblower"
  if (options.sourcePost) {
    const post = options.sourcePost
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
      colorTheme: options.theme || "crimson",
      format: "square",
      caption: `Students at ${post.college || "campus"} have raised an urgent grievance:\n\n"${post.text}"`,
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
    }
  }

  if (options.prompt && options.prompt.trim()) {
    const prompt = options.prompt.trim()
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
      colorTheme: options.theme || "midnight",
      format: "square",
      caption: `${prompt}\n\nAcross colleges in India, thousands of students encounter issues that management ignores.`,
      hashtags: [
        "#StudentVoice",
        "#CampusIssues",
        "#CollegeLifeIndia",
        "#StudentRights",
        "#CampusReform",
        "#KrantiApp",
      ],
    }
  }

  return FALLBACK_CAMPAIGNS[campaign] || FALLBACK_CAMPAIGNS.whistleblower
}

export function verifyInstagramCredentialsSync(accessToken, instagramAccountId) {
  const token = (accessToken || "").trim()
  const accountId = (instagramAccountId || "").trim()

  if (!token) {
    return { ok: false, error: "Meta Instagram Access Token is missing." }
  }
  if (!accountId) {
    return { ok: false, error: "Instagram Business/Creator Account ID is missing." }
  }
  return { ok: true, account: { id: accountId, username: "studentvoice.app" } }
}

export function validateInstagramPublishParamsSync({ accessToken, instagramAccountId, imageUrl, caption }) {
  const token = (accessToken || "").trim()
  const accountId = (instagramAccountId || "").trim()
  const url = (imageUrl || "").trim()

  if (!token || !accountId) {
    return { ok: false, error: "Missing Instagram credentials. Please provide Access Token and Account ID." }
  }
  if (!url || !url.startsWith("http")) {
    return { ok: false, error: "Invalid public image URL. Image must be hosted on a public HTTPS endpoint." }
  }
  return { ok: true, ready: true }
}
