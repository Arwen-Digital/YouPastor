import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,

  // Church foundation profile — set once per user, used by all skills
  churchProfiles: defineTable({
    userId: v.id("users"),
    churchName: v.optional(v.string()),
    pastorName: v.optional(v.string()),
    denomination: v.optional(v.string()),
    averageAttendance: v.optional(v.string()),
    location: v.optional(v.string()),
    bibleTranslation: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    creditBalance: v.number(),
  })
    .index("by_user", ["userId"]),

  // Skill definitions — loaded from skills/ directory
  skills: defineTable({
    slug: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.string(),
    promptContent: v.string(),
    hasPdfOutput: v.boolean(),
    frequency: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // Reference documents used by skills
  skillReferences: defineTable({
    skillSlug: v.string(),
    name: v.string(),
    content: v.string(),
  })
    .index("by_skill", ["skillSlug"]),

  sermons: defineTable({
    userId: v.id("users"),
    title: v.string(),
    scriptureRef: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("archived")
    ),
    content: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_series", ["seriesId"]),

  // Sermon series — saved from the Series Planner skill
  series: defineTable({
    userId: v.id("users"),
    title: v.string(),
    tagline: v.optional(v.string()),
    scopeAssessment: v.optional(v.string()),
    seriesArc: v.optional(v.string()),
    durationCheck: v.optional(v.string()),
    specialAttention: v.optional(v.string()),
    launchRecommendation: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Individual weeks within a series
  seriesWeeks: defineTable({
    seriesId: v.id("series"),
    userId: v.id("users"),
    weekNumber: v.number(),
    sermonTitle: v.optional(v.string()),
    scriptureRef: v.optional(v.string()),
    bigIdea: v.optional(v.string()),
    connectiveThread: v.optional(v.string()),
  })
    .index("by_series", ["seriesId"])
    .index("by_user", ["userId"]),

  // Sermon research notes — saved from the Sermon Research skill
  // Entire research output is stored as a single Markdown blob in `content`.
  researchNotes: defineTable({
    userId: v.id("users"),
    scriptureRef: v.string(),
    topicOrAngle: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_series", ["seriesId"]),

  // Brainstorm session briefs — saved from the Sermon Brainstorm skill
  brainstormBriefs: defineTable({
    userId: v.id("users"),
    passage: v.string(),
    bigIdea: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_series", ["seriesId"]),

  // Meeting agendas — saved from the Meeting Agenda skill
  meetingAgendas: defineTable({
    userId: v.id("users"),
    meetingType: v.string(),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Midweek devotionals — saved from the Midweek Devotional skill
  devotionals: defineTable({
    userId: v.id("users"),
    scriptureRef: v.string(),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Blog posts — saved from the Sermon to Blog skill
  blogPosts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    sermonId: v.optional(v.id("sermons")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_sermon", ["sermonId"]),

  // YouTube packages — saved from the Sermon to YouTube skill
  youtubeDrafts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    blogId: v.optional(v.id("blogPosts")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_blog", ["blogId"]),

  // Small group guides — saved from the Small Group Questions skill
  smallGroupGuides: defineTable({
    userId: v.id("users"),
    title: v.string(),
    sermonId: v.optional(v.id("sermons")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_sermon", ["sermonId"]),

  // Church social posts — saved from the Church Social Post skill
  churchSocialPosts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  agentWorkflows: defineTable({
    userId: v.id("users"),
    sermonId: v.optional(v.id("sermons")),
    workspaceType: v.string(),
    skillSlug: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed")
    ),
    checkpointData: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  communications: defineTable({
    sermonId: v.id("sermons"),
    type: v.union(
      v.literal("email"),
      v.literal("announcement"),
      v.literal("letter")
    ),
    content: v.optional(v.string()),
    tone: v.optional(v.string()),
    status: v.optional(v.string()),
  })
    .index("by_sermon", ["sermonId"]),

  socialPosts: defineTable({
    sermonId: v.id("sermons"),
    platform: v.string(),
    content: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    status: v.optional(v.string()),
  })
    .index("by_sermon", ["sermonId"]),

  creditTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("purchase"), v.literal("usage")),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  theologicalGuardrails: defineTable({
    userId: v.id("users"),
    denomination: v.optional(v.string()),
    stylePrefs: v.optional(v.string()),
    customRules: v.optional(v.string()),
  })
    .index("by_user", ["userId"]),
})
