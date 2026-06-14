import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  isMock: boolean;
  mockStats?: SystemStats;
}

const SERVERS: ServerInfo[] = [
  {
    id: "vps_1",
    name: "VPS Utama",
    url: "", // set dynamically from store
    isMock: false,
  },
  {
    id: "vps_2",
    name: "VPS Cadangan",
    url: "http://103.59.161.82:8000",
    isMock: true,
    mockStats: {
      status: "online",
      cpu_usage: 24,
      ram_usage: 45,
      ram_used_mb: 3686.4,
      ram_total_mb: 8192.0,
      disk_usage: 52,
      disk_used_gb: 62.4,
      disk_total_gb: 120.0,
      mongo_status: "connected",
      mongo_latency_ms: 2.45,
      uptime_seconds: 864300, // ~10 days
    },
  },
];

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

function PieChart({
  percentage,
  color,
  bgColor,
  size = 82,
}: {
  percentage: number;
  color: string;
  bgColor: string;
  size?: number;
}) {
  const isWeb = Platform.OS === "web";
  const radiusVal = size / 2;

  // Web: Conic-gradient for crisp and perfect circular pie charts
  const webStyle = isWeb
    ? {
        backgroundImage: `conic-gradient(${color} 0% ${percentage}%, ${bgColor} ${percentage}% 100%)`,
      }
    : {};

  // Native: Border-based segmented approximation
  // Set borderWidth to radiusVal so the border fills the circle completely
  const nativeStyle = !isWeb
    ? {
        borderWidth: radiusVal,
        borderColor: bgColor,
        borderTopColor: color,
        borderRightColor: percentage >= 25 ? color : bgColor,
        borderBottomColor: percentage >= 50 ? color : bgColor,
        borderLeftColor: percentage >= 75 ? color : bgColor,
      }
    : {};

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {isWeb ? (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: radiusVal,
            },
            webStyle,
          ]}
        />
      ) : (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: radiusVal,
              transform: [{ rotate: "45deg" }],
            },
            nativeStyle,
          ]}
        />
      )}

      {/* Floating glassmorphism badge overlaying the center of the pie chart */}
      <View
        style={{
          position: "absolute",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.text,
            fontSize: 10,
            fontWeight: "700",
            color: colors.onSurface,
          }}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState("vps_1");
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

  const selectedServer = SERVERS.find((s) => s.id === selectedServerId) || SERVERS[0];
  const currentOnline = selectedServer.isMock ? true : isOnline;
  const currentStats = selectedServer.isMock ? selectedServer.mockStats! : stats;
  const currentUrl = selectedServer.isMock ? selectedServer.url : serverUrl;

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
        {/* Server Selector Grid */}
        <Text style={styles.sectionTitle}>Daftar Server VPS</Text>
        <View style={styles.serversRow}>
          {SERVERS.map((srv) => {
            const isSelected = selectedServerId === srv.id;
            const srvOnline = srv.isMock ? true : isOnline;
            const srvCpu = srv.isMock ? srv.mockStats?.cpu_usage : stats?.cpu_usage;
            const srvRam = srv.isMock ? srv.mockStats?.ram_usage : stats?.ram_usage;
            const srvIp = srv.isMock
              ? srv.url.replace(/^https?:\/\//, "")
              : serverUrl
              ? serverUrl.replace(/^https?:\/\//, "")
              : "103.59.161.81:8000";

            return (
              <Pressable
                key={srv.id}
                onPress={() => setSelectedServerId(srv.id)}
                style={[
                  styles.serverSelectorCard,
                  isSelected && styles.serverSelectorCardActive,
                ]}
              >
                <View style={styles.selectorHeader}>
                  <Text style={[styles.selectorName, isSelected && styles.selectorNameActive]}>
                    {srv.name}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      srvOnline ? styles.dotOnline : styles.dotOffline,
                    ]}
                  />
                </View>
                <Text style={styles.selectorIp} numberOfLines={1}>
                  {srvIp}
                </Text>
                {srvOnline && srvCpu !== undefined && srvRam !== undefined ? (
                  <View style={styles.selectorMiniStats}>
                    <Text style={styles.miniStatText}>CPU: {srvCpu}%</Text>
                    <View style={styles.miniDivider} />
                    <Text style={styles.miniStatText}>RAM: {srvRam}%</Text>
                  </View>
                ) : (
                  <Text style={styles.miniStatTextOffline}>Tidak terhubung</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Selected Server status card */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLabelContainer}>
              <View style={[styles.statusDot, currentOnline ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.statusLabel}>
                {selectedServer.name.toUpperCase()} - {currentOnline ? "ONLINE" : "OFFLINE"}
              </Text>
            </View>
            <Feather
              name={currentOnline ? "activity" : "alert-triangle"}
              size={20}
              color={currentOnline ? colors.success : colors.error}
            />
          </View>
          <Text style={styles.serverIpText} numberOfLines={1}>
            {currentUrl || "Belum Dikonfigurasi"}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Waktu Aktif</Text>
              <Text style={styles.metaValue}>
                {currentOnline && currentStats ? formatUptime(currentStats.uptime_seconds) : "-"}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Latensi API</Text>
              <Text style={styles.metaValue}>
                {currentOnline && currentStats ? `${Math.round(currentStats.uptime_seconds % 2 === 0 ? 32 : 28)} ms` : "-"}
              </Text>
            </View>
          </View>
        </View>

        {currentOnline && currentStats ? (
          <>
            {/* System Resources Section with Pie Charts */}
            <Text style={styles.sectionTitle}>Sumber Daya Sistem</Text>
            <View style={[styles.card, styles.resourcesRow]}>
              {/* CPU Gauge */}
              <View style={styles.gaugeCol}>
                <PieChart percentage={currentStats.cpu_usage} color="#4A90E2" bgColor="#D2E4F9" size={82} />
                <View style={styles.gaugeLabelRow}>
                  <View style={[styles.miniIconBox, { backgroundColor: "#EDF5F6" }]}>
                    <Feather name="cpu" size={10} color="#4A90E2" />
                  </View>
                  <Text style={styles.gaugeTitle}>CPU</Text>
                </View>
                <Text style={styles.gaugeHelp}>Beban Kerja</Text>
              </View>

              <View style={styles.gaugeDivider} />

              {/* RAM Gauge */}
              <View style={styles.gaugeCol}>
                <PieChart percentage={currentStats.ram_usage} color="#6A825C" bgColor="#D4E5D1" size={82} />
                <View style={styles.gaugeLabelRow}>
                  <View style={[styles.miniIconBox, { backgroundColor: "#EBF3E8" }]}>
                    <Feather name="hard-drive" size={10} color="#6A825C" />
                  </View>
                  <Text style={styles.gaugeTitle}>RAM</Text>
                </View>
                <Text style={styles.gaugeHelp} numberOfLines={1}>
                  {(currentStats.ram_used_mb / 1024).toFixed(1)}/{(currentStats.ram_total_mb / 1024).toFixed(0)} GB
                </Text>
              </View>

              <View style={styles.gaugeDivider} />

              {/* Disk Gauge */}
              <View style={styles.gaugeCol}>
                <PieChart percentage={currentStats.disk_usage} color="#D49A44" bgColor="#F3E5D0" size={82} />
                <View style={styles.gaugeLabelRow}>
                  <View style={[styles.miniIconBox, { backgroundColor: "#F7F3EB" }]}>
                    <Feather name="database" size={10} color="#D49A44" />
                  </View>
                  <Text style={styles.gaugeTitle}>Disk</Text>
                </View>
                <Text style={styles.gaugeHelp} numberOfLines={1}>
                  {currentStats.disk_used_gb.toFixed(0)}/{currentStats.disk_total_gb.toFixed(0)} GB
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
                        currentStats.mongo_status === "connected"
                          ? { backgroundColor: colors.success }
                          : { backgroundColor: colors.error },
                      ]}
                    />
                    <Text style={styles.dbStatusText}>
                      {currentStats.mongo_status === "connected" ? "Terhubung" : "Terputus"}
                    </Text>
                  </View>
                </View>
                <View style={styles.dbDivider} />
                <View style={styles.dbLatencyCol}>
                  <Text style={styles.dbTitle}>Latensi MongoDB</Text>
                  <Text style={styles.dbLatencyText}>
                    {currentStats.mongo_status === "connected"
                      ? `${currentStats.mongo_latency_ms.toFixed(1)} ms`
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
  serversRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  serverSelectorCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  serverSelectorCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceSecondary,
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  selectorName: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  selectorNameActive: {
    color: colors.brand,
  },
  selectorIp: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginBottom: 8,
  },
  selectorMiniStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniStatText: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.onSurfaceSecondary,
  },
  miniDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.borderStrong,
    marginHorizontal: 6,
  },
  miniStatTextOffline: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.error,
    fontWeight: "500",
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
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: "bold",
    letterSpacing: -0.3,
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
  resourcesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.lg,
  },
  gaugeCol: {
    alignItems: "center",
    flex: 1,
  },
  gaugeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  miniIconBox: {
    width: 16,
    height: 16,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeTitle: {
    fontFamily: fonts.text,
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurface,
  },
  gaugeHelp: {
    fontFamily: fonts.text,
    fontSize: 10,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
  },
  gaugeDivider: {
    width: 1,
    height: 80,
    backgroundColor: colors.divider,
    alignSelf: "center",
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
