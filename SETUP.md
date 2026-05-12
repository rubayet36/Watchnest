# 🎬 WatchNest — Setup Guide

## Step 1: Install Dependencies

After creating the Next.js project, run:
```bash
cd "w:\Movie App\watchnest"
npm install @supabase/supabase-js @supabase/ssr framer-motion @tanstack/react-query lucide-react date-fns react-hot-toast react-intersection-observer
```

---

## Step 2: Get Your API Keys

### 2a. TMDB API Key (Free)
1. Go to [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup) and create a free account
2. Go to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
3. Request an API key (choose "Developer" → fill the form)
4. Copy your **API Key (v3 auth)**

### 2b. Supabase Project
1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in
2. Click **New Project** → fill in name "watchnest", choose a region
3. Go to **Project Settings → API**
4. Copy your **Project URL** and **anon/public key**

---

## Step 3: Set Up Environment Variables

Create a file called `.env.local` in `w:\Movie App\watchnest\` with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_TMDB_API_KEY=your-tmdb-key-here
NEXT_PUBLIC_TMDB_BASE_URL=https://api.themoviedb.org/3
NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
```

---

## Step 4: Set Up Supabase Database

1. In your Supabase dashboard → go to **SQL Editor**
2. Click **New Query**
3. Open the file `w:\Movie App\watchnest\supabase\schema.sql`
4. Paste the entire contents and click **Run**

✅ This creates all tables, security policies, and auto-profile triggers.

---

## Step 5: Enable Google Auth in Supabase

1. In Supabase → **Authentication → Providers**
2. Find **Google** → toggle it ON
3. You need a Google OAuth Client:
   - Go to [https://console.cloud.google.com](https://console.cloud.google.com)
   - Create a project → **APIs & Services → Credentials**
   - Create **OAuth 2.0 Client ID** (Web application)
   - Add Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Paste the **Client ID** and **Client Secret** into Supabase
5. Save

---

## Step 6: Run Locally

```bash
cd "w:\Movie App\watchnest"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Step 7: Deploy to Vercel

```bash
npm install -g vercel
vercel --cwd "w:\Movie App\watchnest"
```

Or push to GitHub and import the project at [https://vercel.com/new](https://vercel.com/new).

**Add all `.env.local` variables to Vercel → Project → Settings → Environment Variables**

After deploying, update your Supabase Auth settings:
- **Authentication → URL Configuration → Site URL**: `https://your-app.vercel.app`
- Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**

---

## ✅ You're Live!

Share the Vercel URL with your friends and start adding movies to the nest! 🪺🎬
