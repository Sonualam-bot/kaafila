import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Button, TextInput, View } from "react-native";
import { createTrip } from "../http";

export const CreateTripScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState<string>("");

  const handleCreateTrip = async () => {
    try {
      await createTrip(title);
      navigation.goBack();
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} />
      <Button title="Create" onPress={handleCreateTrip} />
    </View>
  );
};
