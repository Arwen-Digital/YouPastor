
# YouPastor — Product Requirements Document

## Document Info
| Field        | Value                         |
|--------------|-------------------------------|
| Version      | 1.0                           |
| Status       | Draft                         |
| Author       | Arnold Gamboa                 |
| Last Updated | 2026-04-27                    |
| Stakeholders | Engineering, Design, QA, Product, Theology Advisory |

---

## 1. Overview

### 1.1 Problem Statement
Pastors and ministry leaders face significant "prompt fatigue" when using general-purpose AI tools for sermon preparation and church communication. Existing AI chat interfaces require users to manually carry context across sessions, lack theological depth, and force pastors to act as both prompt engineer and theologian. This creates friction, produces shallow outputs, and wastes hours each week that could be spent on pastoral care.

### 1.2 Proposed Solution
YouPastor is a Desktop-first AI Workspace that transforms raw AI capabilities into guided, task-oriented workflows tailored for faith-based leaders. It acts as a Theological Research Assistant that maintains context across a pastor's entire weekly output — from sermon brainstorming to social media scheduling — through an agentic loop with human-in-the-loop approvals.

### 1.3 Goals
- Reduce sermon preparation time by 40% while improving theological depth and accuracy
- Eliminate context loss when transitioning between sermon prep, communication, and repurposing tasks
- Enable non-technical pastors to leverage advanced AI capabilities without learning prompt engineering
- Build a sustainable SaaS business with metered, credit-based billing
- Establish a foundation for denominational and stylistic customization (theological guardrails)

### 1.4 Non-Goals
- Mobile app or mobile-responsive design for MVP (desktop-first only)
- Voice-to-Text input or PDF processing in MVP (deferred to Phase 2)
- Real-time collaboration or multi-user editing in MVP
- Custom AI model training or fine-tuning in MVP
- Integration with church management software (ChMS) APIs in MVP

---

## 2. Background & Context

### 2.1 Business Context
The faith-based technology market is underserved by AI tools. While pastors increasingly adopt AI for sermon writing, they rely on generic tools (ChatGPT, Claude) that lack theological nuance, biblical languages support, and church-specific workflows. There is a strategic opportunity to own the "AI workspace for pastors" category before established players enter the niche. Solo founder context requires a lean, text-first MVP that can validate product-market fit quickly.

### 2.2 User Research / Insights
Assumptions based on founder domain expertise and observed pastoral workflows:
- Pastors spend 10–20 hours per week on sermon preparation and communication
- Most pastors are not technical and find prompt engineering intimidating
- Context switching between sermon prep, announcements, and social media is a major pain point
- Theological accuracy and denominational alignment are non-negotiable
- Budget constraints are common in smaller churches; transparent, usage-based pricing is preferred over flat subscriptions

### 2.3 Dependencies & Related Work
- OpenRouter API access and rate limits
- Convex cloud deployment and workflow limits
- Electron desktop distribution pipeline (codesigning, auto-updates)
- Stripe billing integration for credit-based metering
- Future integration with existing pastoral tools (Bible software, planning center, etc.)

---

## 3. Users & Use Cases

### 3.1 Target Users

**Primary Persona: Pastor Alex**
- Role: Lead pastor of a 200-member church
- Technical proficiency: Low-medium; uses email, social media, basic apps
- Goals: Prepare theologically rich sermons faster; communicate consistently with congregation
- Frustrations: AI tools produce generic content; loses context between tasks; doesn't understand church calendar rhythms

**Secondary Persona: Worship Leader Jordan**
- Role: Worship pastor who also writes devotionals and social content
- Technical proficiency: Medium; comfortable with productivity apps
- Goals: Repurpose Sunday content into midweek devotionals and social posts
- Frustrations: Creating content from scratch each week; maintaining voice consistency

**Tertiary Persona: Church Admin Taylor**
- Role: Administrative assistant who drafts emails and announcements
- Technical proficiency: Medium-high
- Goals: Quickly draft church communications aligned with the pastor's sermon themes
- Frustrations: Waiting for pastor input; starting emails from blank pages

### 3.2 User Stories

- As a pastor, I want to enter a sermon topic or scripture reference and receive guided brainstorming options so that I can find a compelling angle without staring at a blank page.
- As a pastor, I want the AI to perform Greek and Hebrew word studies automatically so that I can deepen my exegesis without knowing the original languages.
- As a pastor, I want to approve or redirect the AI's research direction at key decision points so that the output remains aligned with my theological framework and congregation's needs.
- As a worship leader, I want to convert a completed sermon into a small group discussion guide so that I can extend the Sunday message into midweek ministry.
- As a church admin, I want to draft a church announcement email that references this week's sermon theme so that our communications feel cohesive and intentional.
- As a pastor, I want to generate a 7-day social media calendar based on my sermon so that I can maintain a consistent online presence without starting from scratch each day.

