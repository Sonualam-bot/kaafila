import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import axios from "axios";

export const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUserLogIn = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setError(error.response?.data?.message ?? "Login failed");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
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
      <Button
        title={isSubmitting ? "Logging in..." : "Submit"}
        onPress={handleUserLogIn}
        disabled={isSubmitting}
      />
      <Text>{error}</Text>
    </View>
  );
};
