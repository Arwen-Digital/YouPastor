import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills")

const SKILL_META = [
  { slug: "pastor-foundation", category: "foundation", dirPath: "foundation/pastor-foundation", frequency: "once" },
  { slug: "sermon-research", category: "sermon-prep", dirPath: "sermon-prep/sermon-research", frequency: "Weekly" },
  { slug: "sermon-brainstorm", category: "sermon-prep", dirPath: "sermon-prep/sermon-brainstorm", frequency: "Weekly" },
  { slug: "sermon-series", category: "sermon-prep", dirPath: "sermon-prep/sermon-series", frequency: "Monthly" },
  { slug: "church-email", category: "written-communication", dirPath: "written-communication/church-email", frequency: "Weekly" },
  { slug: "announcement-script", category: "written-communication", dirPath: "written-communication/announcement-script", frequency: "Weekly" },
  { slug: "church-letter", category: "written-communication", dirPath: "written-communication/church-letter", frequency: "As needed" },
  { slug: "small-group-questions", category: "sermon-repurposing", dirPath: "sermon-repurposing/small-group-questions", frequency: "Weekly" },
  { slug: "sermon-to-blog", category: "sermon-repurposing", dirPath: "sermon-repurposing/sermon-to-blog", frequency: "Weekly" },
  { slug: "sermon-to-youtube", category: "sermon-repurposing", dirPath: "sermon-repurposing/sermon-to-youtube", frequency: "Weekly" },
  { slug: "church-social-post", category: "social-media", dirPath: "social-media/church-social-post", frequency: "3-5x/week" },
  { slug: "social-media-calendar", category: "social-media", dirPath: "social-media/social-media-calendar", frequency: "Weekly" },
  { slug: "midweek-devotional", category: "pastoral-rhythm", dirPath: "pastoral-rhythm/midweek-devotional", frequency: "Weekly" },
  { slug: "meeting-agenda", category: "pastoral-rhythm", dirPath: "pastoral-rhythm/meeting-agenda", frequency: "Weekly" },
]

function findReferences(skillDir) {
  const refsDir = path.join(skillDir, "references")
  if (!fs.existsSync(refsDir)) return []
  return fs
    .readdirSync(refsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      name: f.replace(/\.md$/, ""),
      content: fs.readFileSync(path.join(refsDir, f), "utf-8"),
    }))
}

function loadSkills() {
  const skills = []
  const references = []

  for (const meta of SKILL_META) {
    const skillDir = path.join(SKILLS_DIR, meta.dirPath)
    if (!fs.existsSync(skillDir)) {
      console.warn(`  Skipping ${meta.slug}: ${skillDir} not found`)
      continue
    }

    const skillMdPath = path.join(skillDir, "SKILL.md")
    if (!fs.existsSync(skillMdPath)) {
      console.warn(`  Skipping ${meta.slug}: SKILL.md not found in ${skillDir}`)
      continue
    }

    const promptContent = fs.readFileSync(skillMdPath, "utf-8")
    const hasPdfOutput = fs.existsSync(path.join(skillDir, "generate-pdf.py"))

    const lines = promptContent.split("\n")
    let description = ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("```")) {
        description = trimmed
        break
      }
    }

    skills.push({
      slug: meta.slug,
      name: meta.slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      category: meta.category,
      description: description || `${meta.slug} skill`,
      promptContent,
      hasPdfOutput,
      frequency: meta.frequency,
    })

    const refs = findReferences(skillDir)
    for (const ref of refs) {
      references.push({
        skillSlug: meta.slug,
        name: ref.name,
        content: ref.content,
      })
    }
  }

  return { skills, references }
}

function main() {
  console.log("Loading skills from skills/ directory...\n")
  const { skills, references } = loadSkills()

  console.log(`Found ${skills.length} skills:`)
  for (const s of skills) {
    console.log(`  - ${s.slug} (${s.category})${s.hasPdfOutput ? " [PDF]" : ""}`)
  }

  if (references.length > 0) {
    console.log(`\nFound ${references.length} reference documents:`)
    for (const r of references) {
      console.log(`  - ${r.skillSlug}/${r.name}`)
    }
  }

  const outputPath = path.join(PROJECT_ROOT, "scripts", "seed-data.json")
  fs.writeFileSync(outputPath, JSON.stringify({ skills, references }, null, 2))
  console.log(`\nSeed data written to scripts/seed-data.json`)
}

main()
