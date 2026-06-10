import { Feather } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getRecipeById } from "@/src/store/recipes";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { Recipe } from "@/src/types";

const { width: SCREEN_W } = Dimensions.get("window");

export default function CookMode() {
  // Layar tetap menyala sepanjang halaman ini terbuka.
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getRecipeById(id).then((r) => {
        setRecipe(r);
        setStep(0);
      });
    }, [id])
  );

  if (!recipe) {
    return <View style={[styles.root, { backgroundColor: colors.surfaceInverse }]} />;
  }

  const total = recipe.instructions.length;
  const currentStep = recipe.instructions[step] ?? "";
  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(total - 1, s + 1));
  const onFinish = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const isLast = step === total - 1;
  const progress = total > 0 ? (step + 1) / total : 0;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          testID="cook-close-btn"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.iconBtn}
          hitSlop={10}
        >
          <Feather name="x" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerEyebrow}>MODE MASAK</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
        </View>
        <Pressable
          testID="cook-ingredients-btn"
          onPress={() => setShowIngredients((v) => !v)}
          style={styles.iconBtn}
          hitSlop={10}
        >
          <Feather name="list" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {showIngredients ? (
        <ScrollView
          style={styles.ingredientsSheet}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        >
          <Text style={styles.ingredientsHeading}>Bahan-bahan</Text>
          {recipe.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.stepWrap}>
          <Text style={styles.stepCount}>
            Langkah {step + 1} dari {total}
          </Text>
          <ScrollView
            contentContainerStyle={{ paddingVertical: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            <Text testID="cook-step-text" style={styles.stepText}>
              {currentStep}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Bottom controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg },
        ]}
      >
        <Pressable
          testID="cook-prev-btn"
          onPress={goPrev}
          disabled={step === 0}
          style={[styles.navBtn, step === 0 && { opacity: 0.35 }]}
        >
          <Feather name="chevron-left" size={22} color={colors.onSurfaceInverse} />
        </Pressable>

        {isLast ? (
          <Pressable testID="cook-finish-btn" onPress={onFinish} style={styles.primaryBtn}>
            <Feather name="check" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>Selesai</Text>
          </Pressable>
        ) : (
          <Pressable testID="cook-next-btn" onPress={goNext} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Langkah berikutnya</Text>
            <Feather name="arrow-right" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        )}

        <Pressable
          testID="cook-next-btn-circle"
          onPress={goNext}
          disabled={isLast}
          style={[styles.navBtn, isLast && { opacity: 0.35 }]}
        >
          <Feather name="chevron-right" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerEyebrow: {
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.brandTertiary,
    marginBottom: 2,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurfaceInverse, maxWidth: SCREEN_W - 140 },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(253,251,247,0.12)",
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brand },
  stepWrap: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  stepCount: {
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.brandTertiary,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  stepText: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 38,
    color: colors.onSurfaceInverse,
  },
  ingredientsSheet: { flex: 1 },
  ingredientsHeading: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurfaceInverse,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(253,251,247,0.12)",
  },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, marginTop: 9 },
  ingredientText: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceInverse,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(253,251,247,0.08)",
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(253,251,247,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontFamily: fonts.text,
    color: colors.onBrandPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
});
