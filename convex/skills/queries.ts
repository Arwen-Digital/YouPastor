import { query } from "../_generated/server"
import { v } from "convex/values"

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("skills").collect()
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})

export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect()
  },
})

export const getReferences = query({
  args: { skillSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skillReferences")
      .withIndex("by_skill", (q) => q.eq("skillSlug", args.skillSlug))
      .collect()
  },
})

export const getFoundation = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", "pastor-foundation"))
      .first()
  },
})
