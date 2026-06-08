# YouPastor

YouPastor is an AI-assisted workspace for pastors. It helps with sermon preparation, content repurposing, church communications, social media planning, and pastoral rhythm tools while keeping the pastor as the final authority.

The app is built as a Vue/Electron desktop application backed by Convex and OpenRouter-powered AI model roles.

> YouPastor is designed to assist pastors, not replace pastoral judgment, prayer, study, or care.

## Website

Visit **[youpastor.com](https://youpastor.com)** to learn more about YouPastor, download the latest desktop app, and see how it can support sermon preparation, church communication, and weekly pastoral workflows.

If you are a pastor looking for a practical AI assistant for ministry work, start at **[https://youpastor.com](https://youpastor.com)**.

## Features

- **Sermon Prep**
  - Sermon Series Planner
  - Sermon Research
  - Sermon Brainstorm
  - Sermon creation workflow

- **Content Repurposing**
  - Sermon to Blog
  - Sermon to YouTube package
  - Small Group Questions

- **Social Media**
  - Church Social Post
  - Social Media Calendar

- **Written Communication**
  - Church Email
  - Announcement Script
  - Church Letter

- **Pastoral Rhythm**
  - Midweek Devotional
  - Meeting Agenda

- **Notebook**
  - Save generated series, research, brainstorms, devotionals, social calendars, emails, letters, and other outputs
  - Revisit saved content by pastoral workflow category

- **Desktop App**
  - Electron-based Mac and Windows app
  - GitHub Releases based installer distribution
  - In-app update notification flow

## Tech Stack

- **Frontend:** Vue 3, TypeScript, Vite
- **Desktop:** Electron, electron-builder
- **State:** Pinia
- **Backend:** Convex
- **Auth:** `@convex-dev/auth`
- **AI:** OpenRouter
- **Styling:** Tailwind CSS, shadcn/ui-style components
- **Release:** GitHub Actions, GitHub Releases

## Project Structure

```text
src/
  components/      Shared Vue components and save modals
  composables/     Reusable Vue composition functions
  layouts/         App shell and navigation
  lib/             AI providers, skill loading, extractors, Convex client
  pages/           Route-level pages
  router/          Vue Router setup
  stores/          Pinia stores

convex/
  ai/              Backend AI actions
  profile/         Church profile CRUD
  series/          Sermon series data
  research/        Research notes
  brainstorm/      Brainstorm briefs
  users/           User queries/actions
  schema.ts        Convex database schema

electron/
  main.ts          Electron main process
  preload.ts       Preload bridge

skills/
  foundation/      Church context foundation skill
  sermon-prep/     Sermon prep prompts
  sermon-repurposing/
  social-media/
  written-communication/
  pastoral-rhythm/

.github/workflows/
  build-installers.yml
```

## AI Model Roles

YouPastor uses model roles instead of hardcoding a single model everywhere.

- **Orchestrator**
  - Handles intake conversations and clarification questions.
  - Env: `AI_MODEL_ORCHESTRATOR` or `VITE_AI_MODEL_ORCHESTRATOR`

- **Generator**
  - Produces final deliverables such as blog posts, emails, social posts, devotionals, agendas, and other non-research outputs.
  - Env: `AI_MODEL_GENERATOR` or `VITE_AI_MODEL_GENERATOR`

- **Researcher**
  - Used for research-heavy workflows such as sermon research and brainstorm generation.
  - Env: `AI_MODEL_RESEARCHER` or `VITE_AI_MODEL_RESEARCHER`

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Convex account/project
- OpenRouter API key

### Install dependencies

```bash
npm install
```

### Environment variables

Create a local environment file such as `.env.local`.

```env
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
VITE_AI_MODEL_ORCHESTRATOR=google/gemini-3.1-flash-lite
VITE_AI_MODEL_GENERATOR=google/gemini-3.1-flash-lite
VITE_AI_MODEL_RESEARCHER=perplexity/sonar
VITE_OPENROUTER_API_KEY=sk-or-...
```

Backend Convex environment variables are configured in Convex, not committed to the repository. Common backend variables include:

```env
OPENROUTER_API_KEY=sk-or-...
AI_MODEL_ORCHESTRATOR=google/gemini-3.1-flash-lite
AI_MODEL_GENERATOR=google/gemini-3.1-flash-lite
AI_MODEL_RESEARCHER=perplexity/sonar
BREVO_API_KEY=...
```

Depending on which features you use, you may also need auth, billing, and desktop release secrets configured outside the repository.

### Run the app

```bash
npm run dev
```

### Run Convex locally

```bash
npm run convex:dev
```

### Seed skills

```bash
npm run seed:skills
```

or:

```bash
npm run seed:load
```

## Building

### Web and desktop build

```bash
npm run build
```

This runs type checking, builds the Vite frontend, builds Electron files, and invokes `electron-builder`.

### Type checking only

```bash
npx vue-tsc --noEmit
```

## Security and Secrets

Do not commit API keys, signing certificates, app-specific passwords, Convex deployment secrets, billing secrets, or provider credentials.

Production secrets should live in:

- Convex environment variables
- GitHub Actions secrets
- Local `.env.*` files ignored by Git

## Contributing

Contributions are welcome.

Before opening a pull request:

1. Open an issue for large changes.
2. Keep changes focused and surgical.
3. Preserve the pastoral assistant posture of the app.
4. Run type checking before submitting:

```bash
npx vue-tsc --noEmit
```

Guidelines:

- The pastor is always the final authority.
- Skill prompts should assist, not replace pastoral discernment.
- Avoid speculative abstractions.
- Do not add AI-based extraction where deterministic extraction is simpler and already works.
- Keep secrets out of the repository.

## Roadmap Ideas

- Improved updater reliability and diagnostics
- More pastoral skill packs
- Team/church account support
- Additional AI provider options
- Richer Notebook organization
- Better export and print workflows

## License

YouPastor is released under the GNU Affero General Public License v3.0.

See [`LICENSE`](LICENSE) for details.
