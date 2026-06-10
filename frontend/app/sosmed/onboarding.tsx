import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
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

import { AVATAR_OPTIONS, readProfile, saveProfile } from "@/src/store/profile";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await readProfile();
      if (existing) {
        setEditing(true);
        setNickname(existing.nickname);
        setAvatar(existing.avatar);
        setBio(existing.bio);
      }
    })();
  }, []);

  const onSave = async () => {
    const n = nickname.trim();
    if (!n) {
      setError("Nama dapur wajib diisi.");
      return;
    }
    if (n.length > 32) {
      setError("Nama dapur maksimal 32 karakter.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ nickname: n, avatar, bio });
      if (router.canGoBack()) router.back();
      else router.replace("/sosmed");
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="onboarding-close-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? "Ubah dapur" : "Bikin dapur"}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingTop: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar preview */}
        <View style={styles.previewWrap}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{avatar}</Text>
          </View>
          <Text style={styles.previewName}>{nickname || "Dapur kamu"}</Text>
          {bio.trim() ? <Text style={styles.previewBio}>{bio}</Text> : null}
        </View>

        <Text style={styles.fieldLabel}>Pilih ikon</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((a) => {
            const active = a === avatar;
            return (
              <Pressable
                key={a}
                testID={`avatar-${a}`}
                onPress={() => setAvatar(a)}
                style={[styles.avatarOption, active && styles.avatarOptionActive]}
              >
                <Text style={styles.avatarOptionText}>{a}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Nama dapur</Text>
        <TextInput
          testID="nickname-input"
          value={nickname}
          onChangeText={setNickname}
          placeholder="mis. Dapur Mama Rini"
          placeholderTextColor={colors.onSurfaceTertiary}
          maxLength={32}
          style={styles.input}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Bio (opsional)</Text>
        <TextInput
          testID="bio-input"
          value={bio}
          onChangeText={setBio}
          placeholder="Ceritakan dapurmu dalam satu kalimat"
          placeholderTextColor={colors.onSurfaceTertiary}
          maxLength={160}
          multiline
          style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
        />

        {error ? (
          <Text testID="onboarding-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md },
        ]}
      >
        <Pressable
          testID="onboarding-save-btn"
          onPress={onSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        >
          <Feather name="check" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.saveBtnText}>
            {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Buat dapur saya"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

  previewWrap: { alignItems: "center", marginBottom: spacing.xl, gap: spacing.sm },
  avatarBig: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBigText: { fontSize: 48 },
  previewName: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, marginTop: spacing.sm },
  previewBio: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, textAlign: "center" },

  fieldLabel: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  avatarOptionActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  avatarOptionText: { fontSize: 24 },

  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
  },
  error: {
    fontFamily: fonts.text,
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },

  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  saveBtnText: { fontFamily: fonts.text, color: colors.onBrandPrimary, fontSize: 15, fontWeight: "500" },
});
