# Behavioral Trust Audit — Krantind/Student-Voice Platform

## 1. Executive Summary

Student-Voice is built on a structurally sound psychological foundation of anonymity, escalation, and restorative moderation. However, several interface-level decisions risk reintroducing the very fear-of-retaliation anxiety the system is designed to prevent. The most critical vulnerabilities are: (a) insufficient decoupling between college-verified status and anonymous posting, (b) cognitive friction in the "friends-also" toggle, (c) a strike system that is gamified rather than educational, and (d) a grievance portal that lacks bidirectional trust signaling. The platform is well-architected for a low-fear baseline but requires targeted UX hardening to achieve true ironclad psychological comfort.

## 2. Trust Architecture & Psychological Safety Analysis

**Strengths.** The two-layer identity model (anonymous vs. verified) correctly recognizes that students occupy dual personas — the cautious private citizen and the institutionally-recognized community member. Auto-blur at three reports is a calibrated protective threshold that protects targets of mass-reporting harassment without prematurely silencing legitimate dissent. The grievance portal's existence at all signals institutional acknowledgement that informal channels are insufficient.

**Weaknesses.** Verified badge status (Badges.tsx) creates a latent psychological linkage: a student who posts anonymously about a campus malpractice while holding a verified college badge experiences cognitive dissonance — they know their email was once used to verify institutional membership. Even if the technical anonymity holds, the student's mental model often includes the implicit worry that backend administrators can correlate their college email with their anonymous handle. This is the "correlation anxiety" problem common in semi-anonymous platforms.

## 3. Anxiety Triggers & Retaliation Vulnerabilities

**Anonymity interface.** The toggle presents a binary (anonymous vs. identified) rather than reassuring users about the technical boundary between the two states. Missing trust signals include: (a) explicit confirmation that verified identity is cryptographically separated from anonymous identity at the database level, (b) visible audit indicators (e.g., "Your college email cannot be matched to this post"), (c) absence of any "dean mode" / "IT admin mode" reassurance language.

**Friends-also disclosure toggle.** This introduces significant cognitive load. The student must now maintain two simultaneous mental models: "strangers cannot see me, but my friends can." The risk vectors are: (i) misinterpretation — students may fear their friends will screenshot and forward, (ii) trust-tree confusion — students may not realize that "mutual followers" does not equal "people I personally know," (iii) authority-infiltration anxiety — students may worry that a college administrator or their professor's friend is following them. The toggle currently provides no guided mental model to resolve these scenarios.

**Strike counter visibility.** A "10-strike" system displayed numerically primes shame and surveillance anxiety. Research on progressive discipline shows that visible counters reduce intrinsic motivation to reform and increase concealment behavior — the opposite of what a student-voice platform requires.

## 4. Trust-Hardening Design Recommendations

**Anonymity interface:**
- Add a persistent micro-affirmation beneath the anonymous toggle: "Your college verification is stored separately and cannot be matched to this post."
- Introduce a "trust receipt" — a one-time onboarding screen explaining the technical separation in plain language.
- Decouple badges entirely from the anonymous post author field. No co-display of verified badge alongside anonymous content where the author could be inferred.

**Friends-also toggle:**
- Rename to reduce cognitive load: "Trusted Inner Circle" with subtext "Visible only to people who mutually follow you."
- Add a confirmation modal showing the actual count: "This will reveal your identity to X friends. Strangers and college staff will not see your name."
- Provide a "preview" feature showing exactly which handles will see the disclosure.

**Badges.tsx:**
- Add an explicit "Anonymous Compatibility" indicator showing that badge status does not compromise anonymous posts.
- Reframe college verification as a community-membership signal, not an institutional identity signal: "Verified Student Community Member" rather than "Verified [College Name] Student."

**BannedUserScreen.tsx:**
- Replace punitive language with restorative framing: "Let's talk about what happened" rather than "You have been banned."
- Provide a clear, jargon-free explanation of which specific content triggered the action.
- Offer a one-click "Request Review" path with guaranteed human response time.

**lib/moderation.ts (10-strike system):**
- Remove the numeric counter from user-facing UI entirely. Replace with categorized, qualitative feedback: "Community concerns were raised about tone in 3 recent posts."
- Implement a "cool-down and reflect" interstitial at strike 1-2 rather than punitive messaging.
- Tie strikes to educational content: short modules on constructive discourse before the user can resume posting.

**Grievance portal (app/grievance/page.tsx):**
- Add status tracking with SLA guarantees ("You will hear back within 72 days").
- Allow anonymous grievance submission with the same anonymity guarantees as the feed.
- Provide a public dashboard (anonymized) showing resolution rates to demonstrate institutional responsiveness.

## 5. Psychological Safety Scorecard

| Dimension | Score (0-100) |
|---|---|
| Anonymity technical assurance | 58 |
| Identity separation clarity | 52 |
| Friends-also cognitive clarity | 41 |
| Badge-psychological decoupling | 47 |
| Warning screen tone (restorative vs. punitive) | 39 |
| Strike system motivation alignment | 34 |
| Grievance portal bidirectional trust | 55 |
| Overall Psychological Safety Index | **46 / 100** |

**Overall assessment.** The platform demonstrates strong structural intent but underperforms on the psychological-experience layer that determines whether students actually use the protections offered. The highest-priority interventions are: (1) adding explicit anonymity technical reassurance, (2) removing the punitive numeric strike counter, and (3) reframing the banned screen as restorative. With these changes, the platform can plausibly reach a Psychological Safety Index above 75.

---
*Prepared under AI3 Behavioral Trust Audit Protocol. No emojis used per format constraint.*
