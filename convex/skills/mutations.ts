import { mutation } from "../_generated/server"
import { v } from "convex/values"

export const upsert = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.string(),
    promptContent: v.string(),
    hasPdfOutput: v.boolean(),
    frequency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        category: args.category,
        description: args.description,
        promptContent: args.promptContent,
        hasPdfOutput: args.hasPdfOutput,
        frequency: args.frequency,
      })
      return existing._id
    }

    return await ctx.db.insert("skills", {
      slug: args.slug,
      name: args.name,
      category: args.category,
      description: args.description,
      promptContent: args.promptContent,
      hasPdfOutput: args.hasPdfOutput,
      frequency: args.frequency,
    })
  },
})

export const upsertReference = mutation({
  args: {
    skillSlug: v.string(),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("skillReferences")
      .withIndex("by_skill", (q) => q.eq("skillSlug", args.skillSlug))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
      })
      return existing._id
    }

    return await ctx.db.insert("skillReferences", {
      skillSlug: args.skillSlug,
      name: args.name,
      content: args.content,
    })
  },
})
