import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.monthly(
  "refill free user credits",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.credits.internal.refillFreeUsersMonthly
)

export default crons
