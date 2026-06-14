import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
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

import AppDrawer from "@/src/components/AppDrawer";
import { useRecipes } from "@/src/store/recipes";
import { drugsStore } from "@/src/store/drugs";
import { useProfile } from "@/src/store/profile";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading: recipesLoading, refresh: refreshRecipes } = useRecipes();
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile();
  const [drugsCount, setDrugsCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshRecipes();
      refreshProfile();
      drugsStore.getDrugs().then((list) => setDrugsCount(list.length));
    }, [refreshRecipes, refreshProfile])
  );

  const favCount = recipes.filter((r) => r.favorite).length;
  const latestRecipe = recipes[0];

  const loading = recipesLoading || profileLoading;

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.loaderText}>Menyiapkan dasbor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="dashboard-header">
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
            <Text style={styles.eyebrow}>Ringkasan Dapur</Text>
            <Text style={styles.title}>Dasbor</Text>
          </View>
          {profile ? (
            <Pressable
              onPress={() => router.push("/sosmed")}
              style={styles.profileBadge}
            >
              <Text style={styles.profileBadgeText}>{profile.avatar}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Profile Card */}
        <Pressable
          style={styles.welcomeCard}
          onPress={() => router.push(profile ? `/sosmed/dapur/${profile.id}` : "/sosmed")}
        >
          <View style={styles.welcomeAvatarWrap}>
            <Text style={styles.welcomeAvatar}>{profile?.avatar ?? "🍳"}</Text>
          </View>
          <View style={styles.welcomeTextWrap}>
            <Text style={styles.welcomeGreeting}>
              {profile ? `Dapur ${profile.nickname}` : "Profil Tamu"}
            </Text>
            <Text style={styles.welcomeSub} numberOfLines={2}>
              {profile?.bio || "Kelola resep masakan lokal dan daftar obat harian Anda dengan mudah."}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.onSurfaceSecondary} />
        </Pressable>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Statistik</Text>
        <View style={styles.statsGrid}>
          <Pressable
            style={styles.statCard}
            onPress={() => router.replace("/")}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "#EBF3E8" }]}>
              <Feather name="book-open" size={20} color="#6A825C" />
            </View>
            <Text style={styles.statNumber}>{recipes.length}</Text>
            <Text style={styles.statLabel}>Total Resep</Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => router.replace("/")}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "#FDF0ED" }]}>
              <Feather name="heart" size={20} color={colors.brand} />
            </View>
            <Text style={styles.statNumber}>{favCount}</Text>
            <Text style={styles.statLabel}>Favorit</Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => router.replace("/obatku")}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "#EDF5F6" }]}>
              <Feather name="activity" size={20} color="#4A90E2" />
            </View>
            <Text style={styles.statNumber}>{drugsCount}</Text>
            <Text style={styles.statLabel}>Kotak Obat</Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => router.replace("/sosmed")}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "#F7F3EB" }]}>
              <Feather name="share-2" size={20} color="#D49A44" />
            </View>
            <Text style={styles.statNumber}>{profile ? "Aktif" : "Tamu"}</Text>
            <Text style={styles.statLabel}>Profil Sosmed</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/recipe/edit")}
          >
            <View style={styles.actionIcon}>
              <Feather name="plus" size={20} color={colors.brand} />
            </View>
            <Text style={styles.actionLabel}>Resep Baru</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.replace("/obatku")}
          >
            <View style={styles.actionIcon}>
              <Feather name="search" size={20} color={colors.brand} />
            </View>
            <Text style={styles.actionLabel}>Cari Obat</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.replace("/sosmed")}
          >
            <View style={styles.actionIcon}>
              <Feather name="glob" size={20} color={colors.brand} />
            </View>
            <Text style={styles.actionLabel}>Sosmed</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.replace("/settings")}
          >
            <View style={styles.actionIcon}>
              <Feather name="sliders" size={20} color={colors.brand} />
            </View>
            <Text style={styles.actionLabel}>Pengaturan</Text>
          </Pressable>
        </View>

        {/* Latest Recipe */}
        {latestRecipe ? (
          <View style={styles.latestSection}>
            <Text style={styles.sectionTitle}>Resep Terbaru</Text>
            <Pressable
              style={styles.latestCard}
              onPress={() => router.push(`/recipe/${latestRecipe.id}`)}
            >
              {latestRecipe.image ? (
                <Image
                  source={{ uri: latestRecipe.image }}
                  style={styles.latestImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.latestImage, styles.latestFallback]}>
                  <Feather name="image" size={32} color={colors.onSurfaceTertiary} />
                </View>
              )}
              <View style={styles.latestContent}>
                <Text style={styles.latestCategory}>
                  {latestRecipe.category.toUpperCase()}
                </Text>
                <Text style={styles.latestTitle} numberOfLines={1}>
                  {latestRecipe.title}
                </Text>
                <View style={styles.latestMeta}>
                  <Feather name="clock" size={12} color={colors.onSurfaceSecondary} />
                  <Text style={styles.latestMetaText}>{latestRecipe.cookTime} mnt</Text>
                  <View style={styles.latestMetaDivider} />
                  <Text style={styles.latestMetaText}>{latestRecipe.difficulty}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.onSurfaceSecondary} style={{ marginRight: spacing.md }} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="dashboard" />
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
  profileBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileBadgeText: { fontSize: 20 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeAvatar: { fontSize: 24 },
  welcomeTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  welcomeGreeting: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: 2,
  },
  welcomeSub: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    lineHeight: 16,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: "47.5%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  actionBtn: {
    alignItems: "center",
    width: "22%",
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  latestSection: {
    marginTop: spacing.xs,
  },
  latestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  latestImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.surfaceSecondary,
  },
  latestFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  latestContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  latestCategory: {
    fontFamily: fonts.text,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.brand,
    marginBottom: 2,
  },
  latestTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 4,
  },
  latestMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  latestMetaText: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.onSurfaceSecondary,
  },
  latestMetaDivider: {
    width: 2,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.onSurfaceTertiary,
    marginHorizontal: 2,
  },
});
