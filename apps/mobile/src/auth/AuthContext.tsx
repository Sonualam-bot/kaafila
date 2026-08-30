import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { handleLogIn } from "../http";
import { setLogoutHandler } from "../http/axios-instance";
import { deleteKey, getKey, setKey } from "../storage";

type AuthContextValue = {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthContextProvider = ({ children }: PropsWithChildren) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken } = await handleLogIn(email, password);
    await setKey("accessToken", accessToken);
    await setKey("refreshToken", refreshToken);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await deleteKey("accessToken");
    await deleteKey("refreshToken");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    setLogoutHandler(logout);
  }, []);

  // bootstrap: on mount, check if a token is already stored
  useEffect(() => {
    const loadToken = async () => {
      const token = await getKey("accessToken");
      setIsLoggedIn(!!token);
    };
    loadToken();
  }, []);

  const value = {
    isLoggedIn,
    login,
    logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthContextProvider");
  return ctx;
};
