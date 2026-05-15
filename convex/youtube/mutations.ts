import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    blogId: v.optional(v.id("blogPosts")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    if (args.blogId) {
      const blog = await ctx.db.get(args.blogId)
      if (!blog || blog.userId !== userId) throw new Error("Blog post not found")
    }

    const now = Date.now()
    return await ctx.db.insert("youtubeDrafts", {
      userId,
      title: args.title.trim() || "Sermon to YouTube Package",
      content: args.content,
      blogId: args.blogId,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    youtubeId: v.id("youtubeDrafts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    blogId: v.optional(v.union(v.id("blogPosts"), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.youtubeId)
    if (!existing || existing.userId !== userId) throw new Error("YouTube draft not found")

    const patch: any = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title.trim() || "Sermon to YouTube Package"
    if (args.content !== undefined) patch.content = args.content
    if (args.blogId !== undefined) patch.blogId = args.blogId === null ? undefined : args.blogId
    if (args.status !== undefined) patch.status = args.status

    await ctx.db.patch(args.youtubeId, patch)
    return args.youtubeId
  },
})

export const remove = mutation({
  args: { youtubeId: v.id("youtubeDrafts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.youtubeId)
    if (!existing || existing.userId !== userId) throw new Error("YouTube draft not found")

    await ctx.db.delete(args.youtubeId)
    return args.youtubeId
  },
})
