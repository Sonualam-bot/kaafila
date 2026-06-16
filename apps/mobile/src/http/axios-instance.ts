import axios from "axios";
import { API_BASE } from "./api-base";

export const axiosInstance = axios.create({
  baseURL: `${API_BASE}:3000/`,
});
