import { mutation } from "../_generated/server"
import { v } from "convex/values"

export const seedAll = mutation({
  args: {
    skillsData: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        category: v.string(),
        description: v.string(),
        promptContent: v.string(),
        hasPdfOutput: v.boolean(),
        frequency: v.optional(v.string()),
      })
    ),
    referencesData: v.optional(
      v.array(
        v.object({
          skillSlug: v.string(),
          name: v.string(),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    for (const skill of args.skillsData) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_slug", (q) => q.eq("slug", skill.slug))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, skill)
      } else {
        await ctx.db.insert("skills", skill)
      }
    }

    if (args.referencesData) {
      for (const ref of args.referencesData) {
        const existing = await ctx.db
          .query("skillReferences")
          .withIndex("by_skill", (q) => q.eq("skillSlug", ref.skillSlug))
          .filter((q) => q.eq(q.field("name"), ref.name))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, { content: ref.content })
        } else {
          await ctx.db.insert("skillReferences", ref)
        }
      }
    }

    return { skillsSeeded: args.skillsData.length, referencesSeeded: args.referencesData?.length ?? 0 }
  },
})
