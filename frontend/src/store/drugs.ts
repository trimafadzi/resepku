import { storage } from "@/src/utils/storage";
import { settingsStore } from "./settings";

const DRUGS_STORAGE_KEY = "obatku.v1";

export interface Drug {
  id: string;
  name: string;
  komposisi: string;
  dosis_aturan_pakai: string;
  kegunaan_indikasi: string;
  efek_samping: string;
  peringatan_kontradiksi: string;
  merek_dagang: string;
  createdAt: string;
}

export interface DrugInfoPayload {
  name?: string;
  komposisi: string;
  dosis_aturan_pakai: string;
  kegunaan_indikasi: string;
  efek_samping: string;
  peringatan_kontradiksi: string;
  merek_dagang: string;
  warning?: string | null;
}

export const drugsStore = {
  // --- LOCAL DATABASE HELPERS (AsyncStorage) ---
  async getDrugs(): Promise<Drug[]> {
    const list = await storage.getItem<Drug[]>(DRUGS_STORAGE_KEY, []);
    return list || [];
  },

  async saveDrug(drugData: Omit<Drug, "id" | "createdAt">): Promise<Drug> {
    const list = await this.getDrugs();
    const newDrug: Drug = {
      ...drugData,
      id: `drug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newDrug); // Taruh di baris teratas (terbaru)
    await storage.setItem(DRUGS_STORAGE_KEY, list);
    return newDrug;
  },

  async deleteDrug(id: string): Promise<boolean> {
    const list = await this.getDrugs();
    const filtered = list.filter((item) => item.id !== id);
    return storage.setItem(DRUGS_STORAGE_KEY, filtered);
  },

  // --- BACKEND API CLIENT ---
  async fetchInfo(name: string): Promise<DrugInfoPayload> {
    const baseUrl = await settingsStore.getBaseUrl();
    const apiKey = await settingsStore.getApiKey();
    const aiModel = await settingsStore.getAiModel();

    const res = await fetch(`${baseUrl}/api/drugs/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        apiKey: apiKey || undefined,
        aiModel: aiModel || undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.detail || `HTTP ${res.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data as DrugInfoPayload;
  },
};
