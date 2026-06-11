# Buku Resep — Recipe Organizer (Bahasa Indonesia)

## Overview
Editorial-feel recipe organizer (Expo / React Native) in **Bahasa Indonesia** with a built-in social feed ("Sosmed"). Local recipes + cloud-synced social posts. No accounts — guest profile is stored locally per device.

## Features
### Buku Resep (local)
- Sidebar drawer (Resep / Sosmed)
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
- **Profil dapur**: avatar, bio, stats (Posting / Pengikut / Mengikuti), post list. Own profile has settings gear + post-delete. Other dapurs show Ikuti/Mengikuti toggle.
- **Post card** shows user, timestamp ("baru saja" / "X menit lalu" / etc.), caption, recipe snapshot row

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

## MongoDB collections
- `social_users`: { id, nickname, avatar, bio, createdAt }
- `social_posts`: { id, userId, recipe {…}, caption, createdAt }
- `social_follows`: { followerId, followedId, createdAt }

## File map (new in iter 4)
- `backend/server.py` — `/api/social/*` endpoints
- `frontend/app/sosmed.tsx` — feed + tabs + share FAB + onboarding gate
- `frontend/app/sosmed/onboarding.tsx` — create/edit guest profile
- `frontend/app/sosmed/share.tsx` — share modal
- `frontend/app/sosmed/dapur/[id].tsx` — profil dapur (self/other)
- `frontend/src/components/PostCard.tsx` — shared post card
- `frontend/src/store/profile.ts` — guest profile store
- `frontend/src/store/social.ts` — API client

## Test coverage
- Backend pytest: **18/18** passing — 6 import + 12 social (users/posts/follows/feed/discover).
- Frontend e2e (Playwright @ 390×844): iter 4 — **12/12** social scenarios passing.
