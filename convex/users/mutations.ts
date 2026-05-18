import { mutation } from "../_generated/server"

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