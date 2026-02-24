import "react-native-url-polyfill/auto";
import React from "react";
import { registerRootComponent } from "expo";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Platform } from "react-native";
import App from "./App";
import { secureTokenStorage } from "./src/secureStore";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set. Add it to mobile/.env");
}

const convex = new ConvexReactClient(convexUrl);

function Root() {
  const storage = Platform.OS === "web" ? undefined : secureTokenStorage;
  return (
    <ConvexAuthProvider client={convex} storage={storage}>
      <App />
    </ConvexAuthProvider>
  );
}

registerRootComponent(Root);