### 3.3 Key User Flows

**Primary Flow: Sermon Preparation**
1. Pastor opens YouPastor and selects the "Sermon Prep" workspace
2. Pastor enters a scripture reference or topical seed
3. Agent loads relevant theological skills (Greek/Hebrew tools, commentary access, outline frameworks)
4. Agent presents 2–3 sermon hook/angle options and pauses for pastor selection
5. Pastor selects an angle or provides feedback
6. Agent conducts exegesis, generates outline, and presents for approval
7. Pastor approves or requests revisions
8. Completed sermon is saved and becomes available to other workspaces

**Secondary Flow: Communication Drafting**
1. Pastor or admin opens "Communication" workspace
2. System auto-loads the current week's sermon context
3. User selects communication type (email, announcement script, formal letter)
4. Agent drafts content using sermon themes and tone preferences
5. User edits and approves; draft is saved or exported

**Edge Flow: Offline Access**
1. Pastor opens YouPastor without internet connection
2. IndexedDB serves cached sermon drafts and last-known workspace state
3. Pastor can read and edit existing content
4. Upon reconnection, Convex syncs changes and resumes any pending agent workflows

**Edge Flow: Credit Exhaustion**
1. Pastor initiates a high-cost task (e.g., full exegetical deep-dive)
2. System checks credit balance
3. If insufficient credits, system displays a clear upgrade/purchase prompt
4. Pastor can purchase additional credits or switch to a lower-cost task

---

## 4. Functional Requirements

### 4.1 Workspaces
- **FR-01** [MUST] — The app MUST provide five distinct workspaces: Sermon Prep, Communication, Repurposing, Social Media, and Pastoral Rhythm.
- **FR-02** [MUST] — Each workspace MUST load contextually relevant sermon data from the current or selected sermon series automatically.
- **FR-03** [MUST] — The pastor MUST be able to switch between workspaces without losing the current sermon's context.
- **FR-04** [SHOULD] — Workspaces SHOULD display a visual indicator of the active sermon series and current week in the series.

### 4.2 Agentic AI Loop
- **FR-05** [MUST] — The AI agent MUST follow a ReAct (Reasoning + Acting) loop orchestrated by the OpenRouter Agent SDK.
- **FR-06** [MUST] — The agent MUST pause at defined approval gates and present options or questions to the pastor before proceeding.
- **FR-07** [MUST] — The agent MUST load workspace-specific skills (tools) dynamically based on the active workspace.
- **FR-08** [MUST] — The agent MUST retain context across workspaces by reading from and writing to the Convex database.
- **FR-09** [SHOULD] — The agent SHOULD support "undo" or "branch" actions at approval gates, allowing the pastor to explore multiple directions.

### 4.3 Sermon Prep Workspace
- **FR-10** [MUST] — The workspace MUST accept a scripture reference or free-text topic as input.
- **FR-11** [MUST] — The system MUST generate 2–4 sermon hook/angle options and pause for pastor selection.
- **FR-12** [MUST] — The system MUST perform automated Greek/Hebrew word studies using relevant skills/tools.
- **FR-13** [MUST] — The system MUST generate a structured sermon outline (introduction, body points, conclusion) for pastor approval.
- **FR-14** [MUST] — The pastor MUST be able to edit, save, and version sermon drafts.
- **FR-15** [SHOULD] — The system SHOULD support full sermon series planning with thematic arcs across multiple weeks.
- **FR-16** [MAY] — The system MAY integrate external commentary or theological reference materials via API.

### 4.4 Communication Workspace
- **FR-17** [MUST] — The workspace MUST support drafting church emails, announcement scripts, and formal letters.
- **FR-18** [MUST] — Generated communications MUST automatically incorporate themes and language from the active sermon draft.
- **FR-19** [MUST] — The pastor MUST be able to define tone presets (e.g., formal, warm, urgent, celebratory) per communication type.
- **FR-20** [SHOULD] — The system SHOULD maintain a communication history log per sermon series.

