// Centralized user-facing strings. Every piece of visible copy lives here so
// adding i18n later only requires swapping this file.
// Format: flat keys, dot-separated for namespacing.

const s = {
  // ─── App ────────────────────────────────────────────────────────────────────
  "app.name": "StudentVoice",
  "app.tagline": "Real support for students",

  // ─── Auth ───────────────────────────────────────────────────────────────────
  "auth.login.title": "Welcome back",
  "auth.login.subtitle": "Log in to continue supporting your peers.",
  "auth.login.button": "Log In",
  "auth.login.forgot": "Forgot password?",
"auth.login.noAccount": "Don't have an account?",

  "auth.login.signupLink": "Sign Up",
  "auth.login.emailPlaceholder": "you@example.com",
  "auth.google.continue": "Continue with Google",
  "auth.signup.title": "Create your account",
  "auth.signup.subtitle": "Join your campus community today.",
  "auth.signup.studentTab": "Student",
  "auth.signup.orgTab": "Organization",
  "auth.signup.namePlaceholder.name": "Your full name",
  "auth.signup.namePlaceholder.org": "Organization / Society name",
  "auth.signup.emailPlaceholder": "you@example.com",
  "auth.signup.passwordPlaceholder": "Create a password",
  "auth.signup.orgTypeLabel": "Organization type",
  "auth.signup.orgTypePlaceholder": "Select organization type",
  "auth.signup.orgButton": "Create Organization Account",
  "auth.signup.studentButton": "Sign Up",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.signup.loginLink": "Log In",

  "auth.forgotPassword.title": "Forgot your password?",
  "auth.forgotPassword.subtitle": "Enter your email and we'll send you a link to reset your password.",
  "auth.forgotPassword.sendLink": "Send reset link",
  "auth.forgotPassword.sentTitle": "Check your email",
  "auth.forgotPassword.sentDescription": (email: string) =>
    `If an account exists for ${email}, a reset link is on its way.`,
  "auth.forgotPassword.backToLogin": "Back to Log In",

  // ─── Validation / Toasts ────────────────────────────────────────────────────
  "validation.required": "Please fill in all required fields",
  "validation.emailPassword": "Please fill in both email and password",
  "validation.emailExists": "An account with this email already exists",
  "validation.orgTypeRequired": "Please choose an organization type",
  "validation.postEmpty": "Please write something before posting",
  "validation.categoryRequired": "Please choose a category",
  "validation.regionRequired": "Please select your state",
  "validation.loginRequired": "Please log in to post",
  "validation.loginToComment": "You must be logged in to comment",
  "validation.commentEmpty": "Please write something first",
  "validation.fileType": "Only images and videos are allowed",
  "validation.fileSize": "File too large (max 50MB)",
  "validation.generic": "Something went wrong. Please try again.",

  // ─── Success toasts ─────────────────────────────────────────────────────────
  "toast.loginSuccess": "Logged in successfully",
  "toast.signupSuccess": "Account created successfully",
  "toast.postPublished": "Post published successfully",
  "toast.loggedOut": "Logged out successfully",

  // ─── Feed ───────────────────────────────────────────────────────────────────
  "feed.title": "Feed",
  "feed.subtitle.near": (state: string) => `Problems near ${state} and across India`,
  "feed.subtitle.default": "Latest problems",
  "feed.yourRegion": "Your region",
  "feed.otherRegions": "Other regions",
  "feed.empty.title": "You've seen everything for now",
  "feed.empty.description": "Come back soon — new problems from your region will show up here.",
  "feed.trending": "Trending",
  "feed.suggestedOrgs": "Suggested organizations",
  "feed.followers": (n: number) => `${n} followers`,
  "feed.supports": (n: number) => `${n} supports`,
  "feed.error.title": "Couldn't load the feed",
  "feed.error.description": "Something went wrong while loading posts. Please try again.",
  "feed.error.retry": "Retry",

  // ─── Post Detail ────────────────────────────────────────────────────────────
  "postDetail.backToFeed": "Back to feed",
  "postDetail.commentsHeading": (n: number) => `Comments (${n})`,
  "postDetail.notFound.title": "Post not found",
  "postDetail.notFound.description": "This post may have been removed, or the link is incorrect.",
  "postDetail.notFound.backToFeed": "Back to Feed",

  // ─── Create Post ────────────────────────────────────────────────────────────
  "createPost.title": "Create a post",
  "createPost.subtitle": "Share a problem you're facing so your community can help.",
  "createPost.textLabel": "What's going on?",
  "createPost.textPlaceholder":
    "Describe the issue clearly… who is affected, since when, and what kind of help would help?",
  "createPost.categoryLabel": "Category",
  "createPost.categoryPlaceholder": "Choose a category",
  "createPost.stateLabel": "State",
  "createPost.statePlaceholder": "Select state",
  "createPost.mediaHeading": "Add media (optional)",
  "createPost.submitButton": "Publish post",
  "createPost.replaceFile": "Replace file",

  // ─── Edit Post ─────────────────────────────────────────────────────────
  "editPost.title": "Edit post",
  "editPost.subtitle": "Update your post — your community will see the changes.",
  "editPost.save": "Save changes",
  "toast.postUpdated": "Post updated",

  // ─── Profile ─────────────────────────────────────────────────────────────────
  "profile.title": "Profile",
  "profile.empty.title": "No profile yet",
  "profile.empty.description": "Sign up and set your region to create your profile.",
  "profile.empty.signup": "Sign Up",
  "profile.followers": "Followers",
  "profile.following": "Following",
  "profile.yourPosts": "Your posts",
  "profile.noPosts.title": "No posts yet",
  "profile.noPosts.description": "Share a problem with your community to get started.",
  "profile.createPost": "Create a post",

  // ─── Edit Profile / Settings ────────────────────────────────────────────
  "settings.title": "Edit profile",
  "settings.avatar.label": "Profile photo",
  "settings.avatar.change": "Change photo",
  "settings.avatar.remove": "Remove photo",
  "settings.avatar.uploadFailed": "Could not upload your photo.",
  "settings.avatar.tooLarge": (mb: number) => `Avatar must be under ${mb}MB`,
  "settings.nameLabel": "Display name",
  "settings.namePlaceholder": "Your full name",
  "settings.usernameLabel": "Username",
  "settings.usernamePlaceholder": "@yourusername",
  "settings.usernameHint": "Used to tag you. Letters, numbers, and underscores only.",
  "settings.bioLabel": "About me",
  "settings.bioPlaceholder": "Tell people a little about yourself…",
  "settings.regionLabel": "State",
  "settings.regionHint": "Your state helps surface local problems.",
  "settings.save": "Save changes",
  "settings.saving": "Saving…",
  "settings.cancel": "Cancel",
  "toast.profileUpdated": "Profile updated",
  "validation.usernameInvalid": "Username can only contain letters, numbers, and underscores.",
  "validation.nameRequired": "Please enter your name",

  // ─── Search ─────────────────────────────────────────────────────────────────
  "search.title": "Search",
  "search.recent": "Recent searches",
  "search.clearRecent": "Clear",
  "search.empty": "No results found",
  "search.placeholder": "Search posts, organizations…",

  // ─── Notifications ──────────────────────────────────────────────────────────
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all as read",
  "notifications.unread": (n: number) => `${n} unread`,
  "notifications.caughtUp": "You're all caught up",
  "notifications.empty.title": "No notifications yet",
  "notifications.empty.description":
    "When students support your posts or comment on them, you'll see it here.",
  "notifications.today": "Today",
  "notifications.thisWeek": "This week",
  "notifications.earlier": "Earlier",

  // ─── Onboarding / Region ────────────────────────────────────────────────────
  "onboarding.region.title": "Where are you studying?",
  "onboarding.region.description":
    "We'll show you problems from your region so support stays local. You can change this later.",
  "onboarding.region.stateLabel": "State",
  "onboarding.region.statePlaceholder": "Select your state",
  "onboarding.region.continue": "Continue to Feed",

  // ─── Comment ────────────────────────────────────────────────────────────────
  "comment.placeholder": "Write a comment…",
  "comment.placeholderLoggedOut": "Log in to comment",
  "comment.postButton": "Post comment",
  "comment.empty": "No comments yet. Start the conversation.",
  "comment.offeringHelp": "Offering Help",

  // ─── Support / Follow ───────────────────────────────────────────────────────
  "support.button.support": "Support this post",
  "support.button.remove": "Remove support",
  "follow.button.follow": "Follow",
  "follow.button.following": "Following",

  // ─── PostCard labels ────────────────────────────────────────────────────────
  "post.authorType.org": "Organization",
  "post.authorType.student": "Student",
  "post.unknownName": "Unknown",
  "post.viewPost": "View post",
  "post.unknownAuthor": "Someone",
  "post.edit": "Edit post",
  "post.delete": "Delete post",
  "post.deleteConfirm.title": "Delete this post?",
  "post.deleteConfirm.description": "This will permanently remove the post and its comments. This can't be undone.",
  "post.deleteConfirm.cancel": "Cancel",
  "post.deleteConfirm.delete": "Delete",
  "post.deleteSuccess": "Post deleted",
  "post.menuLabel": "Post actions",
  "search.organizationsHeading": "Organizations",
  "search.postsHeading": "Posts",
  "notification.unreadLabel": "Unread notification",
  "notifications.group.today": "Today",
  "notifications.group.thisWeek": "This week",
  "notifications.group.earlier": "Earlier",

  // ─── Notification types ─────────────────────────────────────────────────────
  "notification.type.support": "supported your post",
  "notification.type.comment": "commented on your post",
  "notification.type.follow": "started following you",
  "notification.type.offer_help": "offered help on your post",
  "notification.type.verification_approved": "your organization verification was approved.",

  // ─── Modal ──────────────────────────────────────────────────────────────────
  "modal.close": "Close",
  "modal.closeDialog": "Close dialog",

  // ─── Media ──────────────────────────────────────────────────────────────────
  "media.alt": "Post media",
  "media.uploader.label": "Media uploader",
  "media.uploader.dragDrop": "Drag & drop or tap to select",
  "media.uploader.formats": (max: number) => `Photos or videos · max ${max}MB`,
  "media.uploader.remove": "Remove media",

  // ─── Password ───────────────────────────────────────────────────────────────
  "password.show": "Show password",
  "password.hide": "Hide password",

  // ─── Misc ───────────────────────────────────────────────────────────────────
  "nav.feed": "Feed",
  "nav.search": "Search",
  "nav.create": "Create",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.logout": "Log out",
  "dismissNotification": "Dismiss notification",
  "hero.builtForIndia": "Built for students of India",
  "hero.title": "Your voice, heard & supported —",
  "hero.titleHighlight": "region by region",
  "hero.subtitle":
    "StudentVoice helps students and student organizations post the problems that matter on campus, and get real support from the people closest to them. No noise — just genuine help where you live.",
  "hero.demoPost.title": "Mira V.",
  "hero.demoPost.location": "Mumbai, Maharashtra",
  "hero.demoPost.body":
    "Hostel A's water supply hasn't come for three days now. We've emailed the warden twice and marked it in the complaint register, but nothing. If you're facing the same on this block, say it here so we can take this together.",
  "hero.demoPost.support": (n: number) => `${n} Support`,
  "hero.demoCard.states": "All 36 states active today",
  "hero.cta.createAccount": "Create your account",
  "hero.cta.login": "Log In",
  "hero.features.region.title": "State by state",
  "hero.features.region.text":
    "Problems are anchored to your state so support comes from the people closest to you.",
  "hero.features.post.title": "Post problems",
  "hero.features.post.text":
    "Students and student organizations can share real issues — from campus facilities to fees and transport.",
  "hero.features.support.title": "Get real support",
  "hero.features.support.text":
    "The community — and relevant organizations — step in to help, upvote, and act.",
} as const

export default s
