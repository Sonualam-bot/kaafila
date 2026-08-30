import axios from "axios";
import { API_URL } from "./api-base";
import { getKey } from "../storage";

export const handleRefreshToken = async () => {
  const refreshToken = await getKey("refreshToken");

  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  const response = await axios.post(`${API_URL}/api/auth/refresh`, {
    refreshToken,
  });

  return response.data.data.accessToken;
};
