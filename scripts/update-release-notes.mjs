#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"

const version = process.argv[2]
const releaseFile = path.resolve("src/data/releases.json")

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/update-release-notes.mjs <version>")
  process.exit(1)
}

const releases = JSON.parse(fs.readFileSync(releaseFile, "utf8"))
if (!Array.isArray(releases)) {
  throw new Error("src/data/releases.json must contain an array")
}

if (releases.some((release) => release.version === version)) {
  throw new Error(`Release ${version} already exists in src/data/releases.json`)
}

const rl = readline.createInterface({ input, output })
const lines = rl[Symbol.asyncIterator]()

async function ask(prompt) {
  output.write(prompt)
  const result = await lines.next()
  return result.done ? "" : result.value
}

try {
  const title = (await ask(`Release title for v${version}: `)).trim()
  if (!title) throw new Error("A release title is required")

  console.log("Enter user-facing changes, one per line. Press Enter on an empty line when finished.")
  const changes = []
  while (true) {
    const change = (await ask("- ")).trim()
    if (!change) break
    changes.push(change)
  }

  if (!changes.length) throw new Error("At least one release change is required")

  releases.unshift({
    version,
    date: new Date().toISOString().slice(0, 10),
    title,
    changes,
  })

  fs.writeFileSync(releaseFile, `${JSON.stringify(releases, null, 2)}\n`)
  console.log(`Updated ${releaseFile} for v${version}`)
} finally {
  rl.close()
}
