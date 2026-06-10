# RecipeVault — Recipe Organizer

## Overview
A warm, editorial-feel recipe organizer mobile app (Expo / React Native). Add, browse, search and favorite home recipes. Fully offline — recipes live in AsyncStorage on device.

## Features (MVP shipped)
- **Home feed** with a featured hero card and recipes grouped under Breakfast / Lunch / Dinner / Dessert / Snack sections.
- **Search bar** that filters by recipe title OR any ingredient.
- **Category filter chips** (All + 5 categories) in a sticky, single-row horizontal scroller.
- **Recipe detail screen** with edge-to-edge hero image, gradient scrim, meta strip (cook time / servings / difficulty), bulleted ingredients, numbered instructions, favorite FAB, edit & delete.
- **Add / Edit form** (modal): cover photo picker (gallery), title, category chips, cook time, servings, difficulty chips, dynamic add/remove ingredient and instruction rows. Sticky Save bar above the keyboard.
- **Favorites** — heart icon on detail, badge on home cards.
- **5 pre-seeded sample recipes** on first launch.
- **Persistence** via `@/src/utils/storage` (AsyncStorage on native, localStorage on web).

## Tech stack
- Expo SDK 54, expo-router (typed routes), expo-image, expo-image-picker, expo-linear-gradient, expo-haptics
- TypeScript, React Native StyleSheet
- AsyncStorage via shared `@/src/utils/storage` helper

## Design system (Editorial Mobile LIGHT)
- Palette: terracotta `#C85A32`, sage `#84937B`, cream `#FDFBF7`, oat `#F4EFE6`, deep cocoa `#2A2724`. Zero blue/purple.
- Type: serif (Georgia / serif) for display; system sans for body.
- 8-pt spacing rhythm with generous magazine breathing room.

## Storage shape
Key `recipes.v1` → `Recipe[]` JSON-stringified.
```ts
Recipe = { id, title, category, ingredients[], instructions[], image, cookTime, servings, difficulty, favorite, createdAt }
```

## File map
- `app/_layout.tsx` — root Stack + SafeAreaProvider + GestureHandlerRoot
- `app/index.tsx` — Home (search, chips, featured, grouped grid)
- `app/recipe/[id].tsx` — Recipe detail
- `app/recipe/edit.tsx` — Add / Edit modal
- `src/store/recipes.ts` — AsyncStorage CRUD + seeding
- `src/data/seed.ts` — 5 sample recipes
- `src/theme.ts` — colors, spacing, radius, fonts, category list
- `src/types.ts` — `Recipe` type
