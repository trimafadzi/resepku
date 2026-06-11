import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppDrawer from "@/src/components/AppDrawer";
import { settingsStore } from "@/src/store/settings";
import { colors, fonts, radius, spacing } from "@/src/theme";

const AI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Sangat Cepat & Efisien (Rekomendasi)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Teks Sangat Kreatif & Detail" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Kinerja Cepat Standar" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // States
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Muat data awal
  useEffect(() => {
    async function loadSettings() {
      try {
        const url = await settingsStore.getBaseUrl();
        const key = await settingsStore.getApiKey();
        const model = await settingsStore.getAiModel();
        setBaseUrl(url);
        setApiKey(key);
        setSelectedModel(model);
      } catch (e) {
        console.warn("Gagal memuat pengaturan:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Simpan data ke storage
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await settingsStore.setBaseUrl(baseUrl);
      await settingsStore.setApiKey(apiKey);
      await settingsStore.setAiModel(selectedModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.warn("Gagal menyimpan pengaturan:", e);
    } finally {
      setSaving(false);
    }
  };

  const resetBaseUrl = () => {
    setBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header Premium */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          testID="open-drawer-btn"
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          style={styles.menuBtn}
        >
          <Feather name="menu" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Konfigurasi Sistem</Text>
        <Text style={styles.sectionSubtitle}>
          Ubah konfigurasi API jaringan dan parameter kecerdasan buatan Gemini secara manual.
        </Text>

        {/* Form Base URL */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Alamat API Backend (Base URL)</Text>
            <Pressable onPress={resetBaseUrl} style={styles.resetBtn} hitSlop={5}>
              <Text style={styles.resetBtnText}>Reset Default</Text>
            </Pressable>
          </View>
          <TextInput
            testID="settings-base-url-input"
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="http://localhost:8000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.textInput}
          />
          <Text style={styles.inputHelp}>
            Gunakan URL ini untuk mengalihkan server API lokal maupun deployment awan kustom.
          </Text>
        </View>

        {/* Form API Key */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Kunci API Gemini (Gemini API Key)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              testID="settings-api-key-input"
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Masukkan GEMINI_API_KEY..."
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
              style={styles.passwordInput}
            />
            <Pressable
              onPress={() => setShowKey(!showKey)}
              hitSlop={10}
              style={styles.eyeBtn}
            >
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={18}
                color={colors.onSurfaceTertiary}
              />
            </Pressable>
          </View>
          <Text style={styles.inputHelp}>
            Dapatkan kunci API gratis di Google AI Studio untuk mengaktifkan generator deskripsi otomatis yang dinamis.
          </Text>
        </View>

        {/* Pilihan Model AI */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Model AI Gemini</Text>
        <Text style={styles.sectionSubtitle}>
          Pilih model LLM Google Gemini yang akan memproses teks deskripsi masakan Anda.
        </Text>

        <View style={styles.modelsContainer}>
          {AI_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <Pressable
                key={model.id}
                testID={`settings-model-option-${model.id}`}
                onPress={() => setSelectedModel(model.id)}
                style={[styles.modelCard, isSelected && styles.modelCardSelected]}
              >
                <View style={styles.modelHeader}>
                  <Text style={[styles.modelLabel, isSelected && styles.modelLabelSelected]}>
                    {model.label}
                  </Text>
                  <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                    {isSelected ? <View style={styles.radioDotInner} /> : null}
                  </View>
                </View>
                <Text style={[styles.modelDesc, isSelected && styles.modelDescSelected]}>
                  {model.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Feedback Sukses */}
        {saveSuccess ? (
          <View style={styles.successToast} testID="settings-success-toast">
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={styles.successToastText}>Pengaturan berhasil disimpan secara aman!</Text>
          </View>
        ) : null}

        {/* Action Button */}
        <Pressable
          testID="settings-save-btn"
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.85 },
            saving && { opacity: 0.6 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onBrandPrimary} />
          ) : (
            <>
              <Feather name="save" size={16} color={colors.onBrandPrimary} />
              <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Drawer */}
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="settings" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "600",
    color: colors.onSurface,
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  resetBtnText: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onBrandTertiary,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurface,
  },
  passwordContainer: {
    flexDirection: "row",
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: spacing.md,
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurface,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  inputHelp: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  modelsContainer: {
    gap: spacing.sm,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modelCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceSecondary,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modelLabel: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  modelLabelSelected: {
    color: colors.brand,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  radioDotSelected: {
    borderColor: colors.brand,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  modelDesc: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
  },
  modelDescSelected: {
    color: colors.onSurfaceSecondary,
  },
  successToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#EFF4EC",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "#D3DFCD",
  },
  successToastText: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.success,
    fontWeight: "500",
  },
  saveBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontFamily: fonts.text,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onBrandPrimary,
  },
});
