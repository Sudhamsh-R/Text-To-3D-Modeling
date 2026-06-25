<<<<<<< HEAD
# Text-To-3D-Modeling
=======
# AI-Prompted 3D Modeling

Turn natural-language descriptions into interactive 3D models using a two-stage AI pipeline and real-time WebGL rendering.

**B.Tech Mini Project** — Department of Computer Science and Engineering (Data Science), GRIET Hyderabad.

## Overview

```
Text prompt → Text-to-Image API (RapidAPI) → Image-to-3D API (Meshy) → GLB → Three.js viewer
```

This repository contains the **integration layer**: a Node.js backend that securely proxies external APIs, plus a modern web frontend for prompting, progress tracking, and 3D interaction.

## Features

- Secure API key handling (server-side only, never exposed to the browser)
- Landing page and generator UI
- Step-by-step progress (image → mesh → ready)
- Interactive 3D viewer with orbit controls
- Download generated image and GLB model
- Example prompts and sample gallery
- Health check endpoint for API configuration

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- RapidAPI subscription — [AI Text to Image Generator API](https://rapidapi.com/bussinesonline250/api/ai-text-to-image-generator-api)
- Meshy API key — [meshy.ai](https://www.meshy.ai/) (paid plan required for new tasks as of 2024)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure API keys
cp .env.example .env
# Edit .env with your RapidAPI and Meshy keys

# 3. Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/app](http://localhost:3000/app) to generate models.

Development with auto-restart:

```bash
npm run dev
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`) |
| `RAPIDAPI_KEY` | RapidAPI key |
| `RAPIDAPI_HOST` | RapidAPI host (default `ai-text-to-image-generator-api.p.rapidapi.com`) |
| `RAPIDAPI_PATH` | Primary text-to-image endpoint (default `/3D`) |
| `RAPIDAPI_FALLBACK_PATHS` | Comma-separated fallback paths if primary returns 404 |
| `MESHY_API_KEY` | Meshy bearer token |

## Project structure

```
├── public/              # Static frontend
│   ├── index.html       # Landing page
│   ├── app.html         # Generator app
│   ├── css/
│   └── js/
├── server/
│   ├── index.js         # Express entry point
│   ├── routes/api.js    # REST API routes
│   └── services/        # RapidAPI & Meshy clients
├── .env.example
├── package.json
└── README.md
```

## API routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server and key configuration status |
| `POST` | `/api/text-to-image` | `{ "prompt": "..." }` → `{ "imageUrl", "endpoint" }` |
| `POST` | `/api/image-to-3d` | `{ "imageUrl": "..." }` → `{ "taskId" }` |
| `GET` | `/api/image-to-3d/:taskId` | Poll Meshy task status |

## Troubleshooting

| Issue | Likely cause |
|-------|----------------|
| `Endpoint '/3D' does not exist` | RapidAPI endpoint changed — check the RapidAPI playground and update `RAPIDAPI_PATH` |
| `NoMorePendingTasks` / 402 from Meshy | Free Meshy plan no longer supports new tasks — upgrade subscription |
| `You are not subscribed to this API` | Subscribe to the RapidAPI listing with your key |
| Blank 3D viewer | Meshy task may still be running, or CORS blocked direct browser calls (use this backend) |

## Security

- **Never commit `.env`** — it is listed in `.gitignore`
- Rotate any keys that were previously committed to version control
- Run behind HTTPS in production

## License

MIT — see [LICENSE](LICENSE).
>>>>>>> Update250626
