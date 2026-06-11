import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "@/src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

type NavKey = "resep" | "sosmed" | "settings";

interface Props {
  open: boolean;
  onClose: () => void;
  active: NavKey;
}

const ITEMS: { key: NavKey; label: string; icon: keyof typeof Feather.glyphMap; route: string }[] = [
  { key: "resep", label: "Resep", icon: "book-open", route: "/" },
  { key: "sosmed", label: "Sosmed", icon: "share-2", route: "/sosmed" },
  { key: "settings", label: "Pengaturan", icon: "settings", route: "/settings" },
];

export default function AppDrawer({ open, onClose, active }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(open ? 1 : 0);
  // Keep the tree mounted long enough for the close animation to play out
  // before unmounting. Otherwise the drawer disappears instantly on close.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    progress.value = withTiming(open ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    if (!open) {
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -DRAWER_W + DRAWER_W * progress.value }],
  }));

  if (!mounted) return null;

  const go = (route: string, key: NavKey) => {
    onClose();
    if (key === active) return;
    setTimeout(() => router.replace(route as any), 120);
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}
      testID="app-drawer-root"
    >
      {open ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}>
          <Pressable
            testID="drawer-backdrop"
            onPress={onClose}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}

      <Animated.View
        testID="app-drawer"
        style={[
          styles.drawer,
          { width: DRAWER_W, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          drawerStyle,
        ]}
      >
        <View style={styles.brand}>
          <Text style={styles.brandEyebrow}>Buku Resep</Text>
          <Text style={styles.brandTitle}>Menu</Text>
        </View>

        <View style={styles.itemsWrap}>
          {ITEMS.map((it) => {
            const isActive = it.key === active;
            return (
              <Pressable
                key={it.key}
                testID={`drawer-item-${it.key}`}
                onPress={() => go(it.route, it.key)}
                style={[styles.item, isActive && styles.itemActive]}
              >
                <Feather
                  name={it.icon}
                  size={18}
                  color={isActive ? colors.brand : colors.onSurfaceSecondary}
                />
                <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{it.label}</Text>
                {isActive ? <View style={styles.itemDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>v1 · Dapur pribadimu</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "#000" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  brand: { marginBottom: spacing.xl },
  brandEyebrow: {
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.brand,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  brandTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  itemsWrap: { flex: 1, gap: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.surfaceSecondary },
  itemText: { flex: 1, fontFamily: fonts.text, fontSize: 15, color: colors.onSurfaceSecondary },
  itemTextActive: { color: colors.onSurface, fontWeight: "500" },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
  footer: { paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  footerText: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary },
});
