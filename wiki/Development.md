# Development

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
# Clone the repository
git clone https://github.com/sarvessveeriyah2312/SessionLens.git
cd SessionLens

# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev
```

## Build

```bash
# Build for production
npm run build

# Preview the built output
npm run start
```

## Package for Distribution

```bash
npm run dist:mac     # macOS DMG (x64 + arm64)
npm run dist:win     # Windows NSIS installer
npm run dist:linux   # Linux AppImage + .deb
npm run dist:all     # All platforms
```

## Project Structure

```
├── electron/          # Main process (Node.js / Electron)
│   ├── main.ts        # App entry, IPC, lifecycle
│   ├── SessionManager.ts
│   ├── ProcessDetector.ts
│   ├── TimelineRecorder.ts
│   ├── CostCalculator.ts
│   ├── TeamSync.ts
│   ├── database.ts
│   └── preload.ts
├── src/               # Renderer process (React)
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   ├── components/
│   └── styles/
└── resources/         # App icons
```
