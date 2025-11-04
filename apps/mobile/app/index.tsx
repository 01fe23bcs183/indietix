import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../contexts/AuthContext";

export default function Index(): JSX.Element {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/(tabs)/bookings");
      } else {
        router.replace("/auth/signin");
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IndieTix</Text>
      <ActivityIndicator size="large" color="#0066cc" />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#0066cc",
  },
});
