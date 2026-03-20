# Versioning and Releases

SessionLens uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning. Every push to `main` is analyzed and a new version is published automatically when releasable commits are detected.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Release Type | Example |
|--------|-------------|---------|
| `fix:` | Patch `1.0.x` | `fix: resolve session loading error` |
| `feat:` | Minor `1.x.0` | `feat: add export to CSV feature` |
| `feat!:` or `BREAKING CHANGE:` | Major `x.0.0` | `feat!: redesign data storage layer` |
| `chore:`, `docs:`, `style:` | No release | `docs: update installation guide` |

## CI/CD Pipeline

On every push to `main`, GitHub Actions:

1. Runs `electron-vite build`
2. Packages for macOS (DMG), Windows (NSIS), and Linux (AppImage + .deb)
3. Runs `semantic-release` to determine the version bump
4. Publishes a new GitHub Release with all build artifacts attached

## Changelog

Full version history is available on the [GitHub Releases page](https://github.com/sarvessveeriyah2312/SessionLens/releases).
