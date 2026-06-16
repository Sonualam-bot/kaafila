import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getKey } from "./src/storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen, LoginScreen } from "./src/screens";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const loadToken = async () => {
      const token = await getKey("accessToken");
      if (token !== null) setIsLoggedIn(true);
    };
    loadToken();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isLoggedIn ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});

//  - useState for email and password — identical to web.
//   - Two <TextInput>s, controlled via value + onChangeText. On the password one add secureTextEntry; on the email one autoCapitalize="none" + keyboardType="email-address".
//   - A <Button title="Login" onPress={handleLogin} />.
//   - handleLogin just console.logs the two values for now (logs show in the expo start terminal).
//   - Wrap it all in a <View> with a bit of padding via StyleSheet
