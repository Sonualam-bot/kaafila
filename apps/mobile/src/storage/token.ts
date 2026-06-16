import * as SecureStore from "expo-secure-store";

export const setKey = async (key: string, value: string) => {
  return await SecureStore.setItemAsync("accessToken", value);
};

export const getKey = async (key: string) => {
  return await SecureStore.getItemAsync(key);
};
