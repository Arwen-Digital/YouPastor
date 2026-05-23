# Production Release TODOs

## 1. Generate Windows installer

Goal: produce a proper Windows `.exe` installer for YouPastor.

Current status:

- macOS DMG builds locally.
- Windows unpacked app can be generated locally on Apple Silicon.
- Windows NSIS installer fails locally because electron-builder's Wine/NSIS tooling is x86-only and cannot run on Apple Silicon.

Recommended path:

- Research and implement a **GitHub Actions Windows runner** build.
- Use Windows runner to run:

```bash
npm ci
npx electron-builder --win
```

Expected output:

```txt
YouPastor-Windows-<version>-Setup.exe
```

Questions to answer:

- Should Windows installer be signed?
- Where should release artifacts be uploaded?
- Should GitHub Releases be the distribution source?

---

## 2. Electron auto updater

Goal: allow installed YouPastor desktop apps to update automatically.

Research needed:

- `electron-updater`
- electron-builder publish configuration
- GitHub Releases or private update server
- macOS signing/notarization requirements
- Windows code signing requirements

Implementation outline:

1. Add updater dependency/config.
2. Configure `electron-builder` publish target.
3. Add update check in `electron/main.ts`.
4. Decide UX:
   - silent download + prompt to restart
   - manual “Check for updates” button
5. Test update flow between two versions.

Important:

Auto-update generally requires properly signed production builds, especially on macOS and Windows.
