# Buku Resep — Recipe Organizer (Bahasa Indonesia)

## Overview
Editorial-feel recipe organizer (Expo / React Native) in **Bahasa Indonesia**. Recipes live in AsyncStorage on device. Backend powers the **Impor dari URL** feature only.

## Features
- **Sidebar drawer** (slide-from-left, animated): two menu items — **Resep** (home) and **Sosmed** (placeholder page). Triggered by hamburger button on Home and Sosmed. Backdrop tap closes.
- **Home feed** ("Buku Resep") with featured hero card, search-by-title-or-ingredient, sticky category filter chips, recipes grouped per category (Sarapan, Makan Siang, Makan Malam, Pencuci Mulut, Camilan).
- **Recipe detail**: edge-to-edge hero, gradient scrim, meta strip (Memasak / Porsi / Tingkat), **Mulai Mode Masak** button, **Lihat sumber resep** link (only when sourceUrl present), Bahan-bahan (bulleted), Cara membuat (numbered), favorite FAB, edit & delete (deep-link safe).
- **Cook Mode** (`/recipe/cook?id=X`): full-screen dark UI, step-by-step ("Langkah X dari N"), progress bar, prev/next, "Selesai" on last step, ingredients toggle. Screen kept awake via `expo-keep-awake` on native (gated off on web).
- **Add / Edit form** (modal): Impor dari URL panel, photo picker, judul, kategori chips, waktu masak, porsi, tingkat kesulitan chips, dynamic bahan & langkah rows. Sticky Save bar above keyboard.
- **Impor dari URL**: backend parses schema.org JSON-LD (+ OG fallback). Saves the original URL into `sourceUrl`.
- **Favorites**, **5 pre-seeded Indonesian recipes** on first launch (`recipes.v2`).

## Backend API
- `POST /api/recipes/import { url }` → `{ title, image, ingredients[], instructions[], cookTime, servings }`
  - 400 invalid URL · 422 no Recipe / OG · 502 fetch failure

## Tech stack
- Expo SDK 54, expo-router, expo-image, expo-image-picker, expo-linear-gradient, expo-haptics, expo-keep-awake, expo-linking
- react-native-reanimated (drawer animation)
- FastAPI + BeautifulSoup4 + requests
- TypeScript, React Native StyleSheet

## File map
- `backend/server.py` — FastAPI app + `/api/recipes/import`
- `frontend/app/_layout.tsx` — root Stack + SafeAreaProvider + GestureHandlerRoot
- `frontend/app/index.tsx` — Beranda (hamburger, search, chips, featured, grouped grid)
- `frontend/app/sosmed.tsx` — Halaman Sosmed (placeholder)
- `frontend/app/recipe/[id].tsx` — Detail resep + Mode Masak CTA + Lihat sumber
- `frontend/app/recipe/edit.tsx` — Tambah / Ubah resep (modal) + Impor dari URL
- `frontend/app/recipe/cook.tsx` — Mode Masak (full screen)
- `frontend/src/components/AppDrawer.tsx` — Custom slide-in sidebar
- `frontend/src/store/recipes.ts` — AsyncStorage CRUD + seeding (v2)
- `frontend/src/data/seed.ts` — 5 resep Indonesia
- `frontend/src/theme.ts` — warna, spacing, fonts, kategori, kesulitan (ID)
- `frontend/src/types.ts` — tipe `Recipe` (now with `sourceUrl?`)

## Test coverage
- Backend pytest: 6/6 passing (fixture JSON-LD, invalid URL, no-recipe, blank/missing URL).
- Frontend e2e (Playwright @ 390×844): iteration 3 — 8/8 passing (drawer + sosmed + cook mode + source URL + iter-2 smoke).
