import { StatusBar } from "expo-status-bar";
import { AuthContextProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation";

export default function App() {
  return (
    <AuthContextProvider>
      <StatusBar style="dark"></StatusBar>
      <RootNavigator />
    </AuthContextProvider>
  );
}
