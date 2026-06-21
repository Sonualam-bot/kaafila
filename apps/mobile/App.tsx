import { AuthContextProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation";

export default function App() {
  return (
    <AuthContextProvider>
      <RootNavigator />
    </AuthContextProvider>
  );
}
