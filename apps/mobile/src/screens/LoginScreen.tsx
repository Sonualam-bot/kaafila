import { useState } from "react";
import { Button, TextInput, View } from "react-native";
import { handleLogIn } from "../http";
import { setKey } from "../storage";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleUserLogIn = async () => {
    try {
      const { accessToken } = await handleLogIn(email, password);
      await setKey("accessToken", accessToken);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <View>
      <TextInput
        value={email}
        placeholder="Enter email here"
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />
      <TextInput
        value={password}
        placeholder="Enter password here"
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Submit" onPress={handleUserLogIn} />
    </View>
  );
};
