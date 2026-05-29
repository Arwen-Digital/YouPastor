import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const upsertBrevoContact = mutation({
  args: {
    email: v.string(),
    listId: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("brevoContacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        listId: args.listId,
        syncedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("brevoContacts", {
      userId,
      email: args.email,
      listId: args.listId,
      syncedAt: Date.now(),
    })
  },
})

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const sermons = await ctx.db
      .query("sermons")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    for (const sermon of sermons) {
      const communications = await ctx.db
        .query("communications")
        .withIndex("by_sermon", (q) => q.eq("sermonId", sermon._id))
        .collect()
      for (const row of communications) await ctx.db.delete(row._id)

      const socialPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_sermon", (q) => q.eq("sermonId", sermon._id))
        .collect()
      for (const row of socialPosts) await ctx.db.delete(row._id)
    }

    const userTables: string[] = [
      "brevoContacts",
      "churchProfiles",
      "aiUsage",
      "creditLedger",
      "subscriptions",
      "series",
      "seriesWeeks",
      "researchNotes",
      "brainstormBriefs",
      "meetingAgendas",
      "devotionals",
      "blogPosts",
      "youtubeDrafts",
      "smallGroupGuides",
      "churchSocialPosts",
      "socialMediaCalendars",
      "churchEmails",
      "announcementScripts",
      "churchLetters",
      "agentWorkflows",
      "creditTransactions",
      "theologicalGuardrails",
      "voucherRedemptions",
    ]

    for (const table of userTables) {
      const rows = await (ctx.db as any)
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect()
      for (const row of rows) {
        await ctx.db.delete(row._id)
      }
    }

    for (const sermon of sermons) {
      await ctx.db.delete(sermon._id)
    }

    const accounts = await ctx.db.query("authAccounts").collect()
    for (const account of accounts) {
      if ((account as any).userId === userId) await ctx.db.delete(account._id)
    }

    const sessions = await ctx.db.query("authSessions").collect()
    for (const session of sessions) {
      if ((session as any).userId === userId) await ctx.db.delete(session._id)
    }

    await ctx.db.delete(userId)

    return { ok: true }
  },
})

export const deleteAllAccountsAndUsers = mutation({
  args: {},
  handler: async (ctx) => {
  const accounts = await ctx.db.query("authAccounts").collect()
  for (const account of accounts) {
    await ctx.db.delete(account._id)
  }

  const sessions = await ctx.db.query("authSessions").collect()
  for (const session of sessions) {
    await ctx.db.delete(session._id)
  }

  const users = await ctx.db.query("users").collect()
  for (const user of users) {
    await ctx.db.delete(user._id)
  }

  const profiles = await ctx.db.query("churchProfiles").collect()
  for (const profile of profiles) {
    await ctx.db.delete(profile._id)
  }

  const aiUsage = await ctx.db.query("aiUsage").collect()
  for (const entry of aiUsage) {
    await ctx.db.delete(entry._id)
  }

  const creditLedger = await ctx.db.query("creditLedger").collect()
  for (const entry of creditLedger) {
    await ctx.db.delete(entry._id)
  }

    return {
      deleted: {
        accounts: accounts.length,
        sessions: sessions.length,
        users: users.length,
        profiles: profiles.length,
        aiUsage: aiUsage.length,
        creditLedger: creditLedger.length,
      },
    }
  },
})