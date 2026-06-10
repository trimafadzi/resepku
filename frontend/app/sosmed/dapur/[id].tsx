import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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

import PostCard from "@/src/components/PostCard";
import { readProfile, type GuestProfile } from "@/src/store/profile";
import { social, type Post, type ProfileStats } from "@/src/store/social";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Dapur() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<GuestProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = !!me && me.id === id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const myProfile = await readProfile();
      setMe(myProfile);
      const [profileStats, userPosts] = await Promise.all([
        social.profile(id),
        social.userPosts(id),
      ]);
      setStats(profileStats);
      setPosts(userPosts);
      if (myProfile && myProfile.id !== id) {
        const f = await social.checkFollow(myProfile.id, id);
        setIsFollowing(f.following);
      } else {
        setIsFollowing(null);
      }
    } catch (e: any) {
      setError(e?.message || "Gagal memuat dapur.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleFollow = async () => {
    if (!me || isSelf || isFollowing === null) return;
    setActionPending(true);
    try {
      if (isFollowing) {
        await social.unfollow(me.id, id);
        setIsFollowing(false);
        setStats((s) => (s ? { ...s, followers: Math.max(0, s.followers - 1) } : s));
      } else {
        await social.follow(me.id, id);
        setIsFollowing(true);
        setStats((s) => (s ? { ...s, followers: s.followers + 1 } : s));
      }
    } catch {
      // ignore — UI stays consistent on next focus reload
    } finally {
      setActionPending(false);
    }
  };

  const onDeletePost = async (postId: string) => {
    if (!me) return;
    try {
      await social.deletePost(postId, me.id);
      setPosts((p) => p.filter((x) => x.id !== postId));
      setStats((s) => (s ? { ...s, posts: Math.max(0, s.posts - 1) } : s));
    } catch {
      // swallow — refresh will reconcile
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          testID="dapur-back-btn"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/sosmed"))}
          style={styles.iconBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Dapur</Text>
        <View style={styles.iconBtn}>
          {isSelf ? (
            <Pressable
              testID="edit-profile-btn"
              onPress={() => router.push("/sosmed/onboarding")}
              hitSlop={10}
            >
              <Feather name="settings" size={20} color={colors.onSurface} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error || !stats ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Dapur tidak ditemukan."}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={
            <View>
              <View style={styles.profileBlock}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{stats.user.avatar}</Text>
                </View>
                <Text style={styles.nickname}>{stats.user.nickname}</Text>
                {stats.user.bio ? <Text style={styles.bio}>{stats.user.bio}</Text> : null}

                <View style={styles.statsRow}>
                  <Stat label="Posting" value={stats.posts} />
                  <View style={styles.statDivider} />
                  <Stat label="Pengikut" value={stats.followers} />
                  <View style={styles.statDivider} />
                  <Stat label="Mengikuti" value={stats.following} />
                </View>

                {!isSelf && me ? (
                  <Pressable
                    testID="follow-toggle-btn"
                    onPress={toggleFollow}
                    disabled={actionPending}
                    style={[
                      styles.followBtn,
                      isFollowing ? styles.followBtnFollowing : styles.followBtnDefault,
                      actionPending && { opacity: 0.6 },
                    ]}
                  >
                    <Feather
                      name={isFollowing ? "user-check" : "user-plus"}
                      size={16}
                      color={isFollowing ? colors.onSurface : colors.onBrandPrimary}
                    />
                    <Text style={[styles.followBtnText, isFollowing && { color: colors.onSurface }]}>
                      {isFollowing ? "Mengikuti" : "Ikuti"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>
                {isSelf ? "Postingan kamu" : "Postingan"} ({stats.posts})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="book" size={22} color={colors.brand} />
              <Text style={styles.emptyTitle}>Belum ada postingan</Text>
              <Text style={styles.emptyBody}>
                {isSelf
                  ? "Bagikan resep favorit dari Buku Resep ke sini."
                  : "Dapur ini belum membagikan resep."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard post={item} onDelete={isSelf ? () => onDeletePost(item.id) : undefined} />
          )}
        />
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: fonts.text, color: colors.onSurfaceSecondary, fontSize: 14 },

  profileBlock: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 48 },
  nickname: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
  bio: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginHorizontal: spacing.md },
  statCell: { alignItems: "center", minWidth: 60 },
  statValue: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },
  statLabel: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },

  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 44,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  followBtnDefault: { backgroundColor: colors.brand },
  followBtnFollowing: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderStrong },
  followBtnText: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "500",
    color: colors.onBrandPrimary,
  },

  sectionLabel: {
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.onSurfaceTertiary,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface, marginTop: spacing.sm },
  emptyBody: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, textAlign: "center", maxWidth: 280 },
});
