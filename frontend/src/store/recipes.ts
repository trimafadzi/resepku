import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

import { SEED_RECIPES } from "../data/seed";
import { Recipe } from "../types";

const RECIPES_KEY = "recipes.v3";
const SEED_FLAG_KEY = "recipes.seeded.v3";

async function readAll(): Promise<Recipe[]> {
  const raw = await storage.getItem<string>(RECIPES_KEY, "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Recipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: Recipe[]): Promise<void> {
  await storage.setItem(RECIPES_KEY, JSON.stringify(list));
}

export async function ensureSeeded(): Promise<Recipe[]> {
  const seeded = await storage.getItem<boolean>(SEED_FLAG_KEY, false);
  if (seeded) {
    return readAll();
  }
  await writeAll(SEED_RECIPES);
  await storage.setItem(SEED_FLAG_KEY, true);
  return SEED_RECIPES;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await ensureSeeded();
    // newest first
    setRecipes([...list].sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recipes, loading, refresh };
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const list = await readAll();
  return list.find((r) => r.id === id) ?? null;
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const list = await readAll();
  const idx = list.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) {
    list[idx] = recipe;
  } else {
    list.unshift(recipe);
  }
  await writeAll(list);
}

export async function deleteRecipe(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((r) => r.id !== id));
}

export async function toggleFavorite(id: string): Promise<Recipe | null> {
  const list = await readAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], favorite: !list[idx].favorite };
  await writeAll(list);
  return list[idx];
}
