import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppDrawer from "@/src/components/AppDrawer";
import PostCard from "@/src/components/PostCard";
import { readProfile, type GuestProfile } from "@/src/store/profile";
import { social, type Post } from "@/src/store/social";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Tab = "feed" | "discover";

export default function Sosmed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (currentTab: Tab, p: GuestProfile | null) => {
    setLoading(true);
    try {
      if (currentTab === "feed") {
        if (!p) {
          setPosts([]);
          return;
        }
        const data = await social.feed(p.id);
        setPosts(data);
      } else {
        const data = await social.discover(p?.id);
        setPosts(data);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await readProfile();
        setProfile(p);
        setProfileLoaded(true);
        if (!p) return; // onboarding CTA will show
        await load(tab, p);
      })();
    }, [load, tab])
  );

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    load(t, profile);
  };

  // Onboarding gate
  if (profileLoaded && !profile) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <SosmedHeader
          insets={insets}
          onMenu={() => setDrawerOpen(true)}
          right={null}
          title="Sosmed"
        />
        <View style={styles.gateBody}>
          <View style={styles.gateIconWrap}>
            <Feather name="users" size={32} color={colors.brand} />
          </View>
          <Text style={styles.gateTitle}>Bikin dapur kamu dulu</Text>
          <Text style={styles.gateBody2}>
            Pilih nickname dan ikon dapur. Disimpan lokal di HP ini — tanpa daftar akun.
          </Text>
          <Pressable
            testID="start-onboarding-btn"
            onPress={() => router.push("/sosmed/onboarding")}
            style={styles.gateBtn}
          >
            <Feather name="arrow-right" size={16} color={colors.onBrandPrimary} />
            <Text style={styles.gateBtnText}>Buat Dapur Saya</Text>
          </Pressable>
        </View>
        <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="sosmed" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SosmedHeader
        insets={insets}
        onMenu={() => setDrawerOpen(true)}
        right={
          profile ? (
            <Pressable
              testID="my-dapur-btn"
              onPress={() => router.push(`/sosmed/dapur/${profile.id}`)}
              style={styles.headerAvatar}
            >
              <Text style={styles.headerAvatarText}>{profile.avatar}</Text>
            </Pressable>
          ) : null
        }
        title="Sosmed"
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TabBtn label="Feed" active={tab === "feed"} onPress={() => switchTab("feed")} testID="tab-feed" />
        <TabBtn
          label="Jelajah"
          active={tab === "discover"}
          onPress={() => switchTab("discover")}
          testID="tab-discover"
        />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 120,
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Feather name="coffee" size={24} color={colors.brand} />
              <Text style={styles.emptyTitle}>
                {tab === "feed" ? "Belum ada postingan" : "Belum ada dapur lain"}
              </Text>
              <Text style={styles.emptyBody}>
                {tab === "feed"
                  ? "Mulai dengan membagikan satu resep, atau ikuti dapur dari tab Jelajah."
                  : "Ajak teman untuk membuka aplikasi dan membagikan resep mereka."}
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          loading ? (
            <View style={{ paddingVertical: spacing.xl }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPressUser={(uid) => router.push(`/sosmed/dapur/${uid}`)}
          />
        )}
      />

      {/* Floating share button */}
      <Pressable
        testID="share-fab"
        onPress={() => router.push("/sosmed/share")}
        style={[styles.shareFab, { bottom: insets.bottom + spacing.lg }]}
      >
        <Feather name="edit-3" size={18} color={colors.onBrandPrimary} />
        <Text style={styles.shareFabText}>Bagikan Resep</Text>
      </Pressable>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="sosmed" />
    </View>
  );
}

function SosmedHeader({
  insets,
  onMenu,
  right,
  title,
}: {
  insets: { top: number };
  onMenu: () => void;
  right: React.ReactNode;
  title: string;
}) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable testID="open-drawer-btn" onPress={onMenu} hitSlop={10} style={styles.iconBtn}>
        <Feather name="menu" size={22} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.iconBtn}>{right}</View>
    </View>
  );
}

function TabBtn({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active ? <View style={styles.tabIndicator} /> : null}
    </Pressable>
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
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 18 },

  tabsRow: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: { paddingBottom: spacing.md, alignItems: "center" },
  tabText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary },
  tabTextActive: { color: colors.onSurface, fontWeight: "500" },
  tabIndicator: {
    height: 2,
    width: 24,
    backgroundColor: colors.brand,
    marginTop: spacing.sm,
    borderRadius: 2,
  },

  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface, marginTop: spacing.md },
  emptyBody: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },

  shareFab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  shareFabText: {
    fontFamily: fonts.text,
    color: colors.onBrandPrimary,
    fontSize: 14,
    fontWeight: "500",
  },

  gateBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  gateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  gateTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  gateBody2: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  gateBtn: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    height: 52,
    borderRadius: radius.pill,
  },
  gateBtnText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 15, fontWeight: "500" },
});
