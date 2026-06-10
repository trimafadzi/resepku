import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDrawer from "@/src/components/AppDrawer";
import { useRecipes } from "@/src/store/recipes";
import { CATEGORIES, Category, colors, fonts, radius, spacing } from "@/src/theme";
import { Recipe } from "@/src/types";

type Filter = "Semua" | Category;
const FILTERS: Filter[] = ["Semua", ...CATEGORIES];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading, refresh } = useRecipes();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Semua");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      return r.ingredients.some((i) => i.toLowerCase().includes(q));
    });
  }, [recipes, query]);

  const filtered = useMemo(() => {
    if (filter === "Semua") return searched;
    return searched.filter((r) => r.category === filter);
  }, [searched, filter]);

  const grouped = useMemo(() => {
    const groups: { category: Category; items: Recipe[] }[] = [];
    for (const c of CATEGORIES) {
      const items = filtered.filter((r) => r.category === c);
      if (items.length) groups.push({ category: c, items });
    }
    return groups;
  }, [filtered]);

  const featured = recipes.find((r) => r.favorite) ?? recipes[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.loaderText}>Memanaskan oven...</Text>
      </SafeAreaView>
    );
  }

  const showFeatured = !query && filter === "Semua" && featured;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="home-header">
        <View style={styles.headerTopRow}>
          <Pressable
            testID="open-drawer-btn"
            onPress={() => setDrawerOpen(true)}
            hitSlop={10}
            style={styles.menuBtn}
          >
            <Feather name="menu" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Dapur Hari Ini</Text>
            <Text style={styles.title}>Buku Resep</Text>
          </View>
          <Pressable
            testID="add-recipe-fab"
            onPress={() => router.push("/recipe/edit")}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="plus" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color={colors.onSurfaceSecondary} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Cari judul atau bahan"
            placeholderTextColor={colors.onSurfaceTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable testID="search-clear" onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x" size={18} color={colors.onSurfaceSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                testID={`filter-chip-${f.toLowerCase()}`}
                onPress={() => setFilter(f)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.category}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xxxl,
          paddingTop: spacing.sm,
        }}
        ListHeaderComponent={
          showFeatured ? <FeaturedCard recipe={featured!} onPress={() => router.push(`/recipe/${featured!.id}`)} /> : null
        }
        ListEmptyComponent={<EmptyState onAdd={() => router.push("/recipe/edit")} hasQuery={!!query} />}
        renderItem={({ item }) => (
          <CategorySection
            category={item.category}
            recipes={item.items}
            onPressRecipe={(id) => router.push(`/recipe/${id}`)}
          />
        )}
      />

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="resep" />
    </View>
  );
}

function FeaturedCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <Pressable testID="featured-card" onPress={onPress} style={styles.featuredWrap}>
      <Image source={{ uri: recipe.image ?? undefined }} style={styles.featuredImage} contentFit="cover" />
      <LinearGradient
        colors={["transparent", "rgba(42,39,36,0.2)", "rgba(42,39,36,0.85)"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredEyebrow}>PILIHAN · {recipe.category.toUpperCase()}</Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.featuredMeta}>
          <Feather name="clock" size={14} color={colors.onSurfaceInverse} />
          <Text style={styles.featuredMetaText}>{recipe.cookTime} mnt</Text>
          <View style={styles.dot} />
          <Feather name="users" size={14} color={colors.onSurfaceInverse} />
          <Text style={styles.featuredMetaText}>{recipe.servings} porsi</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CategorySection({
  category,
  recipes,
  onPressRecipe,
}: {
  category: Category;
  recipes: Recipe[];
  onPressRecipe: (id: string) => void;
}) {
  return (
    <View style={styles.section} testID={`category-section-${category.toLowerCase()}`}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{category}</Text>
        <Text style={styles.sectionCount}>{recipes.length}</Text>
      </View>
      <View style={styles.grid}>
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} onPress={() => onPressRecipe(r.id)} />
        ))}
      </View>
    </View>
  );
}

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <Pressable
      testID={`recipe-card-${recipe.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.cardImageWrap}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Feather name="image" size={28} color={colors.onSurfaceTertiary} />
          </View>
        )}
        {recipe.favorite ? (
          <View style={styles.favBadge}>
            <Feather name="heart" size={12} color={colors.onBrandPrimary} />
          </View>
        ) : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {recipe.title}
      </Text>
      <View style={styles.cardMeta}>
        <Feather name="clock" size={12} color={colors.onSurfaceSecondary} />
        <Text style={styles.cardMetaText}>{recipe.cookTime} mnt</Text>
        <View style={styles.cardMetaDivider} />
        <Text style={styles.cardMetaText}>{recipe.difficulty}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) {
  return (
    <View style={styles.empty} testID="empty-state">
      <View style={styles.emptyIcon}>
        <Feather name={hasQuery ? "search" : "book-open"} size={28} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>
        {hasQuery ? "Resep tidak ditemukan" : "Buku resepmu masih kosong"}
      </Text>
      <Text style={styles.emptyBody}>
        {hasQuery
          ? "Coba kata kunci lain atau bersihkan pencarian."
          : "Mulai dengan menambahkan resep pertamamu."}
      </Text>
      {!hasQuery ? (
        <Pressable testID="empty-add-btn" onPress={onAdd} style={styles.emptyBtn}>
          <Feather name="plus" size={16} color={colors.onBrandPrimary} />
          <Text style={styles.emptyBtnText}>Tambah Resep Pertama</Text>
        </Pressable>
      ) : null}
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
    gap: spacing.md,
  },
  loaderText: { fontFamily: fonts.text, color: colors.onSurfaceSecondary, fontSize: 14 },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  menuBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -spacing.sm },
  eyebrow: {
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.brand,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onSurface,
  },
  addBtn: {
    height: 44,
    width: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  chipsScroll: { marginTop: spacing.md, height: 36 },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    alignItems: "center",
  },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.surfaceInverse,
  },
  chipText: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
  },
  chipTextActive: { color: colors.onSurfaceInverse },
  featuredWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
  },
  featuredImage: { width: "100%", height: "100%" },
  featuredOverlay: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  featuredEyebrow: {
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.onSurfaceInverse,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  featuredTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.onSurfaceInverse,
    marginBottom: spacing.sm,
  },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  featuredMetaText: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceInverse,
    marginRight: spacing.xs,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.onSurfaceInverse,
    opacity: 0.6,
    marginHorizontal: spacing.xs,
  },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  sectionCount: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "47.5%",
  },
  cardImageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.sm,
  },
  cardImage: { width: "100%", height: "100%" },
  cardImageFallback: { alignItems: "center", justifyContent: "center" },
  favBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.brand,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 4,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceSecondary },
  cardMetaDivider: {
    width: 2,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.onSurfaceTertiary,
    marginHorizontal: spacing.xs,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  emptyBody: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyBtnText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 14, fontWeight: "500" },
});
