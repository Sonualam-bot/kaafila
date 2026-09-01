import axios from "axios";
import { API_URL } from "./api-base";

export const handleLogIn = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email: email.trim(),
    password,
  });
  return response.data.data;
};
