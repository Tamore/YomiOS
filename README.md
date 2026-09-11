# NirmitiOS (Personal AI Operating System)

## Overview
NirmitiOS is a local, full-stack personal productivity dashboard application. It functions entirely on the local machine as a visual control center and AI-driven text environment that adapts dynamically to your life domains. It actively prevents information overload, disorganization, context loss, and decision fatigue.

## Tech Stack Breakdown
* **Framework:** Next.js (App Router, TypeScript)
* **Styling:** Tailwind CSS (Dark-mode first aesthetics, clean widget-based blocks)
* **Database Architecture:** SQLite (Local file-based system, zero cloud infrastructure)
* **ORM:** Prisma ORM for database migration and type-safe querying
* **AI Core Engine:** `@google/generative-ai` SDK using the Gemini API

## Prerequisites
* Node.js (v18 or higher)
* Gemini API Key (stored in local `.env.local` file)

## Step-by-Step Local Setup
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Create a `.env.local` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. **Database Initialization:**
   Generate the Prisma Client and run the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
4. **Seed the Database:**
   Populate the database with your initial life domains and projects:
   ```bash
   npm run seed
   ```
5. **Start the Development Server:**
   ```bash
   npm run dev
   ```

## Directory Layout Map
```text
/NirmitiOS
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── api/
│   │   └── command/      # Agentic AI Execution Loop (Gemini API)
│   ├── globals.css       # Tailwind Directives & Global Styles
│   ├── layout.tsx        # Root layout (Sidebar, Main Canvas, Terminal UI)
│   └── page.tsx          # Main Dashboard
├── prisma/               # Database Architecture
│   ├── schema.prisma     # SQLite Schema Definition
│   └── seed.ts           # DB Seed Routine
├── components/           # Reusable UI Components
├── public/               # Static Assets
├── .env.local            # Local Environment Variables
├── README.md             # Project Documentation
└── DEVELOPMENT.md        # Architectural Rationale
```
