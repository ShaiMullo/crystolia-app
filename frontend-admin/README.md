# 🌻 Crystolia Frontend

**Next.js 16 Application** | Multi-language Business Website

## Overview

This is the frontend application for Crystolia - a premium sunflower oil brand. Built with Next.js 16, featuring:

- 🌐 **Multi-language Support** - English, Hebrew (RTL), Russian
- 📱 **Responsive Design** - Mobile-first approach
- 📞 **WhatsApp Integration** - Direct customer contact
- 📝 **Contact Form** - Lead capture with PostgreSQL

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.5 | React Framework |
| React | 19.2.0 | UI Library |
| TypeScript | 5.x | Type Safety |
| TailwindCSS | 4.x | Styling |
| PostgreSQL | 16.x | Database |

## Project Structure

```
frontend/
├── app/
│   ├── [locale]/          # Dynamic language routes
│   ├── api/               # API routes (send-lead)
│   └── components/        # React components
├── i18n/
│   ├── dictionaries/      # Translation files (en, he, ru)
│   └── config.ts          # i18n configuration
├── public/                # Static assets
└── middleware.ts          # Locale routing
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Copy `.env.example` to `.env.local` (gitignored) and adjust for your machine:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
BACKEND_URL=http://localhost:4000
JWT_SECRET=dev-secret-for-local-testing   # must match backend/.env
```

`BACKEND_URL` is the rewrite target used by `next.config.ts` to proxy
`/api/*` to the backend. In Docker compose it is set to `http://backend:4000`;
for `npm run dev` it defaults to `http://localhost:4000`.

`JWT_SECRET` is consumed by `middleware.ts` (Edge) to verify the auth cookie
before allowing access to `/admin/*` and `/agent/*`. It MUST match the
backend `JWT_SECRET` or every authenticated route redirects back to `/login`.

## Local dev (with local backend)

```bash
# 1. Backend (in another terminal)
cd ../backend && npm run dev      # http://localhost:4000

# 2. Frontend admin
npm install
cp .env.example .env.local        # only the first time
npm run dev                       # http://localhost:3000
```

If the rewrite target changes (e.g. you edit `.env.local`), restart `next dev`
and clear the Next cache:

```bash
pkill -f "next dev"
rm -rf .next
npm run dev
```

## Components

| Component | Description |
|-----------|-------------|
| Hero | Landing section with CTA |
| Features | Product benefits |
| Products | Product showcase (5L, 10L, 20L) |
| About | Company information |
| Contact | Lead capture form |
| Header/Footer | Navigation |

## Deployment

Deployed on **Vercel** - automatically deploys from `main` branch.
