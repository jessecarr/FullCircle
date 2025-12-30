# Firearm Forms Management Application

A modern web application built with Next.js 16, React 19, TypeScript, and Supabase for managing firearm-related forms including special orders, transfers, and suppressor approvals.

## Features

- **Special Order Forms** - Track customer special orders for firearms
- **Inbound Firearm Transfers** - Record incoming firearm transfers
- **Suppressor Approvals** - Manage NFA suppressor approval process
- **Outbound Firearm Transfers** - Track outgoing firearm transfers
- **Fastbound Integration** - Webhook support for Fastbound API
- **Responsive Design** - Works on desktop and mobile devices
- **Real-time Updates** - Instant data persistence with Supabase

## Quick Start Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the template and add your credentials:

```bash
cp env.template .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
FASTBOUND_API_KEY=your_fastbound_api_key
FASTBOUND_API_URL=https://api.fastbound.com
```

### 3. Set Up Supabase Database

See [SETUP.md](./SETUP.md) for detailed database setup instructions.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Form Handling:** React Hook Form
- **Icons:** Lucide React

## Documentation

- [Setup Guide](./SETUP.md) - Complete setup and database configuration
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

## Deployment

Deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Remember to add all environment variables in your Vercel project settings.

## License

This project is provided as-is for your use.
