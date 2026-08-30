import axios, { AxiosRequestConfig } from "axios";
import { API_URL } from "./api-base";
import { getKey, setKey } from "../storage";
import { handleRefreshToken } from "./refresh";

let logoutHandler: () => Promise<void> = async () => {};

export const setLogoutHandler = (logout: () => Promise<void>) => {
  logoutHandler = logout;
};

export const axiosInstance = axios.create({
  baseURL: `${API_URL}/`,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getKey("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    try {
      const newAccessToken = await handleRefreshToken();
      await setKey("accessToken", newAccessToken);

      originalRequest._retry = true;
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return axiosInstance.request(originalRequest);
    } catch (refreshError) {
      await logoutHandler();
      return Promise.reject(refreshError);
    }
  },
);
