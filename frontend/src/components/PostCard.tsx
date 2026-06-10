import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Post } from "@/src/store/social";
import { colors, fonts, radius, spacing } from "@/src/theme";

interface Props {
  post: Post;
  onPressUser?: (userId: string) => void;
  onDelete?: () => void;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default function PostCard({ post, onPressUser, onDelete }: Props) {
  return (
    <View style={styles.card} testID={`post-card-${post.id}`}>
      <View style={styles.header}>
        <Pressable
          style={styles.userRow}
          onPress={() => onPressUser?.(post.userId)}
          testID={`post-user-${post.id}`}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.user.avatar}</Text>
          </View>
          <View>
            <Text style={styles.nickname}>{post.user.nickname}</Text>
            <Text style={styles.timestamp}>{timeAgo(post.createdAt)}</Text>
          </View>
        </Pressable>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} testID={`post-delete-${post.id}`}>
            <Feather name="more-horizontal" size={20} color={colors.onSurfaceSecondary} />
          </Pressable>
        ) : null}
      </View>

      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      <View style={styles.recipeWrap}>
        {post.recipe.image ? (
          <Image source={{ uri: post.recipe.image }} style={styles.recipeImage} contentFit="cover" />
        ) : (
          <View style={[styles.recipeImage, styles.recipeFallback]}>
            <Feather name="image" size={28} color={colors.onSurfaceTertiary} />
          </View>
        )}
        <View style={styles.recipeMeta}>
          <Text style={styles.recipeCategory}>{post.recipe.category.toUpperCase()}</Text>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {post.recipe.title}
          </Text>
          <View style={styles.recipeFacts}>
            <Feather name="clock" size={12} color={colors.onSurfaceSecondary} />
            <Text style={styles.recipeFactText}>{post.recipe.cookTime} mnt</Text>
            <View style={styles.dot} />
            <Feather name="users" size={12} color={colors.onSurfaceSecondary} />
            <Text style={styles.recipeFactText}>{post.recipe.servings} porsi</Text>
            <View style={styles.dot} />
            <Text style={styles.recipeFactText}>{post.recipe.difficulty}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20 },
  nickname: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface },
  timestamp: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 2 },
  caption: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  recipeWrap: {
    marginTop: spacing.md,
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  recipeImage: { width: 92, height: 92, backgroundColor: colors.surfaceTertiary },
  recipeFallback: { alignItems: "center", justifyContent: "center" },
  recipeMeta: { flex: 1, padding: spacing.md, gap: 4, justifyContent: "center" },
  recipeCategory: {
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.brand,
  },
  recipeTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface },
  recipeFacts: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  recipeFactText: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceSecondary, marginRight: 2 },
  dot: { width: 2, height: 2, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary, marginHorizontal: 2 },
});
