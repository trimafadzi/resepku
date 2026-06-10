# RecipeVault / Buku Resep — Recipe Organizer (Bahasa Indonesia)

## Overview
A warm, editorial-feel recipe organizer mobile app (Expo / React Native). UI fully in **Bahasa Indonesia**. Recipes live in AsyncStorage on device; the backend only handles the optional **Impor dari URL** feature.

## Features
- **Home feed** ("Buku Resep") with a featured hero card and recipes grouped per category: Sarapan, Makan Siang, Makan Malam, Pencuci Mulut, Camilan.
- **Search** by title or ingredient ("Cari judul atau bahan").
- **Category filter chips** in a sticky single-row scroller (Semua + 5 kategori).
- **Recipe detail** with edge-to-edge hero image, gradient scrim, meta strip (Memasak / Porsi / Tingkat), bulleted Bahan-bahan, numbered Cara membuat, favorite FAB, edit & delete (with `canGoBack()` deep-link safe back).
- **Add / Edit form** (modal): cover photo from gallery, judul, kategori chips, waktu masak, porsi, tingkat kesulitan chips, dynamic add/remove bahan & langkah rows. Sticky Save bar above keyboard.
- **NEW — Impor dari URL**: paste any URL to a recipe page → backend extracts schema.org JSON-LD `Recipe` (with OG image fallback) → form auto-fills with title, image, ingredients, instructions, cook time (ISO 8601 duration parsed), servings. Indonesian-language errors for invalid URL / no recipe found.
- **Favorites** — heart toggle on detail, badge on home cards.
- **5 pre-seeded Indonesian recipes** on first launch (Pancake Buttermilk, Salad Ayam Panggang, Spaghetti Pomodoro Klasik, Kue Lapis Cokelat Pekat, Trail Mix Almond Madu).
- **Persistence** via `@/src/utils/storage` (AsyncStorage on native, localStorage on web), key `recipes.v2`.

## Backend API
- `POST /api/recipes/import { url }` → `{ title, image, ingredients[], instructions[], cookTime, servings }`
  - 400 if URL malformed
  - 422 if no Recipe / OG title found
  - 502 if upstream fetch fails

## Tech stack
- Expo SDK 54, expo-router, expo-image, expo-image-picker, expo-linear-gradient, expo-haptics
- FastAPI + BeautifulSoup4 + requests (Recipe schema.org parser)
- TypeScript, React Native StyleSheet

## Design system (Editorial Mobile LIGHT)
- Palette: terracotta `#C85A32`, sage `#84937B`, cream `#FDFBF7`, oat `#F4EFE6`, deep cocoa `#2A2724`. Zero blue/purple.
- Type: serif (Georgia / serif) for display; system sans for body.
- 8-pt spacing rhythm with magazine breathing room.

## File map
- `backend/server.py` — FastAPI app + `/api/recipes/import`
- `frontend/app/_layout.tsx` — root Stack + SafeAreaProvider + GestureHandlerRoot
- `frontend/app/index.tsx` — Beranda (search, chips, featured, grouped grid)
- `frontend/app/recipe/[id].tsx` — Detail resep
- `frontend/app/recipe/edit.tsx` — Tambah / Ubah resep (modal) + Impor dari URL
- `frontend/src/store/recipes.ts` — AsyncStorage CRUD + seeding (v2)
- `frontend/src/data/seed.ts` — 5 resep Indonesia
- `frontend/src/theme.ts` — warna, spacing, fonts, kategori, kesulitan (ID)
- `frontend/src/types.ts` — tipe `Recipe`

## Test coverage
- Backend pytest: 6/6 passing (`backend/tests/test_recipes_import.py`) — fixture-served JSON-LD page, invalid URL, no-recipe page, blank/missing URL.
- Frontend e2e (Playwright @ mobile 390×844): 9/9 passing for translation + impor flow + carry-over from initial 16 CRUD scenarios.
