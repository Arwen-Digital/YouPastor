#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/trigger-release-tag.local.sh         # patch (0.1.10 -> 0.1.11)
#   ./scripts/trigger-release-tag.local.sh minor   # minor (0.1.10 -> 0.2.0)
#   ./scripts/trigger-release-tag.local.sh major   # major (0.1.10 -> 1.0.0)

BUMP_TYPE="${1:-patch}"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Invalid bump type: $BUMP_TYPE"
  echo "Use: patch | minor | major"
  exit 1
fi

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes first."
  exit 1
fi

NEXT_VERSION="$(node - "$BUMP_TYPE" <<'NODE'
const fs = require('node:fs')

const bumpType = process.argv[2]
const currentVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/)

if (!match) {
  throw new Error(`Unsupported package version: ${currentVersion}`)
}

let [, major, minor, patch] = match.map(Number)
if (bumpType === 'major') {
  major += 1
  minor = 0
  patch = 0
} else if (bumpType === 'minor') {
  minor += 1
  patch = 0
} else {
  patch += 1
}

process.stdout.write(`${major}.${minor}.${patch}`)
NODE
)"

if git rev-parse --quiet --verify "refs/tags/v$NEXT_VERSION" >/dev/null; then
  echo "Tag v$NEXT_VERSION already exists."
  exit 1
fi

echo "Preparing release v$NEXT_VERSION ($BUMP_TYPE)..."
node scripts/update-release-notes.mjs "$NEXT_VERSION"

npm version "$BUMP_TYPE" --no-git-tag-version >/dev/null
ACTUAL_VERSION="$(node -p "require('./package.json').version")"
if [[ "$ACTUAL_VERSION" != "$NEXT_VERSION" ]]; then
  echo "Version mismatch: expected $NEXT_VERSION, got $ACTUAL_VERSION"
  exit 1
fi

echo "Validating release..."
npx vue-tsc --noEmit

if ! git diff --quiet -- package.json package-lock.json src/data/releases.json; then
  git add package.json package-lock.json src/data/releases.json
else
  echo "Release files were not updated. Aborting."
  exit 1
fi

git commit -m "Release v$NEXT_VERSION"
git tag -a "v$NEXT_VERSION" -m "Release v$NEXT_VERSION"

echo "Pushing commit and tag..."
git push --follow-tags

echo "Done. Tag v$NEXT_VERSION pushed; GitHub Actions release workflow should now run."
