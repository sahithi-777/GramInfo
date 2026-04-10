import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import Papa from "papaparse";
import QRCode from "react-native-qrcode-svg";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SafeAreaView } from "react-native-safe-area-context";

const tabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "add", label: "Add Household" },
  { key: "members", label: "Members & Schemes" },
  { key: "qr", label: "QR Center" },
  { key: "reports", label: "Reports" },
];
const PAGE_SIZE = 8;
const GENDER_OPTIONS = ["Male", "Female", "Other"];

function PrimaryButton({ title, onPress, danger = false }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, danger ? styles.buttonDanger : styles.buttonPrimary]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function OutlineButton({ title, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.buttonOutline}>
      <Text style={styles.buttonOutlineText}>{title}</Text>
    </Pressable>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

export default function MainAppScreen() {
  const { signOut } = useAuthActions();
  const convex = useConvex();
  const { width } = useWindowDimensions();
  const isPhone = width < 760;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [dashboardPage, setDashboardPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrLookupCode, setQrLookupCode] = useState("");
  const [scanPreview, setScanPreview] = useState(null);
  const scanningRef = useRef(false);
  const qrSvgRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();

  const normalizeGender = (value) => {
    const v = (value || "").trim().toLowerCase();
    if (v === "male" || v === "m") return "Male";
    if (v === "female" || v === "f") return "Female";
    if (v === "other" || v === "o") return "Other";
    return "";
  };

  const extractHouseCode = (raw) => {
    const value = (raw || "").trim();
    if (!value) return "";

    // 1) URL payload: ...?houseCode=GH-...
    if (value.includes("houseCode=")) {
      try {
        const parsed = new URL(value);
        const fromUrl = parsed.searchParams.get("houseCode");
        if (fromUrl) return fromUrl.trim().toUpperCase();
      } catch {
        const tail = value.split("houseCode=")[1] || "";
        const decoded = decodeURIComponent(tail.split("&")[0] || "").trim();
        if (decoded) return decoded.toUpperCase();
      }
    }

    // 2) Raw code with noise/newlines around it.
    const compact = value.replace(/\s+/g, "").toUpperCase();
    const match = compact.match(/GH-[A-Z0-9]+-[A-Z0-9]+/);
    if (match?.[0]) return match[0];

    // 3) Assume entire payload is the code.
    return compact;
  };

  const [headName, setHeadName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [secondaryMobile, setSecondaryMobile] = useState("");
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [voterIdNumber, setVoterIdNumber] = useState("");
  const [editHeadName, setEditHeadName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const [editAadhaarNumber, setEditAadhaarNumber] = useState("");
  const [editSecondaryMobile, setEditSecondaryMobile] = useState("");
  const [editRationCardNumber, setEditRationCardNumber] = useState("");
  const [editVoterIdNumber, setEditVoterIdNumber] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");
  const [memberAge, setMemberAge] = useState("");
  const [memberDob, setMemberDob] = useState("");
  const [memberGender, setMemberGender] = useState("");
  const [memberAadhaar, setMemberAadhaar] = useState("");
  const [memberMobile, setMemberMobile] = useState("");
  const [memberMaritalStatus, setMemberMaritalStatus] = useState("");
  const [memberDisabilityStatus, setMemberDisabilityStatus] = useState("");
  const [memberOccupation, setMemberOccupation] = useState("");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberRelation, setEditMemberRelation] = useState("");
  const [editMemberAge, setEditMemberAge] = useState("");
  const [editMemberDob, setEditMemberDob] = useState("");
  const [editMemberGender, setEditMemberGender] = useState("");
  const [editMemberAadhaar, setEditMemberAadhaar] = useState("");
  const [editMemberMobile, setEditMemberMobile] = useState("");
  const [editMemberMaritalStatus, setEditMemberMaritalStatus] = useState("");
  const [editMemberDisabilityStatus, setEditMemberDisabilityStatus] = useState("");
  const [editMemberOccupation, setEditMemberOccupation] = useState("");

  const [schemeName, setSchemeName] = useState("");
  const [schemeStatus, setSchemeStatus] = useState("Enrolled");
  const [schemeBenefit, setSchemeBenefit] = useState("");
  const [schemeRemarks, setSchemeRemarks] = useState("");
  const [editingSchemeId, setEditingSchemeId] = useState(null);
  const [editSchemeName, setEditSchemeName] = useState("");
  const [editSchemeStatus, setEditSchemeStatus] = useState("Enrolled");
  const [editSchemeBenefit, setEditSchemeBenefit] = useState("");
  const [editSchemeRemarks, setEditSchemeRemarks] = useState("");

  const households = useQuery("households:list", { q: search || undefined }) || [];

  const createHousehold = useMutation("households:create");
  const updateHousehold = useMutation("households:update");
  const removeHousehold = useMutation("households:remove");
  const addMember = useMutation("households:addMember");
  const updateMember = useMutation("households:updateMember");
  const removeMember = useMutation("households:removeMember");
  const addScheme = useMutation("households:addScheme");
  const updateScheme = useMutation("households:updateScheme");
  const removeScheme = useMutation("households:removeScheme");
  const importCsvRows = useMutation("households:importCsvRows");
  const markHeadDeceasedAndPromoteEldest = useMutation("households:markHeadDeceasedAndPromoteEldest");

  const selectedHouse = useMemo(() => households.find((h) => h._id === selectedId) || null, [households, selectedId]);

  const summary = useMemo(() => {
    const houseCount = households.length;
    const memberCount = households.reduce((n, h) => n + (h.memberCount || 0), 0);
    const schemeCount = households.reduce((n, h) => n + (h.schemeCount || 0), 0);
    return { houseCount, memberCount, schemeCount };
  }, [households]);

  const totalPages = Math.max(1, Math.ceil(households.length / PAGE_SIZE));
  const pagedHouseholds = useMemo(() => {
    const start = (dashboardPage - 1) * PAGE_SIZE;
    return households.slice(start, start + PAGE_SIZE);
  }, [households, dashboardPage]);

  useEffect(() => {
    if (!selectedHouse) {
      setEditHeadName("");
      setEditAddress("");
      setEditPhone("");
      setEditAadhaarNumber("");
      setEditSecondaryMobile("");
      setEditRationCardNumber("");
      setEditVoterIdNumber("");
      return;
    }
    setEditHeadName(selectedHouse.headName || "");
    setEditAddress(selectedHouse.address || "");
    setEditPhone(selectedHouse.phone || "");
    setEditAadhaarNumber(selectedHouse.aadhaarNumber || "");
    setEditSecondaryMobile(selectedHouse.secondaryMobile || "");
    setEditRationCardNumber(selectedHouse.rationCardNumber || "");
    setEditVoterIdNumber(selectedHouse.voterIdNumber || "");
    setIsEditingHousehold(false);
  }, [selectedHouse?._id]);

  useEffect(() => {
    setDashboardPage(1);
  }, [search]);

  useEffect(() => {
    if (dashboardPage > totalPages) {
      setDashboardPage(totalPages);
    }
  }, [dashboardPage, totalPages]);

  const pickHousehold = (id, tabAfter = null) => {
    setSelectedId(id);
    if (tabAfter) setActiveTab(tabAfter);
  };

  const onCreateHousehold = async () => {
    if (!headName.trim() || !address.trim()) {
      Alert.alert("Validation", "Head name and address are mandatory.");
      return;
    }

    try {
      const id = await createHousehold({
        headName: headName.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        aadhaarNumber: aadhaarNumber.trim() || undefined,
        secondaryMobile: secondaryMobile.trim() || undefined,
        rationCardNumber: rationCardNumber.trim() || undefined,
        voterIdNumber: voterIdNumber.trim() || undefined,
        languagePreference: "en",
      });

      setHeadName("");
      setAddress("");
      setPhone("");
      setAadhaarNumber("");
      setSecondaryMobile("");
      setRationCardNumber("");
      setVoterIdNumber("");

      setSelectedId(id);
      setActiveTab("dashboard");
      Alert.alert("Success", "Household created successfully.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Could not create household.");
    }
  };

  const onAddMember = async () => {
    if (!selectedHouse) {
      Alert.alert("Select household", "Select a household first.");
      return;
    }
    if (!memberName.trim()) {
      Alert.alert("Validation", "Member name is required.");
      return;
    }
    if (selectedHouse && memberName.trim().toLowerCase() === (selectedHouse.headName || "").trim().toLowerCase()) {
      Alert.alert("Validation", "Head of family is already captured in household profile.");
      return;
    }

    await addMember({
      householdId: selectedHouse._id,
      name: memberName.trim(),
      relation: memberRelation.trim() || undefined,
      age: memberAge ? Number(memberAge) : undefined,
      dob: memberDob.trim() || undefined,
      gender: normalizeGender(memberGender) || undefined,
      aadhaarNumber: memberAadhaar.trim() || undefined,
      mobileNumber: memberMobile.trim() || undefined,
      maritalStatus: memberMaritalStatus.trim() || undefined,
      disabilityStatus: memberDisabilityStatus.trim() || undefined,
      occupation: memberOccupation.trim() || undefined,
    });

    setMemberName("");
    setMemberRelation("");
    setMemberAge("");
    setMemberDob("");
    setMemberGender("");
    setMemberAadhaar("");
    setMemberMobile("");
    setMemberMaritalStatus("");
    setMemberDisabilityStatus("");
    setMemberOccupation("");
  };

  const beginEditMember = (m) => {
    setEditingMemberId(m._id);
    setEditMemberName(m.name || "");
    setEditMemberRelation(m.relation || "");
    setEditMemberAge(m.age ? String(m.age) : "");
    setEditMemberDob(m.dob || "");
    setEditMemberGender(normalizeGender(m.gender));
    setEditMemberAadhaar(m.aadhaarNumber || "");
    setEditMemberMobile(m.mobileNumber || "");
    setEditMemberMaritalStatus(m.maritalStatus || "");
    setEditMemberDisabilityStatus(m.disabilityStatus || "");
    setEditMemberOccupation(m.occupation || "");
  };

  const onUpdateMember = async () => {
    if (!editingMemberId || !editMemberName.trim()) {
      Alert.alert("Validation", "Member name is required.");
      return;
    }
    try {
      await updateMember({
        memberId: editingMemberId,
        name: editMemberName.trim(),
        relation: editMemberRelation.trim() || undefined,
        age: editMemberAge ? Number(editMemberAge) : undefined,
        dob: editMemberDob.trim() || undefined,
        gender: normalizeGender(editMemberGender) || undefined,
        aadhaarNumber: editMemberAadhaar.trim() || undefined,
        mobileNumber: editMemberMobile.trim() || undefined,
        maritalStatus: editMemberMaritalStatus.trim() || undefined,
        disabilityStatus: editMemberDisabilityStatus.trim() || undefined,
        occupation: editMemberOccupation.trim() || undefined,
      });
      setEditingMemberId(null);
      Alert.alert("Updated", "Member updated successfully.");
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Could not update member.");
    }
  };

  const onAddScheme = async () => {
    if (!selectedHouse) {
      Alert.alert("Select household", "Select a household first.");
      return;
    }
    if (!schemeName.trim() || !schemeStatus.trim()) {
      Alert.alert("Validation", "Scheme name and status are required.");
      return;
    }

    await addScheme({
      householdId: selectedHouse._id,
      schemeName: schemeName.trim(),
      status: schemeStatus.trim(),
      benefitAmount: schemeBenefit ? Number(schemeBenefit) : undefined,
      remarks: schemeRemarks.trim() || undefined,
    });

    setSchemeName("");
    setSchemeStatus("Enrolled");
    setSchemeBenefit("");
    setSchemeRemarks("");
  };

  const beginEditScheme = (s) => {
    setEditingSchemeId(s._id);
    setEditSchemeName(s.schemeName || "");
    setEditSchemeStatus(s.status || "Enrolled");
    setEditSchemeBenefit(s.benefitAmount ? String(s.benefitAmount) : "");
    setEditSchemeRemarks(s.remarks || "");
  };

  const onUpdateScheme = async () => {
    if (!editingSchemeId || !editSchemeName.trim() || !editSchemeStatus.trim()) {
      Alert.alert("Validation", "Scheme name and status are required.");
      return;
    }
    try {
      await updateScheme({
        schemeId: editingSchemeId,
        schemeName: editSchemeName.trim(),
        status: editSchemeStatus.trim(),
        benefitAmount: editSchemeBenefit ? Number(editSchemeBenefit) : undefined,
        remarks: editSchemeRemarks.trim() || undefined,
      });
      setEditingSchemeId(null);
      Alert.alert("Updated", "Scheme updated successfully.");
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Could not update scheme.");
    }
  };

  const onRemoveMember = async (memberId) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Delete this member?")
        : await new Promise((resolve) =>
            Alert.alert("Delete member", "Are you sure you want to delete this member?", [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Delete", style: "destructive", onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    try {
      await removeMember({ memberId });
      Alert.alert("Deleted", "Member removed successfully.");
    } catch (err) {
      Alert.alert("Delete failed", err?.message || "Could not delete member.");
    }
  };

  const onRemoveScheme = async (schemeId) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Delete this scheme entry?")
        : await new Promise((resolve) =>
            Alert.alert("Delete scheme", "Are you sure you want to delete this scheme entry?", [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Delete", style: "destructive", onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    try {
      await removeScheme({ schemeId });
      Alert.alert("Deleted", "Scheme removed successfully.");
    } catch (err) {
      Alert.alert("Delete failed", err?.message || "Could not delete scheme.");
    }
  };

  const onScan = async ({ data }) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    try {
      const houseCode = extractHouseCode(data);

      if (!houseCode) {
        Alert.alert("Invalid", "QR content does not contain a household code.");
        return;
      }

      let found = await convex.query("households:getByCode", { houseCode: houseCode.trim().toUpperCase() });
      if (!found && data) {
        // Fallback: let backend try full raw payload matching.
        found = await convex.query("households:getByCode", { houseCode: String(data) });
      }
      if (found && (found.houseCode || "").trim().toUpperCase() !== houseCode.trim().toUpperCase()) {
        found = households.find((h) => (h.houseCode || "").trim().toUpperCase() === houseCode.trim().toUpperCase()) || null;
      }
      if (!found) {
        Alert.alert("Not Found", "No household is mapped to this QR code.");
        return;
      }

      setScanPreview(found);
      setSelectedId(found._id);
      setShowScanner(false);
      setActiveTab("members");
      Alert.alert("Matched", `${found.headName} (${found.houseCode})`);
    } catch (err) {
      Alert.alert("Invalid QR", err?.message || "Unable to parse this QR code.");
    } finally {
      setTimeout(() => {
        scanningRef.current = false;
      }, 700);
    }
  };

  const onFindByCode = async () => {
    try {
      const houseCode = qrLookupCode.trim().toUpperCase();
      if (!houseCode) {
        Alert.alert("Validation", "Enter a house code.");
        return;
      }
      let found = await convex.query("households:getByCode", { houseCode });
      if (!found) {
        // Frontend fallback in case backend has stale duplicates or sync lag.
        found = households.find((h) => (h.houseCode || "").trim().toUpperCase() === houseCode) || null;
      }
      if (found && (found.houseCode || "").trim().toUpperCase() !== houseCode) {
        found = households.find((h) => (h.houseCode || "").trim().toUpperCase() === houseCode) || null;
      }
      if (!found) {
        Alert.alert("Not Found", "No household is mapped to this code.");
        return;
      }
      setScanPreview(found);
      setSelectedId(found._id);
      setActiveTab("members");
      setQrLookupCode("");
      Alert.alert("Matched", `${found.headName} (${found.houseCode})`);
    } catch (err) {
      Alert.alert("Lookup failed", err?.message || "Unable to find household by code.");
    }
  };

  const onUpdateHousehold = async () => {
    if (!selectedHouse) return;
    if (!editHeadName.trim() || !editAddress.trim()) {
      Alert.alert("Validation", "Head name and address are mandatory.");
      return;
    }

    try {
      await updateHousehold({
        householdId: selectedHouse._id,
        headName: editHeadName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim() || undefined,
        aadhaarNumber: editAadhaarNumber.trim() || undefined,
        secondaryMobile: editSecondaryMobile.trim() || undefined,
        rationCardNumber: editRationCardNumber.trim() || undefined,
        voterIdNumber: editVoterIdNumber.trim() || undefined,
        languagePreference: "en",
      });
      setIsEditingHousehold(false);
      Alert.alert("Updated", "Household profile updated.");
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Could not update household.");
    }
  };

  const onDeleteHousehold = async () => {
    if (!selectedHouse) return;
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Delete this household and all linked members/schemes?")
        : await new Promise((resolve) =>
            Alert.alert("Delete household", "This will remove household, members and schemes.", [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Delete", style: "destructive", onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    try {
      await removeHousehold({ householdId: selectedHouse._id });
      setSelectedId(null);
      Alert.alert("Deleted", "Household removed successfully.");
    } catch (err) {
      Alert.alert("Delete failed", err?.message || "Could not delete household.");
    }
  };

  const onMarkHeadDeceased = async () => {
    if (!selectedHouse) return;
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Mark current head as deceased and promote eldest living member as new head?")
        : await new Promise((resolve) =>
            Alert.alert("Promote Eldest", "Mark current head as deceased and promote eldest living member as new head?", [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Continue", onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;

    try {
      const result = await markHeadDeceasedAndPromoteEldest({
        householdId: selectedHouse._id,
      });
      if (result?.promoted) {
        Alert.alert("Head Updated", `${result.previousHead} -> ${result.newHeadName}`);
      } else {
        Alert.alert("No Eligible Member", "No living member available to promote. Household is marked as head pending.");
      }
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Could not promote eldest member.");
    }
  };

  const downloadOnWeb = (content, fileName, mimeType) => {
    if (Platform.OS !== "web") return false;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };

  const shareFile = async (path) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Share unavailable", "Sharing is not available on this device.");
      return;
    }
    await Sharing.shareAsync(path);
  };

  const saveTextToAndroidFolder = async (fileName, mimeType, text) => {
    if (Platform.OS !== "android") return false;
    const saf = FileSystem.StorageAccessFramework;
    if (!saf) return false;

    const perm = await saf.requestDirectoryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Select a folder to save the exported file.");
      return true;
    }

    const fileUri = await saf.createFileAsync(perm.directoryUri, fileName, mimeType);
    await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });
    Alert.alert("Saved", `${fileName} saved to selected folder.`);
    return true;
  };

  const saveBase64ToAndroidFolder = async (sourceUri, fileName, mimeType) => {
    if (Platform.OS !== "android") return false;
    const saf = FileSystem.StorageAccessFramework;
    if (!saf) return false;

    const perm = await saf.requestDirectoryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Select a folder to save the exported file.");
      return true;
    }

    const fileUri = await saf.createFileAsync(perm.directoryUri, fileName, mimeType);
    const base64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    Alert.alert("Saved", `${fileName} saved to selected folder.`);
    return true;
  };

  const downloadFromUrlOnWeb = async (url, fileName) => {
    if (Platform.OS !== "web") return false;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Could not generate sticker image.");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      Alert.alert("Downloaded", "QR sticker downloaded successfully.");
      return true;
    } catch (err) {
      window.open(url, "_blank");
      Alert.alert("Opened", err?.message || "Opened sticker image in a new tab.");
      return true;
    }
  };

  const onImportCsv = async () => {
    let text = "";
    if (Platform.OS === "web") {
      text = await new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,text/csv";
        input.onchange = async (event) => {
          const file = event.target.files?.[0];
          if (!file) return resolve("");
          resolve(await file.text());
        };
        input.onerror = () => reject(new Error("Could not read file"));
        input.click();
      });
      if (!text) return;
    } else {
      const pick = await DocumentPicker.getDocumentAsync({ type: "text/csv" });
      if (pick.canceled) return;
      const uri = pick.assets[0]?.uri;
      if (!uri) return;
      text = await FileSystem.readAsStringAsync(uri);
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = (parsed.data || [])
      .map((row) => ({
        houseCode: row.house_code || undefined,
        address: row.address || "",
        headName: row.head_name || "",
        phone: row.phone || undefined,
        aadhaarNumber: row.aadhaar_number || undefined,
        secondaryMobile: row.secondary_mobile || undefined,
        rationCardNumber: row.ration_card_number || undefined,
        voterIdNumber: row.voter_id_number || undefined,
        languagePreference: "en",
        members: (() => {
          try {
            return Array.isArray(JSON.parse(row.members_json || "[]"))
              ? JSON.parse(row.members_json || "[]").map((m) => ({
                  name: m.name || "",
                  relation: m.relation || undefined,
                  age: Number.isFinite(Number(m.age)) ? Number(m.age) : undefined,
                  dob: m.dob || undefined,
                  gender: normalizeGender(m.gender) || undefined,
                  aadhaarNumber: m.aadhaarNumber || m.member_aadhaar || undefined,
                  mobileNumber: m.mobileNumber || m.member_mobile || undefined,
                  maritalStatus: m.maritalStatus || m.marital_status || undefined,
                  disabilityStatus: m.disabilityStatus || m.disability_status || undefined,
                  occupation: m.occupation || undefined,
                }))
              : [];
          } catch {
            return [];
          }
        })(),
        schemes: (() => {
          try {
            return Array.isArray(JSON.parse(row.schemes_json || "[]"))
              ? JSON.parse(row.schemes_json || "[]").map((s) => ({
                  schemeName: s.schemeName || s.scheme_name || "",
                  status: s.status || "",
                  benefitAmount: Number.isFinite(Number(s.benefitAmount ?? s.benefit_amount))
                    ? Number(s.benefitAmount ?? s.benefit_amount)
                    : undefined,
                  remarks: s.remarks || undefined,
                }))
              : [];
          } catch {
            return [];
          }
        })(),
      }))
      .filter((row) => row.address && row.headName);

    const result = await importCsvRows({ rows });
    Alert.alert("Import complete", `Imported ${result.imported} households.`);
    setActiveTab("dashboard");
  };

  const onExportCsv = async () => {
    const rows = households.map((h) => ({
      house_code: h.houseCode,
      head_name: h.headName,
      address: h.address,
      phone: h.phone || "",
      aadhaar_number: h.aadhaarNumber || "",
      secondary_mobile: h.secondaryMobile || "",
      ration_card_number: h.rationCardNumber || "",
      voter_id_number: h.voterIdNumber || "",
      member_count: h.memberCount || 0,
      scheme_count: h.schemeCount || 0,
      members_json: JSON.stringify(
        (h.members || []).map((m) => ({
          name: m.name,
          relation: m.relation || "",
          age: m.age ?? "",
          dob: m.dob || "",
          gender: m.gender || "",
          aadhaarNumber: m.aadhaarNumber || "",
          mobileNumber: m.mobileNumber || "",
          maritalStatus: m.maritalStatus || "",
          disabilityStatus: m.disabilityStatus || "",
          occupation: m.occupation || "",
        }))
      ),
      schemes_json: JSON.stringify(
        (h.schemes || []).map((s) => ({
          scheme_name: s.schemeName,
          status: s.status,
          benefit_amount: s.benefitAmount ?? "",
          remarks: s.remarks || "",
        }))
      ),
    }));

    const csv = `\uFEFF${Papa.unparse(rows)}`;
    if (downloadOnWeb(csv, "graminfo-households.csv", "text/csv;charset=utf-8;")) {
      return;
    }

    if (await saveTextToAndroidFolder("graminfo-households.csv", "text/csv", csv)) {
      return;
    }

    const path = `${FileSystem.cacheDirectory}graminfo-households.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await shareFile(path);
  };

  const onExportPdf = async () => {
    const htmlRows = households
      .map((h) => {
        const members = (h.members || [])
          .map((m) => `${m.name} (${m.relation || "-"}, ${m.age || "-"}, ${m.gender || "-"})`)
          .join("<br/>");
        const schemes = (h.schemes || [])
          .map((s) => `${s.schemeName} - ${s.status}${s.benefitAmount ? ` (Rs ${s.benefitAmount})` : ""}`)
          .join("<br/>");
        return `<tr>
          <td>${h.houseCode}</td>
          <td>${h.headName}</td>
          <td>${h.address}</td>
          <td>${h.phone || "-"}</td>
          <td>${h.aadhaarNumber || "-"}</td>
          <td>${h.secondaryMobile || "-"}</td>
          <td>${h.rationCardNumber || "-"}</td>
          <td>${h.voterIdNumber || "-"}</td>
          <td>${members || "-"}</td>
          <td>${schemes || "-"}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <h1>GramInfo Village Report</h1>
      <p>Total households: ${summary.houseCount}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%;">
        <tr><th>House Code</th><th>Head Name</th><th>Address</th><th>Primary Mobile</th><th>Aadhaar</th><th>Secondary Mobile</th><th>Ration Card</th><th>Voter ID</th><th>Members</th><th>Schemes</th></tr>
        ${htmlRows}
      </table>
    `;

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert("Popup blocked", "Please allow popups to export PDF.");
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>GramInfo Village Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    const pdf = await Print.printToFileAsync({ html });
    if (await saveBase64ToAndroidFolder(pdf.uri, "graminfo-village-report.pdf", "application/pdf")) {
      return;
    }
    await shareFile(pdf.uri);
  };

  const onStartScan = async () => {
    if (!permission?.granted) {
      const status = await requestPermission();
      if (!status?.granted) {
        Alert.alert("Permission denied", "Camera permission is required to scan QR. Allow camera access in browser/app settings.");
        return;
      }
    }
    setShowScanner(true);
  };

  const onShareQrSticker = async () => {
    if (!selectedHouse) {
      Alert.alert("No household", "Select a household first.");
      return;
    }

    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(getQrValue(selectedHouse))}`;

    if (Platform.OS === "web") {
      await downloadFromUrlOnWeb(fallbackUrl, `${selectedHouse.houseCode}-sticker.png`);
      return;
    }

    const path = `${FileSystem.cacheDirectory}${selectedHouse.houseCode}-sticker.png`;
    const targetFile = new File(Paths.cache, `${selectedHouse.houseCode}-sticker.png`);

    try {
      const downloaded = await File.downloadFileAsync(fallbackUrl, targetFile);
      const downloadedUri = downloaded?.uri || path;
      if (await saveBase64ToAndroidFolder(downloadedUri, `${selectedHouse.houseCode}-sticker.png`, "image/png")) {
        return;
      }
      await shareFile(downloadedUri);
    } catch (err) {
      Alert.alert("Export failed", err?.message || "Could not export QR sticker.");
    }
  };

  const getQrValue = (household) => {
    return `GRAMINFO|houseCode=${household?.houseCode || ""}`;
  };

  const renderDashboard = () => (
    <>
      <View style={styles.statsRow}>
        <Card>
          <Text style={styles.statLabel}>Total Households</Text>
          <Text style={styles.statValue}>{summary.houseCount}</Text>
        </Card>
        <Card>
          <Text style={styles.statLabel}>Family Members</Text>
          <Text style={styles.statValue}>{summary.memberCount}</Text>
        </Card>
        <Card>
          <Text style={styles.statLabel}>Scheme Entries</Text>
          <Text style={styles.statValue}>{summary.schemeCount}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Search Households</Text>
        <TextInput style={styles.input} placeholder="Search by name, address, house code, member or scheme" value={search} onChangeText={setSearch} />
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Household Directory</Text>
          <Text style={styles.badge}>
            {households.length} records | Page {dashboardPage}/{totalPages}
          </Text>
        </View>

        <FlatList
          data={pagedHouseholds}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.houseRow, selectedId === item._id && styles.houseRowActive]} onPress={() => pickHousehold(item._id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.houseName}>{item.headName}</Text>
                <Text style={styles.houseMeta}>{item.houseCode}</Text>
                <Text style={styles.houseMeta}>{item.address}</Text>
                <Text style={styles.houseMeta}>Members: {item.memberCount || 0} | Schemes: {item.schemeCount || 0}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <OutlineButton title="Members" onPress={() => pickHousehold(item._id, "members")} />
                <OutlineButton title="QR" onPress={() => pickHousehold(item._id, "qr")} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No households found.</Text>}
        />
        {households.length > PAGE_SIZE ? (
          <View style={styles.rowWrap}>
            <OutlineButton title="Prev Page" onPress={() => setDashboardPage((p) => Math.max(1, p - 1))} />
            <OutlineButton title="Next Page" onPress={() => setDashboardPage((p) => Math.min(totalPages, p + 1))} />
          </View>
        ) : null}
      </Card>
    </>
  );

  const renderAddHousehold = () => (
    <Card>
      <Text style={styles.sectionTitle}>Register New Household</Text>
      <Text style={styles.helperText}>Create a household profile to generate QR and track schemes.</Text>
      <TextInput style={styles.input} placeholder="Head of Family" value={headName} onChangeText={setHeadName} />
      <TextInput style={styles.input} placeholder="Full Address" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="Primary Mobile Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Aadhaar Number" keyboardType="number-pad" value={aadhaarNumber} onChangeText={setAadhaarNumber} />
      <TextInput style={styles.input} placeholder="Secondary Mobile Number" keyboardType="phone-pad" value={secondaryMobile} onChangeText={setSecondaryMobile} />
      <TextInput style={styles.input} placeholder="Ration Card Number" value={rationCardNumber} onChangeText={setRationCardNumber} />
      <TextInput style={styles.input} placeholder="Voter ID Number" value={voterIdNumber} onChangeText={setVoterIdNumber} />
      <PrimaryButton title="Create Household" onPress={onCreateHousehold} />
    </Card>
  );

  const renderMembersSchemes = () => (
    <>
      <Card>
          <Text style={styles.sectionTitle}>Selected Household</Text>
        {selectedHouse ? (
          <>
            <Text style={styles.houseName}>{selectedHouse.headName}</Text>
            <Text style={styles.houseMeta}>{selectedHouse.houseCode}</Text>
            <Text style={styles.houseMeta}>{selectedHouse.address}</Text>
            <Text style={styles.houseMeta}>Primary Mobile: {selectedHouse.phone || "-"}</Text>
            <Text style={styles.houseMeta}>Aadhaar: {selectedHouse.aadhaarNumber || "-"}</Text>
            <Text style={styles.houseMeta}>Secondary Mobile: {selectedHouse.secondaryMobile || "-"}</Text>
            <Text style={styles.houseMeta}>Ration Card: {selectedHouse.rationCardNumber || "-"}</Text>
            <Text style={styles.houseMeta}>Voter ID: {selectedHouse.voterIdNumber || "-"}</Text>
            {selectedHouse.headPending ? <Text style={styles.warnText}>Head of household pending assignment.</Text> : null}
            <Text style={styles.helperText}>Update Household Details</Text>
            {isEditingHousehold ? (
              <>
                <TextInput style={styles.input} placeholder="Head of Family" value={editHeadName} onChangeText={setEditHeadName} />
                <TextInput style={styles.input} placeholder="Full Address" value={editAddress} onChangeText={setEditAddress} />
                <TextInput style={styles.input} placeholder="Primary Mobile Number" keyboardType="phone-pad" value={editPhone} onChangeText={setEditPhone} />
                <TextInput style={styles.input} placeholder="Aadhaar Number" keyboardType="number-pad" value={editAadhaarNumber} onChangeText={setEditAadhaarNumber} />
                <TextInput style={styles.input} placeholder="Secondary Mobile Number" keyboardType="phone-pad" value={editSecondaryMobile} onChangeText={setEditSecondaryMobile} />
                <TextInput style={styles.input} placeholder="Ration Card Number" value={editRationCardNumber} onChangeText={setEditRationCardNumber} />
                <TextInput style={styles.input} placeholder="Voter ID Number" value={editVoterIdNumber} onChangeText={setEditVoterIdNumber} />
              </>
            ) : null}
            <View style={styles.rowWrap}>
              {isEditingHousehold ? (
                <>
                  <PrimaryButton title="Save Household" onPress={onUpdateHousehold} />
                  <OutlineButton title="Cancel Edit" onPress={() => setIsEditingHousehold(false)} />
                </>
              ) : (
                <OutlineButton title="Edit Household" onPress={() => setIsEditingHousehold(true)} />
              )}
              <OutlineButton title="Open QR Center" onPress={() => setActiveTab("qr")} />
              <OutlineButton title="Head Deceased -> Promote Eldest" onPress={onMarkHeadDeceased} />
              <PrimaryButton
                title="Delete Household"
                danger
                onPress={onDeleteHousehold}
              />
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Select a household from Dashboard first.</Text>
        )}
      </Card>

      {selectedHouse && (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Family Members</Text>
            {(selectedHouse.members || [])
              .filter((m) => (m.name || "").trim().toLowerCase() !== (selectedHouse.headName || "").trim().toLowerCase())
              .map((m) => (
              <View style={styles.inlineCard} key={m._id}>
                {editingMemberId === m._id ? (
                  <View style={{ flex: 1, gap: 6 }}>
                <TextInput style={styles.input} placeholder="Member Name" value={editMemberName} onChangeText={setEditMemberName} />
                <TextInput style={styles.input} placeholder="Relation" value={editMemberRelation} onChangeText={setEditMemberRelation} />
                <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={editMemberAge} onChangeText={setEditMemberAge} />
                <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={editMemberDob} onChangeText={setEditMemberDob} />
                <Text style={styles.helperText}>Gender</Text>
                <View style={styles.statusRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable key={opt} onPress={() => setEditMemberGender(opt)} style={[styles.statusPill, editMemberGender === opt && styles.statusPillActive]}>
                      <Text style={[styles.statusPillText, editMemberGender === opt && styles.statusPillTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Member Aadhaar Number" keyboardType="number-pad" value={editMemberAadhaar} onChangeText={setEditMemberAadhaar} />
                <TextInput style={styles.input} placeholder="Member Mobile Number" keyboardType="phone-pad" value={editMemberMobile} onChangeText={setEditMemberMobile} />
                <TextInput style={styles.input} placeholder="Marital Status" value={editMemberMaritalStatus} onChangeText={setEditMemberMaritalStatus} />
                <TextInput style={styles.input} placeholder="Disability Status" value={editMemberDisabilityStatus} onChangeText={setEditMemberDisabilityStatus} />
                <TextInput style={styles.input} placeholder="Occupation" value={editMemberOccupation} onChangeText={setEditMemberOccupation} />
                    <View style={styles.rowWrap}>
                      <PrimaryButton title="Save Member" onPress={onUpdateMember} />
                      <OutlineButton title="Cancel" onPress={() => setEditingMemberId(null)} />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.houseName}>{m.name}</Text>
                      <Text style={styles.houseMeta}>
                        {m.relation || "-"} | Age: {m.age || "-"} | {m.gender || "-"}
                      </Text>
                      <Text style={styles.houseMeta}>DOB: {m.dob || "-"}</Text>
                      <Text style={styles.houseMeta}>Aadhaar: {m.aadhaarNumber || "-"}</Text>
                      <Text style={styles.houseMeta}>Member Mobile: {m.mobileNumber || "-"}</Text>
                      <Text style={styles.houseMeta}>Marital Status: {m.maritalStatus || "-"}</Text>
                      <Text style={styles.houseMeta}>Disability Status: {m.disabilityStatus || "-"}</Text>
                      <Text style={styles.houseMeta}>Occupation: {m.occupation || "-"}</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <OutlineButton title="Edit" onPress={() => beginEditMember(m)} />
                      <OutlineButton title="Remove" onPress={() => onRemoveMember(m._id)} />
                    </View>
                  </>
                )}
              </View>
            ))}
            <TextInput style={styles.input} placeholder="Member Name" value={memberName} onChangeText={setMemberName} />
            <TextInput style={styles.input} placeholder="Relation" value={memberRelation} onChangeText={setMemberRelation} />
            <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={memberAge} onChangeText={setMemberAge} />
            <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={memberDob} onChangeText={setMemberDob} />
            <Text style={styles.helperText}>Gender</Text>
            <View style={styles.statusRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable key={opt} onPress={() => setMemberGender(opt)} style={[styles.statusPill, memberGender === opt && styles.statusPillActive]}>
                  <Text style={[styles.statusPillText, memberGender === opt && styles.statusPillTextActive]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Member Aadhaar Number" keyboardType="number-pad" value={memberAadhaar} onChangeText={setMemberAadhaar} />
            <TextInput style={styles.input} placeholder="Member Mobile Number" keyboardType="phone-pad" value={memberMobile} onChangeText={setMemberMobile} />
            <TextInput style={styles.input} placeholder="Marital Status (Single/Married/Widowed/Divorced)" value={memberMaritalStatus} onChangeText={setMemberMaritalStatus} />
            <TextInput style={styles.input} placeholder="Disability Status (None/Yes - details)" value={memberDisabilityStatus} onChangeText={setMemberDisabilityStatus} />
            <TextInput style={styles.input} placeholder="Occupation" value={memberOccupation} onChangeText={setMemberOccupation} />
            <PrimaryButton title="Add Member" onPress={onAddMember} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Government Schemes</Text>
            {(selectedHouse.schemes || []).map((s) => (
              <View style={styles.inlineCard} key={s._id}>
                {editingSchemeId === s._id ? (
                  <View style={{ flex: 1, gap: 6 }}>
                    <TextInput style={styles.input} placeholder="Scheme Name" value={editSchemeName} onChangeText={setEditSchemeName} />
                    <View style={styles.statusRow}>
                      {["Enrolled", "Pending", "Rejected"].map((opt) => (
                        <Pressable key={opt} onPress={() => setEditSchemeStatus(opt)} style={[styles.statusPill, editSchemeStatus === opt && styles.statusPillActive]}>
                          <Text style={[styles.statusPillText, editSchemeStatus === opt && styles.statusPillTextActive]}>{opt}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput style={styles.input} placeholder="Benefit Amount" keyboardType="numeric" value={editSchemeBenefit} onChangeText={setEditSchemeBenefit} />
                    <TextInput style={styles.input} placeholder="Remarks" value={editSchemeRemarks} onChangeText={setEditSchemeRemarks} />
                    <View style={styles.rowWrap}>
                      <PrimaryButton title="Save Scheme" onPress={onUpdateScheme} />
                      <OutlineButton title="Cancel" onPress={() => setEditingSchemeId(null)} />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.houseName}>{s.schemeName}</Text>
                      <Text style={styles.houseMeta}>Status: {s.status}</Text>
                      <Text style={styles.houseMeta}>Benefit: {s.benefitAmount || "-"}</Text>
                      <Text style={styles.houseMeta}>Remarks: {s.remarks || "-"}</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <OutlineButton title="Edit" onPress={() => beginEditScheme(s)} />
                      <OutlineButton title="Remove" onPress={() => onRemoveScheme(s._id)} />
                    </View>
                  </>
                )}
              </View>
            ))}
            <TextInput style={styles.input} placeholder="Scheme Name" value={schemeName} onChangeText={setSchemeName} />
            <View style={styles.statusRow}>
              {["Enrolled", "Pending", "Rejected"].map((opt) => (
                <Pressable key={opt} onPress={() => setSchemeStatus(opt)} style={[styles.statusPill, schemeStatus === opt && styles.statusPillActive]}>
                  <Text style={[styles.statusPillText, schemeStatus === opt && styles.statusPillTextActive]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Benefit Amount" keyboardType="numeric" value={schemeBenefit} onChangeText={setSchemeBenefit} />
            <TextInput style={styles.input} placeholder="Remarks" value={schemeRemarks} onChangeText={setSchemeRemarks} />
            <PrimaryButton title="Add Scheme" onPress={onAddScheme} />
          </Card>
        </>
      )}
    </>
  );

  const renderQrCenter = () => (
    <Card>
      <Text style={styles.sectionTitle}>QR Center</Text>
      {scanPreview ? (
        <View style={styles.inlineCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.houseName}>Last Scan Result</Text>
            <Text style={styles.houseMeta}>
              {scanPreview.headName} ({scanPreview.houseCode})
            </Text>
            <Text style={styles.houseMeta}>Members: {(scanPreview.members || []).length}</Text>
            <Text style={styles.houseMeta}>Schemes: {(scanPreview.schemes || []).length}</Text>
          </View>
          <OutlineButton title="Open Details" onPress={() => setActiveTab("members")} />
        </View>
      ) : null}
      <View style={styles.rowWrap}>
        <OutlineButton title="Scan Household QR" onPress={onStartScan} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Find by House Code (e.g. GH-1234-567)"
        value={qrLookupCode}
        onChangeText={(v) => setQrLookupCode(v.toUpperCase())}
        onSubmitEditing={onFindByCode}
        autoCapitalize="characters"
      />
      <PrimaryButton title="Find Household by Code" onPress={onFindByCode} />
      <Text style={styles.helperText}>Tip: QR holds only a protected house code. Full data opens only after in-app login.</Text>

      {selectedHouse ? (
        <>
          <Text style={styles.houseName}>{selectedHouse.headName}</Text>
          <Text style={styles.houseMeta}>{selectedHouse.houseCode}</Text>
          <OutlineButton
            title="Copy House Code"
            onPress={() => {
              const browserClipboard = globalThis?.navigator?.clipboard;
              if (Platform.OS === "web" && browserClipboard?.writeText) {
                browserClipboard.writeText(selectedHouse.houseCode);
                Alert.alert("Copied", "House code copied.");
              } else {
                Alert.alert("House Code", selectedHouse.houseCode);
              }
            }}
          />
          <PrimaryButton title="Display Household QR" onPress={() => setShowQr(true)} />
        </>
      ) : (
        <Text style={styles.emptyText}>No household selected yet. Scan or find by code first.</Text>
      )}
    </Card>
  );

  const renderReports = () => (
    <Card>
      <Text style={styles.sectionTitle}>Data Import / Export</Text>
      <Text style={styles.helperText}>Use CSV for bulk import/export and PDF for administrative reports.</Text>
      <Text style={styles.helperText}>On web, PDF opens browser print dialog and CSV downloads directly.</Text>
      <View style={styles.rowWrap}>
        <PrimaryButton title="Import from CSV" onPress={onImportCsv} />
        <OutlineButton title="Export CSV" onPress={onExportCsv} />
        <OutlineButton title="Export PDF" onPress={onExportPdf} />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GramInfo</Text>
        </View>
        <View style={styles.headerActions}>
          <OutlineButton title="Quick Scan" onPress={onStartScan} />
          <OutlineButton title="Sign Out" onPress={signOut} />
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {tabs.map((tab) => (
            <Pressable key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.pageContent, !isPhone && styles.pageContentDesktop]}>
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "add" && renderAddHousehold()}
        {activeTab === "members" && renderMembersSchemes()}
        {activeTab === "qr" && renderQrCenter()}
        {activeTab === "reports" && renderReports()}
      </ScrollView>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>QR Scanner</Text>
            <OutlineButton title="Close" onPress={() => setShowScanner(false)} />
          </View>
          <View style={styles.scannerHintWrap}>
            <Text style={styles.helperText}>Point camera to QR. Household details are visible only for authenticated users in this app.</Text>
          </View>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
        </SafeAreaView>
      </Modal>

      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Household QR</Text>
            <Text style={styles.houseMeta}>{selectedHouse?.houseCode}</Text>
            {selectedHouse ? (
              <QRCode
                value={getQrValue(selectedHouse)}
                size={220}
                getRef={(c) => {
                  qrSvgRef.current = c;
                }}
              />
            ) : null}
            <View style={{ marginTop: 12 }}>
              <OutlineButton title="Download QR Sticker" onPress={onShareQrSticker} />
            </View>
            <View style={{ marginTop: 8 }}>
              <PrimaryButton title="Close" onPress={() => setShowQr(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecf1f9" },
  header: {
    backgroundColor: "#102a43",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabBar: { backgroundColor: "#dbe7f5", borderBottomWidth: 1, borderBottomColor: "#c8d7ea" },
  tabBarInner: { gap: 8, padding: 10 },
  tabBtn: { backgroundColor: "#edf2f7", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  tabBtnActive: { backgroundColor: "#0f766e" },
  tabText: { color: "#1f2937", fontWeight: "600" },
  tabTextActive: { color: "#ffffff" },
  pageContent: { padding: 12, paddingBottom: 120, gap: 10 },
  pageContentDesktop: { maxWidth: 1140, width: "100%", alignSelf: "center" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbe3ef",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  helperText: { color: "#475569" },
  warnText: { color: "#b45309", fontWeight: "700" },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  buttonPrimary: { backgroundColor: "#0f766e" },
  buttonDanger: { backgroundColor: "#b91c1c" },
  buttonText: { color: "#ffffff", fontWeight: "700" },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutlineText: { color: "#0f766e", fontWeight: "700" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusPill: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  statusPillActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  statusPillText: { color: "#334155", fontWeight: "700" },
  statusPillTextActive: { color: "#ffffff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
  },
  statsRow: { gap: 8 },
  statLabel: { color: "#475569", fontSize: 13 },
  statValue: { color: "#0f172a", fontSize: 22, fontWeight: "900", marginTop: 3 },
  houseRow: {
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  houseRowActive: { borderColor: "#0f766e", backgroundColor: "#f0fdfa" },
  houseName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  houseMeta: { color: "#475569", marginTop: 2 },
  inlineCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: { color: "#64748b", marginTop: 6 },
  scannerHintWrap: { paddingHorizontal: 12, paddingVertical: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", width: 320 },
});
