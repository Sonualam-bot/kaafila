import axios from "axios";
import { API_BASE } from "./api-base";
import { getKey } from "../storage";

export const axiosInstance = axios.create({
  baseURL: `${API_BASE}:3000/`,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getKey("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
