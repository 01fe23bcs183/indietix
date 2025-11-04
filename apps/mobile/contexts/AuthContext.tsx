import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

/* eslint-disable no-unused-vars */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<void>;
  signOut(): Promise<void>;
}
/* eslint-enable no-unused-vars */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      void password; // Mark as intentionally unused for now
      const mockUser: User = {
        id: "mock-user-id",
        email,
        name: email.split("@")[0],
        role: "CUSTOMER",
      };

      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      await AsyncStorage.setItem("auth_token", "mock-token");
      setUser(mockUser);
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  }

  async function signUp(email: string, password: string, name: string) {
    try {
      void password; // Mark as intentionally unused for now
      const mockUser: User = {
        id: "mock-user-id",
        email,
        name,
        role: "CUSTOMER",
      };

      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      await AsyncStorage.setItem("auth_token", "mock-token");
      setUser(mockUser);
    } catch (error) {
      console.error("Sign up failed:", error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("auth_token");
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
