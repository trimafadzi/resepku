import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
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

import { readProfile, type GuestProfile } from "@/src/store/profile";
import { useRecipes } from "@/src/store/recipes";
import { social } from "@/src/store/social";
import { colors, fonts, radius, spacing } from "@/src/theme";
import type { Recipe } from "@/src/types";

export default function Share() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading: recipesLoading } = useRecipes();
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readProfile().then(setProfile);
  }, []);

  const publicRecipes = useMemo(() => recipes.filter((r) => r.isPublic), [recipes]);

  const selected: Recipe | null = useMemo(
    () => publicRecipes.find((r) => r.id === selectedId) ?? null,
    [publicRecipes, selectedId]
  );

  const onShare = async () => {
    if (!profile) {
      setError("Bikin dapur kamu dulu di tab Sosmed.");
      return;
    }
    if (!selected) {
      setError("Pilih resep yang ingin dibagikan.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await social.createPost({
        userId: profile.id,
        caption: caption.trim(),
        recipe: {
          title: selected.title,
          image: selected.image,
          category: selected.category,
          cookTime: selected.cookTime,
          servings: selected.servings,
          difficulty: selected.difficulty,
        },
      });
      if (router.canGoBack()) router.back();
      else router.replace("/sosmed");
    } catch (e: any) {
      setError(e?.message || "Gagal membagikan resep.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="share-close-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Bagikan Resep</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Caption */}
        <Text style={styles.fieldLabel}>Caption (opsional)</Text>
        <TextInput
          testID="caption-input"
          value={caption}
          onChangeText={setCaption}
          placeholder="Tulis cerita di balik resep ini..."
          placeholderTextColor={colors.onSurfaceTertiary}
          multiline
          maxLength={280}
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
        />
        <Text style={styles.counter}>{caption.length}/280</Text>

        {/* Recipe picker */}
        <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Pilih resep (publik saja)</Text>
        {recipesLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.lg }} />
        ) : publicRecipes.length === 0 ? (
          <View style={styles.emptyPick}>
            <Feather name="lock" size={20} color={colors.onSurfaceSecondary} />
            <Text style={styles.emptyPickTitle}>Belum ada resep publik</Text>
            <Text style={styles.emptyPickBody}>
              Buka resep yang ingin dibagikan, tap Ubah, lalu aktifkan toggle &quot;Publik&quot;.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {publicRecipes.map((r) => {
              const active = r.id === selectedId;
              return (
                <Pressable
                  key={r.id}
                  testID={`share-pick-${r.id}`}
                  onPress={() => setSelectedId(r.id)}
                  style={[styles.pickRow, active && styles.pickRowActive]}
                >
                  {r.image ? (
                    <Image source={{ uri: r.image }} style={styles.pickImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.pickImage, styles.pickFallback]}>
                      <Feather name="image" size={20} color={colors.onSurfaceTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickCategory}>{r.category.toUpperCase()}</Text>
                    <Text style={styles.pickTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={styles.pickMeta}>{r.cookTime} mnt · {r.difficulty}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <Feather name="check" size={14} color={colors.onBrandPrimary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? (
          <Text testID="share-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md },
        ]}
      >
        <Pressable
          testID="share-publish-btn"
          onPress={onShare}
          disabled={posting || !selected}
          style={[styles.publishBtn, (posting || !selected) && { opacity: 0.5 }]}
        >
          <Feather name="send" size={16} color={colors.onBrandPrimary} />
          <Text style={styles.publishBtnText}>{posting ? "Memposting..." : "Posting ke Sosmed"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },
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
  counter: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, textAlign: "right", marginTop: 4 },

  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: colors.surfaceSecondary,
  },
  pickRowActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  pickImage: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  pickFallback: { alignItems: "center", justifyContent: "center" },
  pickCategory: { fontFamily: fonts.text, fontSize: 10, letterSpacing: 1, color: colors.brand },
  pickTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, marginTop: 2 },
  pickMeta: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceSecondary, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand, backgroundColor: colors.brand },

  emptyPick: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
  },
  emptyPickTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface },
  emptyPickBody: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  error: { fontFamily: fonts.text, color: colors.error, fontSize: 13, marginTop: spacing.md, textAlign: "center" },

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
  publishBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  publishBtnText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 15, fontWeight: "500" },
});
