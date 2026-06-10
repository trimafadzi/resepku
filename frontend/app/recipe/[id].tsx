import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { deleteRecipe, getRecipeById, toggleFavorite } from "@/src/store/recipes";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { Recipe } from "@/src/types";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const r = await getRecipeById(id);
    setRecipe(r);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onToggleFav = async () => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleFavorite(recipe.id);
    if (updated) setRecipe(updated);
  };

  const onDelete = async () => {
    if (!recipe) return;
    await deleteRecipe(recipe.id);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.loaderWrap, { paddingHorizontal: spacing.xl }]}>
        <Text style={styles.missing}>Resep ini sudah tidak ada.</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.backBtnSolid}>
          <Text style={styles.backBtnSolidText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Feather name="image" size={48} color={colors.onSurfaceTertiary} />
            </View>
          )}
          <LinearGradient
            colors={["rgba(42,39,36,0.55)", "transparent", "rgba(42,39,36,0.9)"]}
            style={StyleSheet.absoluteFill}
            locations={[0, 0.4, 1]}
          />
          {/* Top controls */}
          <View style={[styles.heroControls, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              testID="detail-back-btn"
              onPress={() => router.back()}
              style={styles.iconCircle}
            >
              <Feather name="arrow-left" size={20} color={colors.onSurfaceInverse} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                testID="detail-edit-btn"
                onPress={() => router.push(`/recipe/edit?id=${recipe.id}`)}
                style={styles.iconCircle}
              >
                <Feather name="edit-2" size={18} color={colors.onSurfaceInverse} />
              </Pressable>
              <Pressable testID="detail-delete-btn" onPress={onDelete} style={styles.iconCircle}>
                <Feather name="trash-2" size={18} color={colors.onSurfaceInverse} />
              </Pressable>
            </View>
          </View>
          {/* Title overlay */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroEyebrow}>{recipe.category.toUpperCase()}</Text>
            <Text style={styles.heroTitle}>{recipe.title}</Text>
          </View>
          <Pressable
            testID="detail-favorite-btn"
            onPress={onToggleFav}
            style={[styles.favFab, { bottom: -22 }]}
          >
            <Feather
              name="heart"
              size={22}
              color={recipe.favorite ? colors.brand : colors.onSurfaceSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Meta strip */}
          <View style={styles.metaRow}>
            <MetaCell icon="clock" label="Memasak" value={`${recipe.cookTime} mnt`} />
            <View style={styles.metaDivider} />
            <MetaCell icon="users" label="Porsi" value={`${recipe.servings}`} />
            <View style={styles.metaDivider} />
            <MetaCell icon="bar-chart-2" label="Tingkat" value={recipe.difficulty} />
          </View>

          {/* Ingredients */}
          <Text style={styles.sectionHeading}>Bahan-bahan</Text>
          <View style={{ marginBottom: spacing.xl }}>
            {recipe.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow} testID={`ingredient-${idx}`}>
                <View style={styles.bullet} />
                <Text style={styles.ingredientText}>{ing}</Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <Text style={styles.sectionHeading}>Cara membuat</Text>
          <View>
            {recipe.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow} testID={`step-${idx}`}>
                <View style={styles.stepNumWrap}>
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaCell({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Feather name={icon} size={16} color={colors.brand} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    gap: spacing.lg,
  },
  missing: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  backBtnSolid: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  backBtnSolidText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 14 },
  heroWrap: {
    width: "100%",
    height: 380,
    backgroundColor: colors.surfaceTertiary,
  },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  heroControls: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(42,39,36,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.xxxl,
    bottom: spacing.xl,
  },
  heroEyebrow: {
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.onSurfaceInverse,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.onSurfaceInverse,
    lineHeight: 38,
  },
  favFab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  metaRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  metaCell: { flex: 1, alignItems: "center", gap: 4 },
  metaDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  metaLabel: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.onSurfaceTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metaValue: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface },
  sectionHeading: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
  ingredientText: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNum: { fontFamily: fonts.display, color: colors.onBrandPrimary, fontSize: 14 },
  stepText: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 24,
  },
});
