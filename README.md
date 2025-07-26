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
- **Password-based login**: Secure authentication with session tokens stored in Cloudflare KV.
- **Session management**: Login tokens are securely stored in KV with automatic expiration (24 hours).
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

### Environment Configuration

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` to set:
- `VITE_WORKER_API_ENDPOINT`: Your Cloudflare Worker URL for sync
- `VITE_WORKER_API_KEY`: Optional API key for fallback authentication

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
- **Authentication**: Click "Login" in the header to authenticate with your password before syncing.
- **Sync**: After logging in, use the "Sync notes" button to upload local changes and download remote updates. Only notes with changes (dirty flag) are uploaded. Deleted notes are soft-deleted and synced.
- **Backend**: Cloudflare Worker with D1 database, supporting password authentication, session tokens in KV, upsert, soft delete, and incremental sync via timestamps.
- **Session Management**: Login tokens are stored in Cloudflare KV with automatic expiration and validation on each request.

## Worker Backend Setup (Optional)

To enable cloud sync, you'll need to deploy the Cloudflare Worker backend:

### Prerequisites
- Cloudflare account
- Wrangler CLI installed globally: `npm install -g wrangler`

### Setup Steps

1. **Navigate to worker directory**:
   ```bash
   cd worker/
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create KV namespace for sessions**:
   ```bash
   wrangler kv namespace create SESSIONS
   wrangler kv namespace create SESSIONS --preview
   ```

4. **Update wrangler.jsonc** with the generated KV namespace IDs and configure allowed origins:
   ```jsonc
   {
     "vars": {
       "ALLOWED_ORIGINS": "http://localhost:5173,https://your-domain.pages.dev"
     }
   }
   ```

5. **Set environment variables**:
   ```bash
   # Set your password
   wrangler secret put SECRET_KEY
   # Enter your password when prompted
   
   # Optional: Configure allowed origins for CORS (comma-separated)
   # Default is just localhost:5173 if not set
   # You can also set this in wrangler.jsonc vars section
   ```

6. **Run database migrations**:
   ```bash
   wrangler d1 execute zettelkasten --file=./schema.sql
   wrangler d1 execute zettelkasten --file=./migrations/002-timestamps.sql
   wrangler d1 execute zettelkasten --file=./migrations/003-add-deleted.sql
   ```

7. **Deploy the worker**:
   ```bash
   wrangler deploy
   ```

8. **Update frontend .env** with your worker URL:
   ```bash
   cp .env.example .env
   # Edit .env with your worker URL
   ```

### API Endpoints

- `POST /api/login` - Authenticate with password, returns session token
- `POST /api/logout` - Invalidate session token
- `GET /api/notes` - Get all notes (requires authentication)
- `POST /api/notes` - Create/update note (requires authentication)

## Keyboard Shortcuts
- **Ctrl/Cmd+K**: Open global search
- **Esc**: Close modals/search
- **Arrow keys**: Navigate search results

## License

MIT

---

> Built for speed, privacy, and knowledge work. No cloud required, but cloud sync is available if you want it.
