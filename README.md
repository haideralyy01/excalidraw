<div align="center">
  <img src="apps/web/app/favicon.ico" alt="Excalidraw Logo" width="100" />

  # Excalidraw

  All-in-one real-time collaborative drawing board with smooth zoom and pan

  [![Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/haideralyy01/excalidraw)
  [![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)
  [![Node](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

</div>

---

**Note:** This repository is owned by haideralyy01. If you maintain a personal profile README (for example, `haideralyy01`), please pin a link to this project and add the short blurb in [docs/profile_readme_snippet.md](docs/profile_readme_snippet.md) so visitors can find the project quickly.


## Overview

Excalidraw is a full-stack real-time collaborative drawing board built inside a Turborepo monorepo with pnpm workspaces. Users can sign up, create or join collaborative rooms, draw shapes (rectangles, circles, diamonds, arrows, lines, and freehand), undo/redo edits locally, pan and zoom smoothly, and collaborate in real-time. Canvas actions are broadcast via a WebSocket server and stored in a PostgreSQL database for persistence.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Local Setup](#local-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [NPM Scripts](#npm-scripts)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)
- [Project Docs](#project-docs)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Module | Description |
|--------|-------------|
| Shared Rooms | Authenticated users can create or join rooms using a shared Room slug |
| Canvas Drawing | Draw rectangles, diamonds, circles, straight lines, arrows, and freehand cursor tools |
| Real-time Sync | Shape creation, updates (moving/resizing), and deletions are synchronized across users via WebSockets |
| Smooth Zoom & Pan | Damped visual zoom centering on the mouse cursor or screen center, and smooth pan camera controls |
| History | Local undo/redo stacks for editing shapes before committing or broadcasting them |
| Active Presence | Shows active user counts on the Share button badge and lists online users inside the dialog |
| Authentication | Sign up and Log in using email/password with secure JWT tokens |
| Canvas Persistence | Replays shape modification history from the PostgreSQL database when joining a room |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS, rough.js (hand-drawn rendering) |
| Backend | Node.js (TypeScript), Express 5 (HTTP API), ws (WebSocket Server), Prisma Client, bcrypt, JWT |
| Database | PostgreSQL |
| Package Manager | pnpm (with workspaces) |
| Tooling | Turborepo, ESLint, Prettier |

---

## Quick Start

If you already have PostgreSQL running and your environment variables set up, this is the fastest path:

```bash
git clone https://github.com/haideralyy01/excalidraw.git
cd excalidraw

# Install dependencies for the monorepo
pnpm install

# Start development servers (frontend + backends)
pnpm dev
```

Open frontend at `http://localhost:3000`.

---

## Local Setup

### Prerequisites

- Node.js >= 18
- pnpm package manager
- PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/haideralyy01/excalidraw.git
cd excalidraw

pnpm install
```

### 2. Configure environment variables

**HTTP Backend** — copy and fill in `apps/http-backend/.env`:

```env
PORT=8000
JWT_SECRET=your_jwt_secret_minimum_32_characters
DATABASE_URL="postgresql://username:password@localhost:5432/excalidraw?schema=public"
```

**WebSocket Backend** — copy and fill in `apps/ws-backend/.env`:

```env
PORT=8080
JWT_SECRET=your_jwt_secret_minimum_32_characters
```

**Frontend** — copy and fill in `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### 3. Run migrations and dev servers

```bash
# Push database schema
pnpm --filter=@repo/db prisma db push

# Start all workspaces in dev mode
pnpm dev
```

Next.js Web Frontend runs at `http://localhost:3000`, Express API at `http://localhost:8000`, and WS server at `ws://localhost:8080`.

---

## Environment Variables Reference

### HTTP Backend (`apps/http-backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Yes | HTTP API port |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret |

### WebSocket Backend (`apps/ws-backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Yes | WebSocket port |
| `JWT_SECRET` | Yes | JWT verification secret |

### Frontend (`apps/web/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for REST API |
| `NEXT_PUBLIC_WS_URL` | Yes | Socket server URL |

---

## Project Structure

```
Excalidraw/
├── apps/
│   ├── web/                    # Next.js frontend application
│   ├── http-backend/           # Express REST API
│   └── ws-backend/             # WebSocket sync and presence server
├── packages/
│   ├── common/                 # Zod validation schemas
│   ├── db/                     # Prisma Client schema and setup
│   ├── ui/                     # Shared UI library (Canvas, Navbar, ShareDialog)
│   ├── typescript-config/      # Shared tsconfig configurations
│   ├── eslint-config/          # Shared lint configurations
│   ├── styles/                 # Shared styles configurations
│   └── backend-common/         # Shared JWT config configurations
├── package.json                # Root package config
├── turbo.json                  # Turborepo task settings
└── pnpm-workspace.yaml         # Monorepo workspaces definition
```

---

## API Routes

| Prefix | Routes |
|--------|--------|
| `/api/v1/signup` | `POST` Create a new user account |
| `/api/v1/login` | `POST` Log in and retrieve JWT token |
| `/api/v1/room` | `POST` Create a new room (Requires Authorization header) |
| `/api/v1/room/:slug` | `GET` Retrieve room metadata and database ID |
| `/api/v1/chats/:roomId` | `GET` Retrieve shape action history for the room |

---

## NPM Scripts

### Monorepo Root Scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm dev` | `turbo run dev` | Run all applications concurrently in development mode |
| `pnpm build` | `turbo run build` | Build all applications and packages |
| `pnpm check-types` | `turbo run check-types` | Run type checks across all packages |
| `pnpm format` | `prettier --write` | Format source code |

### Frontend Scripts (`apps/web/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm run dev` | `next dev` | Start development server |
| `pnpm run build` | `next build` | Production build |
| `pnpm run start` | `next start` | Start production build server |
| `pnpm run lint` | `eslint` | Lint frontend source |
| `pnpm run check-types` | `next typegen && tsc --noEmit` | Type check frontend codebase |

### HTTP Backend Scripts (`apps/http-backend/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm run build` | `tsc -b` | Build backend source |
| `pnpm run start` | `node ./dist/index.js` | Start production build |
| `pnpm run dev` | `npm run build && npm run start` | Build and run development server |

### WebSocket Backend Scripts (`apps/ws-backend/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm run build` | `tsc -b` | Build backend source |
| `pnpm run start` | `node ./dist/index.js` | Start production build |
| `pnpm run dev` | `npm run build && npm run start` | Build and run development server |

---

## Running Tests

Type checks can be run across all workspace packages:

```bash
pnpm check-types
```

---

## Troubleshooting

### Redirect Loop / Transition Failures in ShareDialog
- If room creation fails (e.g. room name already exists) or errors out, the dialog is designed **not** to redirect you to the room page or show the active session layout. You can correct the room name and try again.

### Wobbling Canvas Zoom
- Make sure you are using the latest `Canvas` component, which calculates camera zoom-focal points based on visual cameras to eliminate coordinate drift.

### Prerendering static generation bails out at /auth
- In Next.js, `useSearchParams()` must be wrapped in a `<Suspense>` boundary. Ensure `<Suspense>` wraps your auth page components.

---

## Project Docs

- See `walkthrough.md` for a comprehensive list of implementation details on smooth zoom/pan camera animations, presence count badges, and room creation fixes.

---

## Contributing

External contributions are currently by approval. Open a discussion or issue first.

---

## License

All Rights Reserved. Proprietary software. Unauthorized copying, distribution, or use is strictly prohibited.

---

<div align="center">
  Made by <a href="https://github.com/haideralyy01">Haider Ali</a>
</div>
