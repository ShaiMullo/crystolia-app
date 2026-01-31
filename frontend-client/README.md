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

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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
