import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Button, FlatList, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { getTrips } from "../http";
import { Trip } from "../types/trip";

export const HomeScreen = () => {
  const { logout } = useAuth();
  const navigation = useNavigation();
  const [trips, setTrips] = useState<Trip[]>([]);

  useFocusEffect(
    useCallback(() => {
      const userTrips = async () => {
        const data = await getTrips();
        setTrips(data);
      };
      userTrips();
    }, []),
  );

  return (
    <View>
      <Text>Hello - you are in</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />
      <Button
        title="New trip"
        onPress={() => navigation.navigate("CreateTrip")}
      />
      <Button title="Logout" onPress={logout} />
    </View>
  );
};
