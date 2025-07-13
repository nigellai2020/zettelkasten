# Zettelkasten

A local-first, high-performance Zettelkasten note-taking app with advanced search, markdown rendering, VS Code-style multi-tab interface, and optional cloud sync.

## Features

- **Local-first**: All notes are stored in your browser using IndexedDB for scalability and reliability.
- **Multi-tab interface**: Open, close, and switch between multiple notes like VS Code tabs.
- **Advanced search**: Lightning-fast, full-text search with tag scoping, multi-tag combo box, and result highlighting.
- **Markdown support**: Async markdown rendering with code block syntax highlighting and HTML escaping.
- **Sidebar**: Displays your 50 most recently updated notes for quick access.
- **Graph and Tree views**: Visualize your note connections and structure.
- **Keyboard shortcuts**: Quick search (Ctrl/Cmd+K), navigation, and more.
- **Responsive UI**: Built with React, Tailwind CSS, and Vite for a modern, fast experience.
- **Cloud sync (optional)**: Sync notes with a backend (Cloudflare Worker + D1) for backup and multi-device support.
- **Soft delete**: Deleted notes are tombstoned and synced, ensuring safe deletion across devices.
- **Incremental sync**: Only changed notes are uploaded/downloaded, using timestamps and a dirty flag for efficiency.
- **CORS support for multiple origins**: Securely access your backend from multiple sites.

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

### Installation

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
# or
yarn build
```

### Lint

```bash
npm run lint
# or
yarn lint
```

## Project Structure

- `src/` — Main source code
  - `components/` — UI components (NoteEditor, Sidebar, SearchModal, etc.)
  - `hooks/` — Custom React hooks (e.g., useNotes)
  - `utils/` — Utility functions (IndexedDB, markdown, search)
  - `workers/` — Web Worker for off-main-thread search
- `public/` — Static assets
- `index.html` — App entry point
- `vite.config.ts` — Vite configuration
- `worker/` — Cloudflare Worker backend (API, migrations, schema)

## Data Storage & Sync
- Notes are stored in IndexedDB for reliability and scale.
- Open tabs and active tab state are persisted in localStorage for session continuity.
- **Sync**: Use the Sync button to upload local changes and download remote updates. Only notes with changes (dirty flag) are uploaded. Deleted notes are soft-deleted and synced.
- **Backend**: Cloudflare Worker with D1 database, supporting upsert, soft delete, and incremental sync via timestamps.

## Keyboard Shortcuts
- **Ctrl/Cmd+K**: Open global search
- **Esc**: Close modals/search
- **Arrow keys**: Navigate search results

## License

MIT

---

> Built for speed, privacy, and knowledge work. No cloud required, but cloud sync is available if you want it.
