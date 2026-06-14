# Buku Resep — Recipe Organizer (Bahasa Indonesia)

## Overview
Editorial-feel recipe organizer (Expo / React Native) in **Bahasa Indonesia** with a built-in social feed ("Sosmed") and personal medicine cabinet ("Obatku"). Local recipes/medicines + cloud-synced social posts. No accounts — guest profile is stored locally per device.

## Features
### Buku Resep (local)
- Sidebar drawer (Resep / Sosmed / Obatku / Pengaturan)
- Home feed with featured hero, search by title/ingredient, category filter chips, recipes grouped per category (Sarapan, Makan Siang, Makan Malam, Pencuci Mulut, Camilan)
- Recipe detail (hero, meta strip, **Mulai Mode Masak**, **Lihat sumber resep**, bahan + cara membuat, favorite, edit, delete)
- **Cook Mode** full-screen step-by-step + keep-awake on native
- Add/Edit form: Impor dari URL, photo picker, kategori chips, cook time, porsi, tingkat kesulitan, dynamic bahan/langkah rows, **Publik/Privat toggle**, sticky Save
- 5 pre-seeded Indonesian recipes (all public, key `recipes.v3`)

### Sosmed (cloud, no auth)
- **Guest profile** (nickname + emoji avatar + bio) stored in AsyncStorage under `guest.profile.v1`, mirrored to backend on save
- **Onboarding gate**: first visit to /sosmed prompts profile setup
- **Feed tab**: own posts + followed dapurs, newest first
- **Jelajah tab**: discover posts from other dapurs
- **Share modal**: pick from public recipes only → caption → publish (recipe snapshot frozen on post)
  - **Collage Maker**: attach up to 4 food photos. Multiple photos are automatically merged into a collage image dynamically on post creation (horizontal layout for 2 photos, 2x2 grid for 3-4 photos).
  - **AI Caption Generator**: auto-generate creative blogger-style captions in Bahasa Indonesia under 280 characters based on recipe details using Gemini API, with a fallback to randomized Indonesian caption templates if Gemini is unavailable.
- **Profil dapur**: avatar, bio, stats (Posting / Pengikut / Mengikuti), post list. Own profile has settings gear + post-delete. Other dapurs show Ikuti/Mengikuti toggle.
- **Post card** shows user, timestamp ("baru saja" / "X menit lalu" / etc.), caption, recipe snapshot row

### Obatku (local + AI info)
- **Daftar Obat Pribadi**: track personal active or reference medicines list stored locally in AsyncStorage under `obatku.v1`.
- **Pencarian Medis Otomatis (AI & Offline)**: search drug details automatically by name.
  - Queries local offline pharmaceutical database (`backend/data/indonesian_drugs.json`) first with exact matching or fuzzy match threshold (0.8 cutoff).
  - Fallbacks to Gemini API (e.g. `gemini-2.5-flash`) if an API key is provided to generate formatted structured medical details.
  - Fallbacks to a static warning message and blank fields if no database match and no API key is available.
  - **Spelling Verification & Auto-Correction**: returns closest matched drug name with a warning banner indicating the corrected term if a minor typo is entered.
  - Form fields include: **Komposisi**, **Dosis & Aturan Pakai**, **Kegunaan & Indikasi**, **Efek Samping**, **Peringatan & Kontraindikasi**, **Merek Dagang**.
  - Users can save searched drug details to their list or fill/edit details manually.

### Pengaturan (local)
- **Konfigurasi API & AI**: customize network backend Base URL, personal Gemini API Key, and select Gemini model (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`) saved locally in `settingsStore`.

## Backend API
- `POST /api/recipes/import` — parse schema.org JSON-LD
- `POST /api/social/users` — upsert guest profile
- `GET /api/social/users/{id}` — profile + stats
- `GET /api/social/users/{id}/posts` — user's posts
- `POST /api/social/posts` — create post (recipe snapshot)
- `DELETE /api/social/posts/{id}?userId=X` — owner only
- `GET /api/social/feed?userId=X` — own + followed
- `GET /api/social/discover?userId=X` — others, newest
- `POST /api/social/follows` — follow (idempotent)
- `DELETE /api/social/follows?followerId=&followedId=` — unfollow
- `GET /api/social/follows/check?followerId=&followedId=` — boolean
- `POST /api/social/collage` — create JPG collage of selected base64 images (supports single or grid layout)
- `POST /api/social/generate-caption` — generate AI caption or random template fallback (Bahasa Indonesia)
- `POST /api/drugs/info` — fetch drug information from offline dataset or Gemini API (Komposisi, Dosis, Indikasi, etc.)
- `GET /api/mock-recipe-html` — serve mock HTML containing recipe schema for import tests

## MongoDB collections
- `social_users`: { id, nickname, avatar, bio, createdAt }
- `social_posts`: { id, userId, recipe {…}, caption, createdAt }
- `social_follows`: { followerId, followedId, createdAt }

## File map (updated in iter 5)
- `backend/server.py` — FastAPI endpoints
- `backend/data/indonesian_drugs.json` — offline Indonesian pharmaceutical dataset
- `frontend/app/sosmed.tsx` — feed + discover tabs + share FAB + onboarding gate
- `frontend/app/sosmed/onboarding.tsx` — create/edit guest profile
- `frontend/app/sosmed/share.tsx` — share modal (handles collage selection, camera/gallery, and AI caption button)
- `frontend/app/sosmed/dapur/[id].tsx` — profil dapur (self/other)
- `frontend/app/obatku.tsx` — Obatku list and auto search / manual form screen
- `frontend/app/settings.tsx` — API URL, Gemini Key, and AI model settings screen
- `frontend/src/components/PostCard.tsx` — shared post card (with testID fixing)
- `frontend/src/store/profile.ts` — guest profile store
- `frontend/src/store/social.ts` — social API client
- `frontend/src/store/drugs.ts` — local medicine list store + API client
- `frontend/src/store/settings.ts` — local client settings store

## Test coverage
- Backend pytest: **25/25** passing — 6 import + 19 social & enhancements (users, posts, follows, feed, discover, collage, caption, drugs).
- Frontend e2e (Playwright @ 390×844): iter 4 — **12/12** social scenarios passing.

