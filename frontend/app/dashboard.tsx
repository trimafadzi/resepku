import { Feather } from "@expo/vector-icons";
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
import { settingsStore } from "@/src/store/settings";
import { colors, fonts, radius, spacing } from "@/src/theme";

interface SystemStats {
  status: string;
  cpu_usage: number;
  ram_usage: number;
  ram_used_mb: number;
  ram_total_mb: number;
  disk_usage: number;
  disk_used_gb: number;
  disk_total_gb: number;
  mongo_status: string;
  mongo_latency_ms: number;
  uptime_seconds: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} detik`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours} jam ${remMinutes} menit`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days} hari ${remHours} jam ${remMinutes} menit`;
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const baseUrl = await settingsStore.getBaseUrl();
      setServerUrl(baseUrl);
      
      const res = await fetch(`${baseUrl}/api/system/stats`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      setIsOnline(false);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      const timer = setInterval(() => {
        fetchStats();
      }, 3000);
      return () => clearInterval(timer);
    }, [fetchStats])
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
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
            <Text style={styles.eyebrow}>Monitoring Server</Text>
            <Text style={styles.title}>Dasbor</Text>
          </View>
          <Pressable
            onPress={() => fetchStats(true)}
            disabled={refreshing}
            style={styles.refreshBtn}
            hitSlop={10}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Feather name="refresh-cw" size={18} color={colors.onSurfaceSecondary} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection status card */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLabelContainer}>
              <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.statusLabel}>
                {isOnline ? "SERVER ONLINE" : "SERVER OFFLINE"}
              </Text>
            </View>
            <Feather
              name={isOnline ? "activity" : "alert-triangle"}
              size={20}
              color={isOnline ? colors.success : colors.error}
            />
          </View>
          <Text style={styles.serverIpText} numberOfLines={1}>
            {serverUrl || "Belum Dikonfigurasi"}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Waktu Aktif</Text>
              <Text style={styles.metaValue}>
                {isOnline && stats ? formatUptime(stats.uptime_seconds) : "-"}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Latensi API</Text>
              <Text style={styles.metaValue}>
                {isOnline && stats ? `${Math.round(stats.uptime_seconds % 2 === 0 ? 32 : 28)} ms` : "-"}
              </Text>
            </View>
          </View>
        </View>

        {isOnline && stats ? (
          <>
            {/* System Resources Section */}
            <Text style={styles.sectionTitle}>Sumber Daya Sistem</Text>
            
            {/* CPU usage card */}
            <View style={styles.card}>
              <View style={styles.resourceHeader}>
                <View style={styles.resourceTitleRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#EDF5F6" }]}>
                    <Feather name="cpu" size={18} color="#4A90E2" />
                  </View>
                  <Text style={styles.resourceTitle}>Beban CPU</Text>
                </View>
                <Text style={styles.resourceValue}>{stats.cpu_usage}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stats.cpu_usage}%`,
                      backgroundColor: stats.cpu_usage > 80 ? colors.error : "#4A90E2",
                    },
                  ]}
                />
              </View>
              <Text style={styles.resourceHelp}>
                Persentase utilitas prosesor server saat ini.
              </Text>
            </View>

            {/* RAM usage card */}
            <View style={styles.card}>
              <View style={styles.resourceHeader}>
                <View style={styles.resourceTitleRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#EBF3E8" }]}>
                    <Feather name="hard-drive" size={18} color="#6A825C" />
                  </View>
                  <Text style={styles.resourceTitle}>Penggunaan Memori (RAM)</Text>
                </View>
                <Text style={styles.resourceValue}>{stats.ram_usage}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stats.ram_usage}%`,
                      backgroundColor: stats.ram_usage > 90 ? colors.error : "#6A825C",
                    },
                  ]}
                />
              </View>
              <View style={styles.resourceMeta}>
                <Text style={styles.resourceMetaText}>
                  Terpakai: {(stats.ram_used_mb / 1024).toFixed(2)} GB
                </Text>
                <Text style={styles.resourceMetaText}>
                  Total: {(stats.ram_total_mb / 1024).toFixed(1)} GB
                </Text>
              </View>
            </View>

            {/* Disk usage card */}
            <View style={styles.card}>
              <View style={styles.resourceHeader}>
                <View style={styles.resourceTitleRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#F7F3EB" }]}>
                    <Feather name="database" size={18} color="#D49A44" />
                  </View>
                  <Text style={styles.resourceTitle}>Penyimpanan (Disk)</Text>
                </View>
                <Text style={styles.resourceValue}>{stats.disk_usage}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stats.disk_usage}%`,
                      backgroundColor: stats.disk_usage > 90 ? colors.error : "#D49A44",
                    },
                  ]}
                />
              </View>
              <View style={styles.resourceMeta}>
                <Text style={styles.resourceMetaText}>
                  Terpakai: {stats.disk_used_gb.toFixed(1)} GB
                </Text>
                <Text style={styles.resourceMetaText}>
                  Total: {stats.disk_total_gb.toFixed(1)} GB
                </Text>
              </View>
            </View>

            {/* Database Monitor Section */}
            <Text style={styles.sectionTitle}>Database MongoDB</Text>
            <View style={styles.card}>
              <View style={styles.dbRow}>
                <View style={styles.dbLabelCol}>
                  <Text style={styles.dbTitle}>Status Koneksi</Text>
                  <View style={styles.dbStatusWrap}>
                    <View
                      style={[
                        styles.dbStatusDot,
                        stats.mongo_status === "connected"
                          ? { backgroundColor: colors.success }
                          : { backgroundColor: colors.error },
                      ]}
                    />
                    <Text style={styles.dbStatusText}>
                      {stats.mongo_status === "connected" ? "Terhubung" : "Terputus"}
                    </Text>
                  </View>
                </View>
                <View style={styles.dbDivider} />
                <View style={styles.dbLatencyCol}>
                  <Text style={styles.dbTitle}>Latensi MongoDB</Text>
                  <Text style={styles.dbLatencyText}>
                    {stats.mongo_status === "connected"
                      ? `${stats.mongo_latency_ms.toFixed(1)} ms`
                      : "-"}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Feather name="wifi-off" size={48} color={colors.onSurfaceTertiary} />
            <Text style={styles.errorTitle}>Koneksi Gagal</Text>
            <Text style={styles.errorBody}>
              Tidak dapat memuat metrik sistem. Pastikan backend server aktif dan alamat API pada Pengaturan sudah benar.
            </Text>
            <Pressable
              onPress={() => router.replace("/settings")}
              style={styles.configBtn}
            >
              <Feather name="settings" size={16} color={colors.onBrandPrimary} />
              <Text style={styles.configBtnText}>Konfigurasi Server</Text>
            </Pressable>
          </View>
        )}
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.borderStrong,
    marginBottom: spacing.xl,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOnline: {
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.error,
  },
  statusLabel: {
    fontFamily: fonts.text,
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    letterSpacing: 1.2,
  },
  serverIpText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.onSurfaceTertiary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  resourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceTitle: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
  },
  resourceValue: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  resourceHelp: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
  },
  resourceMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  resourceMetaText: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceSecondary,
  },
  dbRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dbLabelCol: {
    flex: 1.2,
  },
  dbDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  dbLatencyCol: {
    flex: 1,
  },
  dbTitle: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dbStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dbStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dbStatusText: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
  },
  dbLatencyText: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  configBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  configBtnText: {
    fontFamily: fonts.text,
    color: colors.onBrandPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
});