### 4.5 Repurposing Workspace
- **FR-21** [MUST] — The workspace MUST accept a completed sermon as input.
- **FR-22** [MUST] — The system MUST generate at minimum: small group discussion guides, blog post drafts, and YouTube/video scripts.
- **FR-23** [MUST] — Each repurposed output MUST preserve the sermon's core theological points and key scriptures.
- **FR-24** [SHOULD] — The pastor SHOULD be able to select which output formats to generate in a single run.

### 4.6 Social Media Workspace
- **FR-25** [MUST] — The workspace MUST generate a 7-day social media calendar based on the active sermon.
- **FR-26** [MUST] — Generated posts MUST vary in format (text, quote card caption, question/poll, story prompt) and platform suitability.
- **FR-27** [MUST] — The pastor MUST be able to edit, approve, or reject each post individually.
- **FR-28** [SHOULD] — The system SHOULD support scheduling metadata (suggested post times, platform tags) even if direct publishing is deferred.

### 4.7 Pastoral Rhythm Workspace
- **FR-29** [MUST] — The workspace MUST generate midweek devotionals tied to the sermon series.
- **FR-30** [MUST] — The workspace MUST support structured meeting agenda generation for church leadership meetings.
- **FR-31** [SHOULD] — Devotionals SHOULD be configurable in length (short, medium, long) and tone.

### 4.8 Billing & Credits
- **FR-32** [MUST] — The system MUST deduct credits based on task complexity using a defined cost table.
- **FR-33** [MUST] — The pastor MUST see their current credit balance and estimated cost before initiating a task.
- **FR-34** [MUST] — The system MUST integrate with Stripe for credit purchases.
- **FR-35** [MUST] — The system MUST handle credit exhaustion gracefully with clear upgrade prompts.
- **FR-36** [SHOULD] — The system SHOULD offer starter credits upon account creation.

### 4.9 Local-First & Offline
- **FR-37** [MUST] — Sermon drafts and workspace state MUST be cached in IndexedDB for instant access.
- **FR-38** [MUST] — The app MUST remain usable in read/edit mode when offline.
- **FR-39** [MUST] — Changes made offline MUST sync to Convex upon reconnection.
- **FR-40** [SHOULD] — Pending agent workflows SHOULD resume automatically upon reconnection.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Initial app load MUST complete within 3 seconds on a standard broadband connection
- Workspace switching MUST complete within 500ms
- AI agent response time (time-to-first-output) SHOULD be under 5 seconds for simple tasks and under 15 seconds for complex tasks
- IndexedDB read/write operations MUST complete within 100ms for drafts under 50KB

### 5.2 Security & Privacy
- All pastor data (sermons, communications, research) MUST be encrypted at rest and in transit
- OpenRouter API keys and Convex secrets MUST be stored securely in the Electron main process, never exposed to renderer
- User authentication MUST be implemented via Convex Auth or a secure equivalent
- Pastor content MUST NOT be used to train external AI models without explicit opt-in
- Stripe payment processing MUST comply with PCI-DSS standards

### 5.3 Accessibility
- Desktop app MUST support keyboard navigation for all core workflows
- UI text MUST meet WCAG 2.1 AA contrast ratios
- The app SHOULD be compatible with screen readers for pastors with visual impairments
- Font sizes MUST be adjustable (minimum 12px, up to 20px)

### 5.4 Scalability
- Convex backend MUST handle 1,000 concurrent users without degradation
- Database design MUST support future multi-church and team collaboration features
- Credit billing system MUST be idempotent to prevent double-charging

### 5.5 Reliability & Availability
- Core app functionality (drafting, editing, reading cached content) MUST work offline
- Convex sync MUST retry with exponential backoff on network failure
- AI agent workflows MUST be durable: if the app closes mid-task, the workflow MUST resume from the last approval gate upon reopening
- Target uptime for cloud-dependent features: 99.5%

---

## 6. UX & Design Considerations

### 6.1 Design Principles
- **Minimize friction:** Every AI interaction should feel guided, not like a blank chat box
- **Progressive disclosure:** Show simple options first; advanced controls available on demand
- **Contextual awareness:** The UI should always make it clear what sermon or series is active
- **Theological confidence:** Outputs should be presented with appropriate qualifiers and sources where applicable

### 6.2 Key UI States
- **Empty state** — When no sermon is active, display a welcoming onboarding flow with a "Start New Sermon" CTA and quick-start templates
- **Loading state** — When the agent is researching, show a progress indicator with descriptive steps (e.g., "Studying Greek root word...", "Comparing commentaries...") rather than a generic spinner
- **Error state** — When AI generation fails or hits a rate limit, display a clear message with actionable recovery steps (retry, simplify request, or contact support)
- **Success state** — When a draft is complete or approved, show a brief confirmation and prompt for the next logical action (e.g., "Sermon saved. Generate social posts?")

