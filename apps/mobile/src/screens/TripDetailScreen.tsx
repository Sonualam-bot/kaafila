import { RouteProp, useRoute } from "@react-navigation/native";
import axios from "axios";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { getTrip } from "../http";
import { TripDetails } from "../types/trip";

type TripDetailRouteParams = {
  tripId: string;
};

export const TripDetailScreen = () => {
  const route =
    useRoute<RouteProp<{ TripDetail: TripDetailRouteParams }, "TripDetail">>();
  const { tripId } = route.params;
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTripDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const details = await getTrip(tripId);
        setTripDetails(details);
      } catch (error: unknown) {
        if (axios.isAxiosError<{ message?: string }>(error)) {
          setError(
            error.response?.data?.message ?? "Unable to load trip details",
          );
        } else {
          setError("Something went wrong");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId]);

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!tripDetails) {
    return <Text>Trip details are unavailable.</Text>;
  }

  return (
    <View>
      <Text>{tripDetails.trip.title}</Text>
      <Text>Status: {tripDetails.trip.status}</Text>
      <Text>Members: {tripDetails.members.length}</Text>
    </View>
  );
};
