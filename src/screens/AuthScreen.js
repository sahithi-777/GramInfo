import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";

function PrimaryButton({ title, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.buttonPrimary}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 980;

  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [panchayatName, setPanchayatName] = useState("");
  const [villageName, setVillageName] = useState("");
  const [busy, setBusy] = useState(false);

  const { signIn } = useAuthActions();
  const upsertProfile = useMutation("profiles:upsert");

  const shellStyle = useMemo(() => [styles.shell, wide && styles.shellWide], [wide]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }

    if (mode === "signUp") {
      if (!fullName.trim() || !phone.trim() || !designation.trim() || !panchayatName.trim() || !villageName.trim()) {
        Alert.alert("Validation", "Please complete all signup fields.");
        return;
      }
    }

    try {
      setBusy(true);
      await signIn("password", {
        flow: mode,
        email: email.trim().toLowerCase(),
        password,
      });

      if (mode === "signUp") {
        for (let i = 0; i < 6; i += 1) {
          try {
            await upsertProfile({
              fullName: fullName.trim(),
              phone: phone.trim(),
              designation: designation.trim(),
              panchayatName: panchayatName.trim(),
              villageName: villageName.trim(),
            });
            break;
          } catch {
            await sleep(300);
          }
        }
      }
    } catch (err) {
      Alert.alert("Authentication failed", err?.message || "Could not continue with authentication.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={shellStyle}>
            <ImageBackground source={require("../../assets/landing.png")} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
              <View style={styles.heroOverlay}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Government Digital Governance</Text>
                </View>
                <Text style={styles.heroTitle}>GramInfo</Text>
                <Text style={styles.heroSubtitle}>Panchayat Household Intelligence Platform with QR-first workflows.</Text>
                <View style={styles.heroStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>QR</Text>
                    <Text style={styles.statLabel}>House Tagging</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>Live</Text>
                    <Text style={styles.statLabel}>Record Updates</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>CSV/PDF</Text>
                    <Text style={styles.statLabel}>Exports</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>

            <View style={styles.authPanel}>
              <Image source={require("../../assets/icon.png")} style={styles.logo} />
              <Text style={styles.panelTitle}>{mode === "signIn" ? "Welcome Back" : "Create Account"}</Text>
              <Text style={styles.panelSubtitle}>Use your official details to access GramInfo administration.</Text>

              <View style={styles.modeSwitch}>
                <Pressable style={[styles.modeBtn, mode === "signIn" && styles.modeBtnActive]} onPress={() => setMode("signIn")}>
                  <Text style={[styles.modeBtnText, mode === "signIn" && styles.modeBtnTextActive]}>Sign In</Text>
                </Pressable>
                <Pressable style={[styles.modeBtn, mode === "signUp" && styles.modeBtnActive]} onPress={() => setMode("signUp")}>
                  <Text style={[styles.modeBtnText, mode === "signUp" && styles.modeBtnTextActive]}>Sign Up</Text>
                </Pressable>
              </View>

              <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

              {mode === "signUp" ? (
                <>
                  <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
                  <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                  <TextInput style={styles.input} placeholder="Designation" value={designation} onChangeText={setDesignation} />
                  <TextInput style={styles.input} placeholder="Panchayat Name" value={panchayatName} onChangeText={setPanchayatName} />
                  <TextInput style={styles.input} placeholder="Village Name" value={villageName} onChangeText={setVillageName} />
                </>
              ) : null}

              <PrimaryButton title={busy ? "Please wait..." : mode === "signIn" ? "Sign In to Dashboard" : "Create Account"} onPress={submit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#dbe7f5" },
  keyboardRoot: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 14, paddingBottom: 32 },
  shell: { flex: 1, gap: 12 },
  shellWide: { flexDirection: "row" },

  hero: {
    flex: 1,
    minHeight: 260,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#103557",
    justifyContent: "flex-end",
  },
  heroImage: { opacity: 0.25 },
  heroOverlay: { padding: 18, backgroundColor: "rgba(10, 28, 46, 0.55)", gap: 10 },
  heroBadge: { alignSelf: "flex-start", backgroundColor: "#f8fafc", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  heroBadgeText: { color: "#0f172a", fontWeight: "700", fontSize: 11 },
  heroTitle: { color: "#ffffff", fontSize: 38, fontWeight: "900" },
  heroSubtitle: { color: "#e2e8f0", fontSize: 15, maxWidth: 480 },
  heroStats: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statBox: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  statValue: { color: "#fff", fontWeight: "800", fontSize: 13 },
  statLabel: { color: "#e2e8f0", fontSize: 12, marginTop: 2 },

  authPanel: {
    flex: 1,
    minHeight: 420,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 16,
    gap: 10,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  panelTitle: { fontSize: 26, fontWeight: "900", color: "#0f172a" },
  panelSubtitle: { color: "#475569", marginBottom: 4 },

  modeSwitch: { flexDirection: "row", backgroundColor: "#e5e7eb", borderRadius: 10, padding: 4 },
  modeBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  modeBtnActive: { backgroundColor: "#0f766e" },
  modeBtnText: { color: "#1f2937", fontWeight: "700" },
  modeBtnTextActive: { color: "#ffffff" },

  input: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  buttonPrimary: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    marginTop: 4,
  },
  buttonText: { color: "#ffffff", fontWeight: "800" },
});
