import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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

import { getRecipeById, saveRecipe } from "@/src/store/recipes";
import {
  CATEGORIES,
  Category,
  DIFFICULTIES,
  Difficulty,
  colors,
  fonts,
  radius,
  spacing,
} from "@/src/theme";
import { Recipe } from "@/src/types";

function uid() {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

interface ImportedPayload {
  title: string;
  image: string | null;
  ingredients: string[];
  instructions: string[];
  cookTime: number | null;
  servings: number | null;
}

export default function EditRecipe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Makan Malam");
  const [difficulty, setDifficulty] = useState<Difficulty>("Mudah");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Import-from-URL state
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBanner, setImportBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await getRecipeById(id);
      if (!r) return;
      setTitle(r.title);
      setCategory(r.category);
      setDifficulty(r.difficulty);
      setCookTime(String(r.cookTime));
      setServings(String(r.servings));
      setImage(r.image);
      setFavorite(r.favorite);
      setCreatedAt(r.createdAt);
      setIngredients(r.ingredients.length ? r.ingredients : [""]);
      setInstructions(r.instructions.length ? r.instructions : [""]);
      setSourceUrl(r.sourceUrl ?? null);
    })();
  }, [id]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Izin galeri foto dibutuhkan untuk memilih gambar.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    if (asset.base64) {
      setImage(`data:image/jpeg;base64,${asset.base64}`);
    } else if (asset.uri) {
      setImage(asset.uri);
    }
  };

  const handleImport = async () => {
    const url = importUrl.trim();
    if (!url) {
      setImportError("Masukkan URL terlebih dahulu.");
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportBanner(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/recipes/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Gagal mengimpor resep.");
      }
      const imported = data as ImportedPayload;
      setTitle(imported.title || "");
      if (imported.image) setImage(imported.image);
      if (imported.ingredients?.length) setIngredients(imported.ingredients);
      if (imported.instructions?.length) setInstructions(imported.instructions);
      if (imported.cookTime) setCookTime(String(imported.cookTime));
      if (imported.servings) setServings(String(imported.servings));
      setSourceUrl(url);
      setImportOpen(false);
      setImportUrl("");
      setImportBanner("Resep berhasil diimpor. Periksa kembali sebelum menyimpan.");
    } catch (e: any) {
      setImportError(e?.message || "Gagal mengimpor resep. Coba URL lain.");
    } finally {
      setImporting(false);
    }
  };

  const onSave = async () => {
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    const ingredientsClean = ingredients.map((i) => i.trim()).filter(Boolean);
    const instructionsClean = instructions.map((i) => i.trim()).filter(Boolean);
    if (ingredientsClean.length === 0) {
      setError("Tambahkan minimal satu bahan.");
      return;
    }
    if (instructionsClean.length === 0) {
      setError("Tambahkan minimal satu langkah.");
      return;
    }
    setError(null);

    const recipe: Recipe = {
      id: id ?? uid(),
      title: title.trim(),
      category,
      ingredients: ingredientsClean,
      instructions: instructionsClean,
      image,
      cookTime: Math.max(0, parseInt(cookTime, 10) || 0),
      servings: Math.max(1, parseInt(servings, 10) || 1),
      difficulty,
      favorite,
      createdAt: editing ? createdAt : Date.now(),
      sourceUrl,
    };
    await saveRecipe(recipe);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="edit-close-btn" onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? "Ubah resep" : "Resep baru"}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 96,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Import from URL */}
        {!editing ? (
          <View style={styles.importBlock}>
            {!importOpen ? (
              <Pressable
                testID="open-import-btn"
                onPress={() => setImportOpen(true)}
                style={styles.importToggle}
              >
                <Feather name="link" size={16} color={colors.brand} />
                <Text style={styles.importToggleText}>Impor dari URL</Text>
                <Feather name="chevron-down" size={16} color={colors.onSurfaceTertiary} />
              </Pressable>
            ) : (
              <View testID="import-panel" style={styles.importPanel}>
                <View style={styles.importHeader}>
                  <Feather name="link" size={16} color={colors.brand} />
                  <Text style={styles.importTitle}>Impor dari URL</Text>
                  <Pressable
                    testID="close-import-btn"
                    onPress={() => {
                      setImportOpen(false);
                      setImportError(null);
                    }}
                    hitSlop={10}
                  >
                    <Feather name="x" size={16} color={colors.onSurfaceSecondary} />
                  </Pressable>
                </View>
                <Text style={styles.importHint}>
                  Tempel tautan resep, kami akan mengisi form secara otomatis.
                </Text>
                <TextInput
                  testID="import-url-input"
                  value={importUrl}
                  onChangeText={setImportUrl}
                  placeholder="https://contoh.com/resep/..."
                  placeholderTextColor={colors.onSurfaceTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
                {importError ? (
                  <Text testID="import-error" style={styles.importErrorText}>
                    {importError}
                  </Text>
                ) : null}
                <Pressable
                  testID="import-submit-btn"
                  onPress={handleImport}
                  disabled={importing}
                  style={[styles.importSubmit, importing && { opacity: 0.7 }]}
                >
                  {importing ? (
                    <ActivityIndicator color={colors.onBrandPrimary} size="small" />
                  ) : (
                    <Feather name="download" size={16} color={colors.onBrandPrimary} />
                  )}
                  <Text style={styles.importSubmitText}>
                    {importing ? "Mengimpor..." : "Impor resep"}
                  </Text>
                </Pressable>
              </View>
            )}
            {importBanner ? (
              <View testID="import-banner" style={styles.importBanner}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={styles.importBannerText}>{importBanner}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Image picker */}
        <Pressable testID="image-picker" onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="camera" size={28} color={colors.brand} />
              <Text style={styles.imagePlaceholderText}>Tambah foto sampul</Text>
            </View>
          )}
          {image ? (
            <View style={styles.imageChange}>
              <Feather name="edit-2" size={14} color={colors.onSurfaceInverse} />
              <Text style={styles.imageChangeText}>Ganti</Text>
            </View>
          ) : null}
        </Pressable>

        {/* Title */}
        <Field label="Judul">
          <TextInput
            testID="input-title"
            value={title}
            onChangeText={setTitle}
            placeholder="mis. Rendang Sapi"
            placeholderTextColor={colors.onSurfaceTertiary}
            style={styles.input}
          />
        </Field>

        {/* Category chips */}
        <Field label="Kategori">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  testID={`category-chip-${c.toLowerCase().replace(/\s+/g, "-")}`}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        {/* Numeric pair */}
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Waktu masak (mnt)">
              <TextInput
                testID="input-cooktime"
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={styles.input}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Porsi">
              <TextInput
                testID="input-servings"
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={styles.input}
              />
            </Field>
          </View>
        </View>

        {/* Difficulty */}
        <Field label="Tingkat kesulitan">
          <View style={styles.chipRow}>
            {DIFFICULTIES.map((d) => {
              const active = d === difficulty;
              return (
                <Pressable
                  key={d}
                  testID={`difficulty-chip-${d.toLowerCase()}`}
                  onPress={() => setDifficulty(d)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* Ingredients */}
        <Text style={styles.groupLabel}>Bahan-bahan</Text>
        {ingredients.map((val, idx) => (
          <View key={idx} style={styles.dynamicRow}>
            <View style={styles.bullet} />
            <TextInput
              testID={`ingredient-input-${idx}`}
              value={val}
              onChangeText={(t) => {
                const next = [...ingredients];
                next[idx] = t;
                setIngredients(next);
              }}
              placeholder={`Bahan ${idx + 1}`}
              placeholderTextColor={colors.onSurfaceTertiary}
              style={[styles.input, { flex: 1 }]}
            />
            {ingredients.length > 1 ? (
              <Pressable
                testID={`ingredient-remove-${idx}`}
                onPress={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                style={styles.removeBtn}
              >
                <Feather name="minus" size={16} color={colors.onSurfaceSecondary} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          testID="add-ingredient-btn"
          onPress={() => setIngredients([...ingredients, ""])}
          style={styles.addRowBtn}
        >
          <Feather name="plus" size={16} color={colors.brand} />
          <Text style={styles.addRowText}>Tambah bahan</Text>
        </Pressable>

        {/* Instructions */}
        <Text style={styles.groupLabel}>Cara membuat</Text>
        {instructions.map((val, idx) => (
          <View key={idx} style={styles.dynamicRow}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>{idx + 1}</Text>
            </View>
            <TextInput
              testID={`instruction-input-${idx}`}
              value={val}
              onChangeText={(t) => {
                const next = [...instructions];
                next[idx] = t;
                setInstructions(next);
              }}
              placeholder={`Langkah ${idx + 1}`}
              placeholderTextColor={colors.onSurfaceTertiary}
              style={[styles.input, styles.multiline]}
              multiline
            />
            {instructions.length > 1 ? (
              <Pressable
                testID={`instruction-remove-${idx}`}
                onPress={() => setInstructions(instructions.filter((_, i) => i !== idx))}
                style={styles.removeBtn}
              >
                <Feather name="minus" size={16} color={colors.onSurfaceSecondary} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          testID="add-instruction-btn"
          onPress={() => setInstructions([...instructions, ""])}
          style={styles.addRowBtn}
        >
          <Feather name="plus" size={16} color={colors.brand} />
          <Text style={styles.addRowText}>Tambah langkah</Text>
        </Pressable>

        {error ? (
          <Text testID="form-error" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* Sticky save */}
      <View
        style={[
          styles.stickyBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md },
        ]}
      >
        <Pressable testID="save-recipe-btn" onPress={onSave} style={styles.saveBtn}>
          <Feather name="check" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.saveBtnText}>{editing ? "Simpan perubahan" : "Simpan resep"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },

  importBlock: { marginTop: spacing.lg },
  importToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandTertiary,
    backgroundColor: "#FAF3EC",
  },
  importToggleText: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.brand,
    fontWeight: "500",
  },
  importPanel: {
    backgroundColor: "#FAF3EC",
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brandTertiary,
    gap: spacing.md,
  },
  importHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  importTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.onSurface,
  },
  importHint: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: -spacing.sm },
  importErrorText: { fontFamily: fonts.text, fontSize: 12, color: colors.error },
  importSubmit: {
    backgroundColor: colors.brand,
    height: 44,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  importSubmitText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 14, fontWeight: "500" },
  importBanner: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#EFF4EC",
    borderRadius: radius.md,
  },
  importBannerText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: colors.success },

  imagePicker: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    overflow: "hidden",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  imagePlaceholderText: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
  },
  imageChange: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(42,39,36,0.65)",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageChangeText: { fontFamily: fonts.text, color: colors.onSurfaceInverse, fontSize: 12 },
  fieldLabel: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  chipText: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary },
  chipTextActive: { color: colors.onSurfaceInverse },
  groupLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dynamicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginTop: 20,
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  stepNum: { fontFamily: fonts.display, color: colors.onBrandPrimary, fontSize: 13 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  addRowText: { fontFamily: fonts.text, color: colors.brand, fontSize: 14 },
  errorText: {
    fontFamily: fonts.text,
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  saveBtnText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 15, fontWeight: "500" },
});
