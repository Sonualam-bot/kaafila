import { axiosInstance } from "./axios-instance";

export const handleLogIn = async (email: string, password: string) => {
  const response = await axiosInstance.post("/api/auth/login", {
    email: email.trim(),
    password,
  });
  return response.data.data;
};
