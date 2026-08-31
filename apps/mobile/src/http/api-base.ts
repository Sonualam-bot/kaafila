import Constants from "expo-constants";

const GATEWAY_PORT = 3000;

const getDevApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    throw new Error(
      "Missing Constants.expoConfig.hostUri in development. Ensure Metro is running and the Expo app is connected.",
    );
  }

  const host = hostUri.includes(":")
    ? hostUri.split(":").slice(0, -1).join(":")
    : hostUri;

  if (!host) {
    throw new Error(
      `Invalid dev hostUri: "${hostUri}". Expected an IP:port value from Expo.`,
    );
  }

  return `http://${host}:${GATEWAY_PORT}`;
};

const getProdApiUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL in production. Set it to your deployed gateway URL.",
    );
  }

  return apiUrl.replace(/\/+$/, "");
};

export const API_URL = __DEV__ ? getDevApiUrl() : getProdApiUrl();
export const API_BASE = API_URL;
export const API_PORT = GATEWAY_PORT;
