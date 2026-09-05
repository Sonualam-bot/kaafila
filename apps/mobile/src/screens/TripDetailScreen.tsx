import { RouteProp, useRoute } from "@react-navigation/native";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { getTrip } from "../http";
import { TripDetails } from "../types/trip";
import MapView, { Region } from "react-native-maps";

type TripDetailRouteParams = {
  tripId: string;
};

const INITIAL_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const ZOOM_IN_FACTOR = 0.5;
const ZOOM_OUT_FACTOR = 2;

export const TripDetailScreen = () => {
  const route =
    useRoute<RouteProp<{ TripDetail: TripDetailRouteParams }, "TripDetail">>();
  const { tripId } = route.params;
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);

  const zoomBy = (factor: number) => {
    const nextRegion: Region = {
      ...region,
      latitudeDelta: region.latitudeDelta * factor,
      longitudeDelta: region.longitudeDelta * factor,
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 200);
  };

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
    <View style={{ flex: 1 }}>
      <Text>{tripDetails.trip.title}</Text>
      <Text>Status: {tripDetails.trip.status}</Text>
      <Text>Members: {tripDetails.members.length}</Text>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
      />
      <View style={{ position: "absolute", bottom: 24, right: 16 }}>
        <Pressable
          onPress={() => zoomBy(ZOOM_IN_FACTOR)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "600" }}>+</Text>
        </Pressable>
        <Pressable
          onPress={() => zoomBy(ZOOM_OUT_FACTOR)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "600" }}>-</Text>
        </Pressable>
      </View>
    </View>
  );
};
