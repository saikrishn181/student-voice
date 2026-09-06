# Cognitive Ergonomics Audit: Krantind/Student-Voice Platform

## 1. Executive Summary

The Student-Voice platform exhibits strong information density ambitions but consistently crosses the threshold from "informative" into "cognitively expensive" across the four evaluated surfaces. The Feed page attempts to maximize the visible data plane by combining a left navigation, hot issue banners, a central feed, a right rail of suggestions, and trending topics. The PostCard compounds density by stacking identity signals, content, interactive widgets, and multiple action affordances on a single tile. Post creation reveals an inverse problem: it front-loads nearly every possible option simultaneously, violating progressive disclosure for novice users. The mental model from consumption to action is conceptually sound (viewing a campus issue to supporting or RSVPing is a natural progression), but the visual weight and decision parallelization of the action bar undermines fluid transitions. Overall, the platform reads as a power-user tool that has not yet been attenuated for its primary persona: the overwhelmed student.

---

## 2. Cognitive Load & Friction Audit

### 2.1 Feed Page (`app/feed/page.tsx`)

**Intrinsic Load: Moderate.** The information hierarchy is conventional — chrome on the sides, content in the middle — which respects the user's prior experience with social platforms.

**Extraneous Load: High.** Three primary frictions:

- **Tri-rail layout pressure.** The left navigation, right suggestions rail, and top hot-issue banners force the eye to traverse a wide horizontal field for every interaction. On viewports under 1280px, this either causes aggressive truncation or forces a single-column collapse, which fragments the user's spatial memory of the layout.
- **Hot issue banners compete with feed primacy.** Persistent banners above the stream pull attention away from the actual feed. The user must consciously decide whether to engage with the banner or scroll past, adding a micro-decision cost per viewport.
- **Right rail content is static and low-priority.** Follower suggestions and trending topics consume persistent attention resources but are not the user's primary task. They are taxing in the Sweller sense — present, salient, and rarely actionable in the moment.

**Germane Load: Low.** Nothing in the layout actively scaffolds the user's understanding of campus discourse dynamics.

### 2.2 PostCard (`components/feature/PostCard.tsx`)

This is the most cognitively expensive surface in the system. The card attempts to communicate: identity, verification, location, categorization, temporality, content, optional media, optional poll, social proof, and six possible action paths.

- **Header chunk overflow.** Avatar + name + verified badge + region tag + category tag + timestamp represents six identity-temporality signals. By Miller's 7±2 heuristic, this alone consumes most of the working memory budget before the user has even read the post body. The visual difference between "verified college," "region tag," and "category tag" is subtle enough that users will repeatedly parse which tag means what.
- **Action bar overload.** Support (heart + count), comment, share menu, RSVP, and report — five distinct actions with overlapping but non-identical semantics. Hick's Law applies directly: reaction time scales with the number of choices. A student who wants to "engage with this post" must first classify their intent across five affordances.
- **Widget stacking.** When a post contains both media and a poll, the card effectively becomes a mini-application within a card. The user's mental model must context-switch between "viewer," "voter," and "reader," with no clear visual separation between the modes.
- **Decision fatigue signal.** The combined count of visible interactive elements (excluding media) approaches 10-12 per card. At feed density (multiple cards visible), this multiplies rapidly.

### 2.3 Navbar (`components/layout/Navbar.tsx`)

**Low-to-moderate load.** As a persistent component, its cognitive cost is the sum of its visual weight times its persistence. If the navbar carries a high badge count (notifications, messages, RSVP reminders) without aggregation, it becomes a constant background tax.

### 2.4 Post Creation (`app/post/create/page.tsx`)

**Intrinsic Load: High for novices, low for experienced posters.** This is the most progressive-disclosure-broken surface.

- **All options visible at once.** Text area, hashtag picker, media attachment, poll builder, content warning toggle, anonymous post switch, and followers-only switch are presented as a single form. A first-time student poster sees a wall of choices with no scaffolding.
- **The most consequential decision is presented last.** Anonymous vs. identified posting carries significant social risk for students on contentious campus issues. Burying it below media and poll configuration means users may compose, attach media, build a poll, and only then confront the identity question — exactly when friction is highest.
- **No preview, no confidence meter, no "first post" affordance.** There is no progressive disclosure mechanism (e.g., "Advanced options" collapse) and no onboarding state for the first creation event.

---

## 3. Mental Model & Usability Bottlenecks

### 3.1 Identity-to-Content Parsing Lag

Users approach a social feed expecting a fast loop: *who said what, do I care, do I act*. The PostCard forces a parsing sequence of: avatar (subconscious) → name (subconscious) → badge (interpretive) → region tag (interpretive) → category tag (interpretive) → timestamp (temporal anchoring) → content (primary). Three interpretive steps before content comprehension is excessive.

### 3.2 Action Intent Ambiguity

The action bar conflates four distinct psychological intents:
- **Endorse** (heart/support)
- **Discuss** (comment)
- **Amplify** (share)
- **Commit** (RSVP)

These are not interchangeable, but visually they compete as equal-weight peers. A student who wants to RSVP to a protest but also support the post must make two decisions, and the iconography may not be self-evident (RSVP is a less common social media verb than like/comment/share).

### 3.3 Consumption-to-Action Friction

The transition from reading a campus issue to taking action is conceptually a one-step loop. The current design makes it a four-step process:
1. Locate the relevant action among five peers.
2. Verify that the action matches intent (especially for RSVP vs. support).
3. Execute (which may open a modal, especially for RSVP).
4. Receive confirmation.

