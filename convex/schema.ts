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
    .index("by_series", ["seriesId"]),

  series: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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
