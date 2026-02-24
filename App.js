import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useConvexAuth } from "convex/react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AuthScreen from "./src/screens/AuthScreen";
import MainAppScreen from "./src/screens/MainAppScreen";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading GramInfo...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return <SafeAreaProvider>{isAuthenticated ? <MainAppScreen /> : <AuthScreen />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecf1f9" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16, color: "#1f2937" },
});
