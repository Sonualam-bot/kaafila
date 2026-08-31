import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Button, TextInput, View } from "react-native";
import { createTrip } from "../http";

export const CreateTripScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTrip = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createTrip(title);
      navigation.goBack();
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} />
      <Button
        title={isSubmitting ? "Creating..." : "Create"}
        onPress={handleCreateTrip}
        disabled={isSubmitting}
      />
    </View>
  );
};
