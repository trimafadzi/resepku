import { storage } from "@/src/utils/storage";

const BASE_URL_KEY = "settings.baseUrl";
const API_KEY_KEY = "settings.apiKey";
const AI_MODEL_KEY = "settings.aiModel";
const SIDEBAR_PREFS_KEY = "settings.sidebarPrefs";

const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface SidebarMenuPrefs {
  dashboard: boolean;
  resep: boolean;
  sosmed: boolean;
  obatku: boolean;
}

const DEFAULT_PREFS: SidebarMenuPrefs = {
  dashboard: true,
  resep: true,
  sosmed: true,
  obatku: true,
};

export const settingsStore = {
  async getBaseUrl(): Promise<string> {
    const val = await storage.getItem(BASE_URL_KEY, DEFAULT_BASE_URL);
    return val || DEFAULT_BASE_URL;
  },
  async setBaseUrl(url: string): Promise<boolean> {
    const trimmed = url.trim().replace(/\/+$/, ""); // Hapus trailing slash
    return storage.setItem(BASE_URL_KEY, trimmed);
  },

  async getApiKey(): Promise<string> {
    const val = await storage.secureGet(API_KEY_KEY, "");
    return val || "";
  },
  async setApiKey(key: string): Promise<boolean> {
    return storage.secureSet(API_KEY_KEY, key.trim());
  },

  async getAiModel(): Promise<string> {
    const val = await storage.getItem(AI_MODEL_KEY, DEFAULT_MODEL);
    return val || DEFAULT_MODEL;
  },
  async setAiModel(model: string): Promise<boolean> {
    return storage.setItem(AI_MODEL_KEY, model.trim());
  },

  // --- SIDEBAR PREFERENCES ---
  async getSidebarPrefs(): Promise<SidebarMenuPrefs> {
    const val = await storage.getItem<SidebarMenuPrefs>(SIDEBAR_PREFS_KEY, DEFAULT_PREFS);
    return { ...DEFAULT_PREFS, ...val };
  },
  async setSidebarPrefs(prefs: Partial<SidebarMenuPrefs>): Promise<boolean> {
    const current = await this.getSidebarPrefs();
    const updated = { ...current, ...prefs };
    return storage.setItem(SIDEBAR_PREFS_KEY, updated);
  },
};
