import { Stack } from "expo-router";

export default function RootLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "IndieTix" }} />
    </Stack>
  );
}
