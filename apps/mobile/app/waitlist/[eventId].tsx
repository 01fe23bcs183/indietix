import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../contexts/AuthContext";

export default function WaitlistJoin(): JSX.Element {
  const params = useLocalSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: event, isLoading } = trpc.events.get.useQuery({
    id: eventId,
  });

  const joinWaitlist = trpc.waitlist.join.useMutation();
  const { data: waitlistStatus } = trpc.waitlist.status.useQuery(
    {
      eventId,
      email: user?.email || "",
    },
    {
      enabled: !!user?.email,
    }
  );

  async function handleJoinWaitlist() {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinWaitlist.mutateAsync({
        eventId,
        email: email.trim(),
        phone: phone.trim() || undefined,
        userId: user?.id,
      });

      Alert.alert("Success", result.message, [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Failed to Join Waitlist",
        error instanceof Error ? error.message : "Please try again",
        [{ text: "OK" }]
      );
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Event Not Found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAlreadyOnWaitlist =
    waitlistStatus?.isOnWaitlist &&
    (waitlistStatus.status === "ACTIVE" ||
      waitlistStatus.status === "INVITED");

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={styles.title}>Join Waitlist</Text>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>
            📅{" "}
            {new Date(event.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.eventLocation}>
            📍 {event.venue}, {event.city}
          </Text>
        </View>

        {isAlreadyOnWaitlist ? (
          <View style={styles.alreadyOnWaitlistCard}>
            <Text style={styles.alreadyOnWaitlistTitle}>
              ✓ You're on the Waitlist
            </Text>
            <Text style={styles.alreadyOnWaitlistText}>
              We'll notify you via email when tickets become available.
            </Text>
            {waitlistStatus?.offer && waitlistStatus.offer.status === "PENDING" && (
              <View style={styles.offerCard}>
                <Text style={styles.offerTitle}>🎉 You Have an Offer!</Text>
                <Text style={styles.offerText}>
                  {waitlistStatus.offer.quantity} ticket
                  {waitlistStatus.offer.quantity > 1 ? "s" : ""} available
                </Text>
                <Text style={styles.offerExpiry}>
                  Expires:{" "}
                  {new Date(waitlistStatus.offer.expiresAt).toLocaleString(
                    "en-IN"
                  )}
                </Text>
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={() =>
                    router.push(`/waitlist/claim/${waitlistStatus.offer!.id}`)
                  }
                >
                  <Text style={styles.claimButtonText}>Claim Offer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                • We'll notify you when tickets become available
              </Text>
              <Text style={styles.infoText}>
                • You'll have 30 minutes to claim your spot
              </Text>
              <Text style={styles.infoText}>
                • First come, first served basis
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!user}
              />

              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 1234567890"
                keyboardType="phone-pad"
              />

              <Text style={styles.note}>
                We'll send you notifications via email and SMS when tickets
                become available.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.joinButton,
                isJoining && styles.joinButtonDisabled,
              ]}
              onPress={handleJoinWaitlist}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Join Waitlist</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  content: {
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#0066cc",
    fontWeight: "600",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 24,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: "#666",
  },
  alreadyOnWaitlistCard: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  alreadyOnWaitlistTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 8,
  },
  alreadyOnWaitlistText: {
    fontSize: 16,
    color: "#166534",
  },
  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  offerText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  offerExpiry: {
    fontSize: 14,
    color: "#f59e0b",
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  infoCard: {
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  note: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  joinButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  joinButtonDisabled: {
    backgroundColor: "#ccc",
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  button: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
