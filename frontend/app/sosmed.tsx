import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppDrawer from "@/src/components/AppDrawer";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Sosmed() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          testID="open-drawer-btn"
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Feather name="menu" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Sosmed</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Feather name="share-2" size={28} color={colors.brand} />
        </View>
        <Text style={styles.title}>Sosial Media</Text>
        <Text style={styles.subtitle}>
          Halaman ini sedang dipersiapkan. Nantinya kamu bisa membagikan resep favorit dan mengikuti dapur teman di sini.
        </Text>
      </View>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="sosmed" />
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
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
  subtitle: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
});
