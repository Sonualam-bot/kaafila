import { useState } from "react";
import { Button, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";

export const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleUserLogIn = async () => {
    try {
      await login(email.trim(), password);
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
