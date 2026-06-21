import { Button, FlatList, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import { getTrips } from "../http";
import { Trip } from "../types/trip";

export const HomeScreen = () => {
  const { logout } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);

  console.log(trips);

  useEffect(() => {
    const userTrips = async () => {
      const data = await getTrips();
      setTrips(data);
    };
    userTrips();
  }, []);

  return (
    <View>
      <Text>Hello - you are in</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />

      <Button title="Logout" onPress={logout} />
    </View>
  );
};
