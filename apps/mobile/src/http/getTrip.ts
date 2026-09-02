import { TripDetails } from "../types/trip";
import { axiosInstance } from "./axios-instance";

export const getTrip = async (tripId: string): Promise<TripDetails> => {
  const response = await axiosInstance.get(`/api/trips/${tripId}`);
  return response.data.data;
};