### 6.3 Open Design Questions
- Should the approval gates use a modal/interstitial pattern or an inline sidebar thread?
- What visual language best communicates "AI-generated but pastor-approved" to prevent congregation confusion?
- How should theological guardrails (denominational preferences) be configured — during onboarding, per workspace, or per sermon?

---

## 7. Technical Considerations

### 7.1 Architecture Notes
- **Electron (main + renderer):** Provides the desktop shell with native file system access, secure secret storage, and auto-update capabilities. The renderer process runs a React SPA.
- **React (latest version):** Powers the UI layer with a component-based architecture. State management is handled via React Context and hooks for local UI state, with Convex queries for server state.
- **Convex:** Serves as the reactive backend and database. It manages user data, sermon content, agent workflow state, and credit balances. Convex "Durable Workflows" or scheduled functions handle long-running agent tasks.
- **OpenRouter Agent SDK:** Orchestrates the ReAct loop, tool calling, and human-in-the-loop pauses. It runs within the Electron main process or a secure backend context to protect API keys.
- **IndexedDB (via a library like Dexie.js):** Caches sermon drafts, workspace state, and user preferences for local-first functionality.
- **OpenRouter Gateway:** Routes AI requests to top-tier models (e.g., Claude 3.5 Sonnet) with web search and other tool capabilities.

### 7.2 Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| **User** | id, email, name, creditBalance, createdAt | has many Sermons, has many CreditTransactions |
| **Sermon** | id, userId, title, scriptureRef, status (draft/approved), content, seriesId, createdAt, updatedAt | belongs to User, belongs to Series, has many Communications, has many SocialPosts |
| **Series** | id, userId, title, description, startDate, endDate | belongs to User, has many Sermons |
| **AgentWorkflow** | id, userId, sermonId, workspaceType, status (running/paused/completed), checkpointData, createdAt | belongs to User, belongs to Sermon |
| **Communication** | id, sermonId, type (email/announcement/letter), content, tone, status | belongs to Sermon |
| **SocialPost** | id, sermonId, platform, content, scheduledDate, status | belongs to Sermon |
| **CreditTransaction** | id, userId, amount, type (purchase/usage), description, createdAt | belongs to User |
| **TheologicalGuardrail** | id, userId, denomination, stylePrefs, customRules | belongs to User |

### 7.3 APIs & Integrations
- **OpenRouter API:** LLM inference with tool use, web search, and model routing
- **Convex API:** Database queries, mutations, reactive subscriptions, and workflow scheduling
- **Stripe API:** Credit purchases, payment intents, and billing webhooks
- **Electron Auto-Updater:** Silent updates with user notification
- **Future:** Bible API (ESV, NIV, etc.), Church Management Software APIs, Social Media publishing APIs

### 7.4 Technical Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenRouter API rate limits or downtime | Medium | High | Implement request queuing, fallback to secondary models, and clear user-facing status messages |
| Convex workflow timeouts on long agent tasks | Medium | High | Break agent loops into discrete steps using Convex scheduled functions; store checkpoint data after each step |
| Credit billing race conditions | Low | High | Use Convex transactions for atomic credit deduction; implement idempotency keys for Stripe webhooks |
| Offline sync conflicts (same doc edited on two devices) | Low | Medium | Use last-write-wins for MVP; plan operational transform or CRDT for future multi-device support |
| Electron security vulnerabilities | Medium | High | Keep Electron updated, use contextIsolation, secure secret storage in main process, Content Security Policy |
| AI generating theologically inaccurate content | Medium | High | Implement theological guardrails (user-configured), require human approval at key gates, display confidence/sourcing indicators |

---

## 8. Success Metrics

### 8.1 Primary Metrics (KPIs)
- **Weekly Active Pastors (WAP):** Target — 500 by Month 6, Baseline — 0
- **Sermons Completed per User per Month:** Target — 4, Baseline — N/A
- **Average Task Completion Rate:** Target — 80% of started agent workflows reach completion, Baseline — N/A
- **Monthly Recurring Revenue (MRR):** Target — $5,000 by Month 6, Baseline — $0
- **Credit Purchase Conversion Rate:** Target — 15% of users who exhaust starter credits make a purchase, Baseline — N/A

