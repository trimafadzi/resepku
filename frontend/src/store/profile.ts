import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const KEY = "guest.profile.v1";
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export interface GuestProfile {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
}

function uid() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function readProfile(): Promise<GuestProfile | null> {
  const raw = await storage.getItem<string>(KEY, "");
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as GuestProfile;
    return p && p.id && p.nickname ? p : null;
  } catch {
    return null;
  }
}

async function writeProfile(p: GuestProfile): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(p));
}

export async function saveProfile(input: { nickname: string; avatar: string; bio?: string }): Promise<GuestProfile> {
  const existing = await readProfile();
  const profile: GuestProfile = {
    id: existing?.id ?? uid(),
    nickname: input.nickname.trim(),
    avatar: input.avatar,
    bio: (input.bio ?? "").trim(),
  };
  await writeProfile(profile);
  // Best-effort sync to backend; if it fails the local profile still works.
  try {
    await fetch(`${BACKEND_URL}/api/social/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch {
    // network errors are non-fatal — user can retry later.
  }
  return profile;
}

export function useProfile() {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const p = await readProfile();
    setProfile(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, refresh, setProfile };
}

export const AVATAR_OPTIONS = ["🍳", "🥗", "🍰", "🥘", "🍜", "🌮", "🍱", "🍲", "🥞", "🍣", "🍛", "🥑"];
