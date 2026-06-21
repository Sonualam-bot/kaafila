import { Trip } from "../types/trip";
import { axiosInstance } from "./axios-instance";

export const getTrips = async (): Promise<Trip[]> => {
  const response = await axiosInstance.get(`/api/trips`);
  return response.data.data;
};
