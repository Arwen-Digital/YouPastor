# AGENTS.md — YouPastor

Behavioral guidelines for AI agents working on the YouPastor codebase. Merge of Karpathy-inspired coding principles with project-specific conventions.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks (typos, obvious one-liners), use judgment — not every change needs full rigor.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Project Conventions

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + TypeScript + Vite |
| State | Pinia stores (`src/stores/`) |
| Styling | Tailwind CSS + shadcn/ui (`src/components/ui/`) |
| Backend | Convex (convex/) — queries, mutations, actions |
| AI | OpenRouter API (`src/lib/ai/openrouter.ts`) |
| Auth | @convex-dev/auth |
| Desktop | Electron (electron-builder) |

### Architecture

```
src/
  pages/            → Route-level Vue components
  components/       → Shared components (SkillChat, Save*Modal, ui/)
  composables/      → Reusable composition functions (useAI, useSave*)
  layouts/          → AppLayout (3-section nav)
  stores/           → Pinia stores (auth, workspace)
  lib/
    ai/             → Provider abstraction (factory, openrouter, mock, ollama)
    extract*.ts     → Conversation output extractors (series, research, brainstorm)
    skills.ts       → SKILL.md loader + prompt builder
    convex.ts       → Convex client singleton
  router/           → Vue Router (hash history, auth guards)

convex/
  schema.ts         → All table definitions
  profile/          → Church profile CRUD
  series/           → Series + seriesWeeks queries/mutations
  research/         → Research notes CRUD + getBySeriesId
  brainstorm/       → Brainstorm briefs CRUD + getBySeriesId
  skills/           → Skill seeding
  users/            → User queries

skills/             → SKILL.md prompt files per skill
  foundation/       → Pastor foundation (church context)
  sermon-prep/      → Series Planner, Research, Brainstorm
  sermon-repurposing/ → Blog, YouTube, Small Group
  social-media/     → Social Post, Calendar
  written-communication/ → Email, Announcement, Letter
  pastoral-rhythm/  → Devotional, Meeting Agenda
```

### Naming Conventions

- **Pages**: PascalCase with `Page` suffix (`NotebookPage.vue`, `ResearchPage.vue`)
- **Components**: PascalCase (`SkillChat.vue`, `SaveSeriesModal.vue`)
- **Composables**: camelCase with `use` prefix (`useAI.ts`, `useSaveResearch.ts`)
- **Convex modules**: kebab-case directory per domain (`series/`, `research/`, `brainstorm/`)
- **Routes**: kebab-case (`/notebook/research/:researchId`)

### Key Patterns

**Convex Subscriptions (realtime):**
```typescript
const client = getConvexClient()
const unsub = client.onUpdate('series/queries:getWithWeeks', { seriesId }, (data) => {
  seriesDetail.value = data
})
// Clean up in onUnmounted or watch cleanup
onUnmounted(() => { unsub?.() })
```

**Save to Notebook Flow:**
1. Composable (`useSaveSeries`, `useSaveResearch`, `useSaveBrainstorm`) collects preview data from conversation
2. Modal (`SaveSeriesModal`, `SaveResearchModal`, `SaveBrainstormModal`) lets user edit/review before saving
3. Convex mutation creates the record → router redirects to detail page

**AI Role Switching (Research skill):**
1. Orchestrator (Gemini Flash) runs intake conversation
2. `RESEARCH_READY:` marker detected in assistant message
3. `handoffToResearcher()` switches role → `perplexity/sonar` model with full skill prompt
4. Citations extracted from Perplexity response and displayed below chat

**Church Context Injection:**
- `buildContextBlock(context)` injects church profile fields into system prompts
- Prevents AI from asking for church name, pastor name, etc. again

### Database Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `churchProfiles` | Church foundation profile | `by_user` |
| `series` | Sermon series plans | `by_user` |
| `seriesWeeks` | Weeks within a series | `by_series`, `by_user` |
| `researchNotes` | Saved research output | `by_user`, `by_series` |
| `brainstormBriefs` | Saved brainstorm briefs | `by_user`, `by_series` |
| `sermons` | Sermon records | `by_user`, `by_series` |
| `skills` | Skill definitions (seeded) | `by_slug`, `by_category` |
| `skillReferences` | Reference docs per skill | `by_skill` |

### Environment Variables

```env
VITE_CONVEX_URL=https://your-instance.convex.cloud
VITE_AI_MODEL_ORCHESTRATOR=google/gemini-3.1-flash-lite
VITE_AI_MODEL_GENERATOR=google/gemini-3.1-flash-lite
VITE_AI_MODEL_RESEARCHER=perplexity/sonar
VITE_OPENROUTER_API_KEY=sk-or-...
```

---

## 6. Guardrails

### Skill Conversation Extraction

- Research notes and brainstorm briefs save as a single `content` markdown blob — not structured fields
- Extraction uses pattern matching on conversation headers (`extractResearch.ts`, `extractBrainstorm.ts`)
- Do NOT add AI-based extraction for research/brainstorm saves — the direct approach is simpler and more reliable

### Persona & Tone

- YouPastor is a tool *for* pastors, not a replacement. Skills guide and assist; the pastor is always the authority
- SKILL.md files define each skill's personality, structure, and guardrails
- Church context (denomination, attendance, Bible translation) should be injected, not re-asked

### Navigation Structure

Left nav is organized into 3 sections matching pastoral workflow:
- **Sermon Prep**: Series Planner, Sermon Research, Sermon Brainstorm
- **Content**: Blog, YouTube, Small Group, Social Post, Social Calendar, Email, Announcement, Letter
- **Pastoral**: Midweek Devotional, Meeting Agenda

Notebook has 3 corresponding tabs: Prep, Content, Pastoral

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.