import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppDrawer from "@/src/components/AppDrawer";
import { Drug, drugsStore } from "@/src/store/drugs";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function ObatkuScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [komposisi, setKomposisi] = useState("");
  const [dosisAturanPakai, setDosisAturanPakai] = useState("");
  const [kegunaanIndikasi, setKegunaanIndikasi] = useState("");
  const [efekSamping, setEfekSamping] = useState("");
  const [peringatanKontradiksi, setPeringatanKontradiksi] = useState("");
  const [merekDagang, setMerekDagang] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  // UI States
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Muat daftar obat
  const loadDrugs = async () => {
    try {
      const list = await drugsStore.getDrugs();
      setDrugs(list);
    } catch (e) {
      console.warn("Gagal memuat daftar obat:", e);
    }
  };

  useEffect(() => {
    loadDrugs();
  }, []);

  // Cari detail obat otomatis dari internet (Gemini API)
  const handleAutoSearch = async () => {
    if (!name.trim()) {
      Alert.alert("Input Kosong", "Silakan masukkan nama obat terlebih dahulu.");
      return;
    }
    Keyboard.dismiss();
    setSearching(true);
    setWarning(null);
    try {
      const info = await drugsStore.fetchInfo(name);
      setKomposisi(info.komposisi || "");
      setDosisAturanPakai(info.dosis_aturan_pakai || "");
      setKegunaanIndikasi(info.kegunaan_indikasi || "");
      setEfekSamping(info.efek_samping || "");
      setPeringatanKontradiksi(info.peringatan_kontradiksi || "");
      setMerekDagang(info.merek_dagang || "");
      setWarning(info.warning || null);
      if (info.name) {
        setName(info.name);
      }
    } catch (e: any) {
      Alert.alert(
        "Pencarian Gagal",
        e?.message || "Gagal mengambil informasi obat otomatis. Silakan coba lagi."
      );
    } finally {
      setSearching(false);
    }
  };

  // Simpan obat ke database lokal
  const handleSaveDrug = async () => {
    if (!name.trim()) {
      Alert.alert("Input Kosong", "Nama obat harus diisi sebelum disimpan.");
      return;
    }
    setSaving(true);
    try {
      await drugsStore.saveDrug({
        name: name.trim(),
        komposisi: komposisi.trim(),
        dosis_aturan_pakai: dosisAturanPakai.trim(),
        kegunaan_indikasi: kegunaanIndikasi.trim(),
        efek_samping: efekSamping.trim(),
        peringatan_kontradiksi: peringatanKontradiksi.trim(),
        merek_dagang: merekDagang.trim(),
      });
      // Reset form
      setName("");
      setKomposisi("");
      setDosisAturanPakai("");
      setKegunaanIndikasi("");
      setEfekSamping("");
      setPeringatanKontradiksi("");
      setMerekDagang("");
      setWarning(null);
      // Reload list
      await loadDrugs();
      Alert.alert("Sukses", "Data obat berhasil disimpan!");
    } catch (e) {
      Alert.alert("Error", "Gagal menyimpan data obat.");
    } finally {
      setSaving(false);
    }
  };

  // Hapus obat
  const handleDeleteDrug = async (id: string) => {
    Alert.alert(
      "Hapus Obat",
      "Apakah Anda yakin ingin menghapus data obat ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await drugsStore.deleteDrug(id);
            loadDrugs();
          },
        },
      ]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header Premium */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          testID="open-drawer-btn"
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          style={styles.menuBtn}
        >
          <Feather name="menu" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Obatku</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Pencatatan & Cari Obat</Text>
        <Text style={styles.sectionSubtitle}>
          Ketikkan nama obat untuk menelusuri detail medisnya secara otomatis, atau isi formulir secara manual.
        </Text>

        {/* Input Nama & Pencarian */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nama Obat</Text>
          <View style={styles.searchRow}>
            <TextInput
              testID="drug-name-input"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (warning) setWarning(null);
              }}
              placeholder="Contoh: Paracetamol, Ibuprofen..."
              style={styles.nameInput}
            />
            <Pressable
              testID="drug-search-btn"
              onPress={handleAutoSearch}
              disabled={searching}
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && { opacity: 0.85 },
                searching && { opacity: 0.6 },
              ]}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Feather name="cpu" size={14} color={colors.onBrandPrimary} />
                  <Text style={styles.searchBtnText}>Cari Info ✨</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Detail Form */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Detail Informasi Obat</Text>

          {/* Warning Banner */}
          {warning ? (
            <View style={styles.warningBanner} testID="drug-warning-banner">
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ) : null}

          {/* Komposisi */}
          <Text style={styles.fieldLabelSmall}>Komposisi</Text>
          <TextInput
            testID="drug-composition-input"
            value={komposisi}
            onChangeText={setKomposisi}
            placeholder="Kandungan zat aktif obat..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Dosis / Aturan pakai */}
          <Text style={styles.fieldLabelSmall}>Dosis / Aturan pakai</Text>
          <TextInput
            testID="drug-dosing-input"
            value={dosisAturanPakai}
            onChangeText={setDosisAturanPakai}
            placeholder="Dosis lazim dan aturan pakai obat..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Kegunaan / indikasi */}
          <Text style={styles.fieldLabelSmall}>Kegunaan / indikasi</Text>
          <TextInput
            testID="drug-use-indication-input"
            value={kegunaanIndikasi}
            onChangeText={setKegunaanIndikasi}
            placeholder="Manfaat, kegunaan, dan indikasi medis utama obat..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Efek samping */}
          <Text style={styles.fieldLabelSmall}>Efek samping</Text>
          <TextInput
            testID="drug-side-effect-input"
            value={efekSamping}
            onChangeText={setEfekSamping}
            placeholder="Efek samping yang mungkin terjadi..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Peringatan & Kontradiksi */}
          <Text style={styles.fieldLabelSmall}>Peringatan & Kontradiksi</Text>
          <TextInput
            testID="drug-warning-contra-input"
            value={peringatanKontradiksi}
            onChangeText={setPeringatanKontradiksi}
            placeholder="Peringatan penggunaan dan kontraindikasi medis..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Merek Dagang */}
          <Text style={styles.fieldLabelSmall}>Merek Dagang</Text>
          <TextInput
            testID="drug-brands-input"
            value={merekDagang}
            onChangeText={setMerekDagang}
            placeholder="Contoh merek dagang di pasaran..."
            multiline
            style={[styles.multilineInput, { minHeight: 60 }]}
          />

          {/* Save Button */}
          <Pressable
            testID="drug-save-btn"
            onPress={handleSaveDrug}
            disabled={saving || !name.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85 },
              (saving || !name.trim()) && { opacity: 0.5 },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onBrandPrimary} />
            ) : (
              <>
                <Feather name="plus-circle" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.saveBtnText}>Simpan ke Daftar Obat</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Daftar Obat */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Daftar Obat Saya</Text>
        <Text style={styles.sectionSubtitle}>
          Koleksi obat pribadi yang terdaftar untuk acuan penggunaan cepat Anda.
        </Text>

        {drugs.length === 0 ? (
          <View style={styles.emptyWrap} testID="drug-empty-state">
            <Feather name="folder" size={32} color={colors.onSurfaceTertiary} />
            <Text style={styles.emptyText}>Belum ada obat yang disimpan. Ketik obat di atas untuk menambahkan!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {drugs.map((drug) => {
              const isExpanded = expandedId === drug.id;
              return (
                <View key={drug.id} style={styles.drugItemCard} testID={`drug-card-${drug.id}`}>
                  {/* Header Kartu */}
                  <Pressable
                    onPress={() => toggleExpand(drug.id)}
                    style={styles.drugItemHeader}
                  >
                    <View style={styles.drugTitleCol}>
                      <Text style={styles.drugItemName}>{drug.name}</Text>
                      <Text style={styles.drugItemDate}>
                        Disimpan: {new Date(drug.createdAt).toLocaleDateString("id-ID")}
                      </Text>
                    </View>
                    <View style={styles.drugHeaderActions}>
                      <Pressable
                        testID={`drug-delete-${drug.id}`}
                        onPress={() => handleDeleteDrug(drug.id)}
                        hitSlop={8}
                        style={styles.deleteBtn}
                      >
                        <Feather name="trash-2" size={16} color={colors.error} />
                      </Pressable>
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.onSurfaceSecondary}
                      />
                    </View>
                  </Pressable>

                  {/* Konten Expandable */}
                  {isExpanded ? (
                    <View style={styles.drugItemBody} testID={`drug-detail-${drug.id}`}>
                      <View style={styles.divider} />

                       {drug.komposisi ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Komposisi</Text>
                          <Text style={styles.infoVal}>{drug.komposisi}</Text>
                        </View>
                      ) : null}

                      {drug.dosis_aturan_pakai ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Dosis / Aturan pakai</Text>
                          <Text style={styles.infoVal}>{drug.dosis_aturan_pakai}</Text>
                        </View>
                      ) : null}

                      {drug.kegunaan_indikasi ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Kegunaan / indikasi</Text>
                          <Text style={styles.infoVal}>{drug.kegunaan_indikasi}</Text>
                        </View>
                      ) : null}

                      {drug.efek_samping ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Efek samping</Text>
                          <Text style={styles.infoVal}>{drug.efek_samping}</Text>
                        </View>
                      ) : null}

                      {drug.peringatan_kontradiksi ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Peringatan & Kontradiksi</Text>
                          <Text style={styles.infoVal}>{drug.peringatan_kontradiksi}</Text>
                        </View>
                      ) : null}

                      {drug.merek_dagang ? (
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Merek Dagang</Text>
                          <Text style={styles.infoVal}>{drug.merek_dagang}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Drawer */}
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="obatku" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "600",
    color: colors.onSurface,
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeaderTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  fieldLabelSmall: {
    fontFamily: fonts.text,
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurface,
  },
  searchBtn: {
    flexDirection: "row",
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  searchBtnText: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onBrandPrimary,
  },
  multilineInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSecondary,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  saveBtnText: {
    fontFamily: fonts.text,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onBrandSecondary,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    lineHeight: 18,
  },
  listContainer: {
    gap: spacing.sm,
  },
  drugItemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  drugItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  drugTitleCol: {
    flex: 1,
  },
  drugItemName: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: "600",
    color: colors.onSurface,
  },
  drugItemDate: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  drugHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCE8E6",
  },
  drugItemBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  infoBlock: {
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontFamily: fonts.text,
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoVal: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF6ED",
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 12,
    color: "#7B5927",
    lineHeight: 18,
  },
});
