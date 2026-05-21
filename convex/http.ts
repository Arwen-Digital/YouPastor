import { httpRouter } from "convex/server"
import { auth } from "./auth"
import { lemonsqueezyWebhook } from "./billing/http"

const http = httpRouter()

auth.addHttpRoutes(http)
http.route({
  path: "/lemonsqueezy/webhook",
  method: "POST",
  handler: lemonsqueezyWebhook,
})

export default http