Step 2 is the bottleneck. The semantic distance between "support" and "RSVP" is not visually communicated.

### 3.4 Post Creation Mental Model

The creation flow treats the post as a multi-dimensional object from the outset. A first-time poster's mental model is closer to: "I want to say something about [issue]." The interface instead presents: "Configure your post object." This mismatch is a primary cause of abandonment for novice users.

---

## 4. Actionable UX Streamlining Recommendations

### 4.1 PostCard Restructuring

- **Collapse identity into a single chunk.** Render avatar, name, verified badge, and region as a unified group with a single visual weight. Demote the category tag to a small subhead or a colored stripe on the card edge — category should be skimmable, not parsed.
- **Separate the action layer by frequency.** Group "Support" and "Comment" as primary actions (left-aligned, larger). Move "Share" and "Report" into an overflow menu (three-dot). Place "RSVP" as a contextual action that only appears when the post contains event metadata.
- **Adopt a "summary → detail" card pattern.** When both media and a poll are present, render the media as the primary visual, and collapse the poll into a "View poll" affordance that expands inline. Do not present both as equally weighted blocks.
- **Reduce tag taxonomy at the header level.** If region and category must both be visible, bind them into a single chip ("Northeast · Campus Safety") rather than two separate elements.

### 4.2 Feed Layout Right-Sizing

- **Demote the right rail on first view.** Render follower suggestions and trending topics below the feed or behind a dedicated tab. The right rail should be reserved for high-relevance contextual content (e.g., posts from people you follow, active RSVPs in your network).
- **Rotate, do not stack, hot issue banners.** Use a single rotating banner slot rather than a stack, eliminating the parallel-attention cost.
- **Consider a two-zone desktop layout.** Left navigation + feed + a single contextual right column (rotating between suggestions, RSVPs, trending) is sufficient. Three fixed columns exceeds the productive attention budget.

### 4.3 Post Creation: Progressive Disclosure Implementation

- **Default to a minimal composer.** Show only: text area, media attachment, and a single "Post options" disclosure.
- **Stage advanced options.** Hashtag picker, poll builder, content warning, and audience controls should live under a progressive disclosure layer that opens on demand.
- **Surface the identity decision first.** When a user begins composing, present an early prompt: "Post as [Name] · Anonymous · Followers only" as a single, pre-action selector. This is the highest-stakes decision and should not be buried.
- **Introduce a "first post" guided mode.** For users with zero prior posts, render a streamlined composer with contextual guidance and a "What kind of post are you making?" intent selector (Issue, Event, Question, Poll) that pre-configures the relevant fields.

### 4.4 Navbar Refinement

- **Aggregate notification badges.** If the navbar carries notification counts, use a single aggregated badge with a breakdown on hover, rather than multiple separate indicators competing for attention.
- **Maintain a maximum of five primary nav items.** The current navigation should be audited against Hick's Law: each additional item adds logarithmically to selection time.

### 4.5 Cross-Surface Action Vocabulary

- **Establish consistent action language.** "Support" is good — it is more semantically loaded than "Like" for civic content. Use it consistently. "RSVP" should be reserved exclusively for posts with event semantics, and its visual treatment should differ (calendar icon, distinct color) so users do not confuse it with endorsement.
- **Add a single primary action cue.** On a post, one action should be visually prioritized based on the post's content type. Event posts should foreground RSVP. Discussion posts should foreground comment. Opinion posts should foreground support. This reduces decision cost by removing parallel-choice ambiguity.

---

## 5. Cognitive Ergonomics Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Information Chunking (Miller's Law adherence) | 42/100 | PostCard exceeds 7±2 working memory budget; tags and badges not chunked |
| Decision Cost (Hick's Law adherence) | 38/100 | Five-plus action affordances per card; creation form presents all options simultaneously |
| Progressive Disclosure | 35/100 | Post creation front-loads advanced options; no first-time scaffolding |
| Visual Hierarchy Clarity | 55/100 | Feed layout is conventional; PostCard mixes weights inconsistently |
| Mental Model Continuity (view → act) | 50/100 | Conceptually clear path, but action vocabulary and parallel-choice layout introduce friction |
| Novice User Onboarding | 30/100 | No guided first-post flow; high abandonment risk for new student users |
| Cognitive Load Management (Sweller) | 40/100 | High extraneous load from right rail, banners, and stacked card elements |
| Action Feedback & Confirmation | 60/100 | Standard social media patterns present; RSVP confirmation flow needs verification |
| Spatial Consistency & Predictability | 65/100 | Conventional layout leverages prior expectations; some fragmentation on smaller viewports |
| Attention Resource Budgeting | 45/100 | Too many persistent attention magnets compete for a finite resource |

### Overall Composite Score: **46/100**

The platform is functionally complete and informationally rich, but it has not yet been tuned for the cognitive profile of its primary user: a student, often on mobile, often distracted, often emotionally invested in the content they are reading. The current design treats information display as the goal; the goal should be information *comprehension and action*. The recommendations above reduce surface-level complexity without removing capability — power users retain access to all current features, but the default state becomes humane.

**Primary leverage point:** The PostCard. A 30% reduction in its visual element count, combined with action-layer separation, will produce the largest single improvement in cognitive ergonomics across the platform. **Secondary leverage point:** Post creation progressive disclosure, which directly addresses first-time-user retention — the most consequential metric for a campus-voice platform.