### 8.2 Secondary / Health Metrics
- **Time-to-First-Sermon (onboarding efficiency):** Target — under 5 minutes from signup to first draft
- **Workspace Switch Frequency:** Indicator of cross-workflow adoption
- **AI Approval Gate Interaction Rate:** Target — 90% of gates receive a user response (not abandoned)
- **Support Ticket Volume per 100 Users:** Target — under 5
- **NPS Score:** Target — 50+ by Month 6

### 8.3 How We'll Measure
- **Analytics:** Convex analytics or a lightweight event tracking system for in-app actions (workspace opens, task starts, completions, credit usage)
- **Dashboards:** Founder dashboard for WAP, MRR, credit consumption, and top task types
- **User Research:** Monthly interviews with 5–10 beta users to validate theological usefulness and workflow fit
- **Stripe Dashboard:** For revenue, churn, and purchase funnel analysis

---

## 9. Milestones & Phasing

### Phase 1 — MVP (Text-First)
**Target:** Month 1–2
- Electron shell with React UI scaffolded
- Convex backend with User, Sermon, and AgentWorkflow schemas
- Authentication (Convex Auth or Clerk)
- Sermon Prep workspace: brainstorming, outline generation, basic editing
- Communication workspace: email and announcement drafting
- OpenRouter Agent SDK integration with ReAct loop and approval gates
- IndexedDB local caching and offline read/edit
- Stripe credit purchase flow with a starter credit allocation
- Basic theological guardrails (denomination selection during onboarding)

**Explicitly Deferred:**
- Voice-to-Text input
- PDF upload and processing
- Social Media and Repurposing workspaces (UI placeholder only)
- Pastoral Rhythm workspace (UI placeholder only)
- Advanced series planning

### Phase 2 — V1 (Core Workspaces Complete)
**Target:** Month 3–4
- Social Media workspace with 7-day calendar generation
- Repurposing workspace with small group guides, blog posts, and video scripts
- Pastoral Rhythm workspace with devotionals and meeting agendas
- Greek/Hebrew word study tools via agent skills
- Improved theological guardrails with custom rule configuration
- In-app onboarding tour and help documentation
- Auto-update mechanism for Electron app

### Phase 3 — Growth
**Target:** Month 5–6
- Voice-to-Text input for sermon transcription
- PDF upload for importing existing sermon manuscripts
- Team/multi-user support for church staff collaboration
- Integration with one Bible API for scripture embedding
- Advanced analytics dashboard for users
- Referral program for credit bonuses

### Future Considerations
- Mobile companion app for reading drafts and approving agent outputs on the go
- Direct publishing integrations (Mailchimp, Substack, Facebook, Instagram)
- Church Management Software (Planning Center, Breeze, etc.) integrations
- Custom AI model fine-tuned on theological corpora
- Marketplace for third-party "Skills" (tools) built by other developers

---

## 10. Open Questions & Decisions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the exact credit cost table for each task type? | Product | Open |
| 2 | Which denominational frameworks should be included in theological guardrails v1? | Theology Advisory | Open |
| 3 | Should the app support importing existing sermon libraries (e.g., Word docs) in MVP or defer to Phase 3? | Product | Open |
| 4 | Which Bible translation API should we integrate first, and what are the licensing terms? | Engineering | Open |
| 5 | Should agent workflows run entirely client-side (via main process) or partially server-side in Convex? | Engineering | Open |

---

## 11. Appendix

### Glossary
- **ReAct Loop:** A reasoning and acting pattern where an AI model thinks through a problem, takes an action (e.g., calls a tool), observes the result, and repeats until the task is complete.
- **Agentic Workflow:** A semi-autonomous process where an AI performs tasks, makes decisions, and pauses for human approval at defined checkpoints.
- **Skill (Tool):** A specialized function the AI can invoke, such as performing a Greek word study or generating a social media caption.
- **Approval Gate:** A deliberate pause in an AI workflow where the system presents options or partial results to the user and waits for direction before continuing.
- **Local-First:** An architecture where data is primarily stored locally on the user's device, with synchronization to a cloud backend when connectivity is available.
- **Convex Durable Workflow:** A long-running, fault-tolerant process in Convex that can survive app restarts and network interruptions.

### References
- OpenRouter Agent SDK Documentation
- Convex Documentation (Schemas, Auth, Workflows)
- Electron Security Best Practices
- Stripe Billing Documentation (Metered Billing)

---

## Related

- [[Projects MOC]] — All active projects
- [[shipped-unfinished]] — Tech entrepreneurship area
- [[pastoral-ministry]] — Pastoral ministry area
- [[tech-stack]] — Technical resources and architecture decisions
- [[theology]] — Theological resources and frameworks
