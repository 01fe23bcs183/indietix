import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function Index(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IndieTix Mobile</Text>
      <Text style={styles.subtitle}>Event booking on the go</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
