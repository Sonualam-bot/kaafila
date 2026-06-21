import { Trip } from "../types/trip";
import { axiosInstance } from "./axios-instance";

export const createTrip = async (title: string): Promise<Trip> => {
  const response = await axiosInstance.post("/api/trips", { title });
  return response.data.data;
};
