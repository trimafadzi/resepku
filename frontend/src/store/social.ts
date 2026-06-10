const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export interface SocialUser {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface RecipeSnapshot {
  title: string;
  image: string | null;
  category: string;
  cookTime: number;
  servings: number;
  difficulty: string;
}

export interface Post {
  id: string;
  userId: string;
  user: SocialUser;
  recipe: RecipeSnapshot;
  caption: string;
  createdAt: string;
}

export interface ProfileStats {
  user: SocialUser;
  posts: number;
  followers: number;
  following: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail || `HTTP ${res.status}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const social = {
  feed: (userId: string) => call<Post[]>(`/api/social/feed?userId=${encodeURIComponent(userId)}`),
  discover: (userId?: string) =>
    call<Post[]>(`/api/social/discover${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),
  profile: (userId: string) => call<ProfileStats>(`/api/social/users/${encodeURIComponent(userId)}`),
  userPosts: (userId: string) =>
    call<Post[]>(`/api/social/users/${encodeURIComponent(userId)}/posts`),
  createPost: (payload: { userId: string; caption: string; recipe: RecipeSnapshot }) =>
    call<Post>("/api/social/posts", { method: "POST", body: JSON.stringify(payload) }),
  deletePost: (postId: string, userId: string) =>
    call<{ ok: boolean }>(`/api/social/posts/${postId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  follow: (followerId: string, followedId: string) =>
    call<{ following: boolean }>("/api/social/follows", {
      method: "POST",
      body: JSON.stringify({ followerId, followedId }),
    }),
  unfollow: (followerId: string, followedId: string) =>
    call<{ following: boolean }>(
      `/api/social/follows?followerId=${encodeURIComponent(followerId)}&followedId=${encodeURIComponent(followedId)}`,
      { method: "DELETE" }
    ),
  checkFollow: (followerId: string, followedId: string) =>
    call<{ following: boolean }>(
      `/api/social/follows/check?followerId=${encodeURIComponent(followerId)}&followedId=${encodeURIComponent(followedId)}`
    ),
};
