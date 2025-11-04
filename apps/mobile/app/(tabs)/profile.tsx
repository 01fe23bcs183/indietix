import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { trpc } from "../../lib/trpc";

export default function Profile(): JSX.Element {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const { data: preferences, isLoading: prefsLoading } =
    trpc.notify.getPreferences.useQuery(undefined, {
      enabled: !!user,
    });

  const updatePreferences = trpc.notify.updatePreferences.useMutation();

  const [formData, setFormData] = useState({
    emailEnabled: preferences?.emailEnabled ?? true,
    smsEnabled: preferences?.smsEnabled ?? false,
    pushEnabled: preferences?.pushEnabled ?? true,
    transactional: preferences?.transactional ?? true,
    reminders: preferences?.reminders ?? true,
    marketing: preferences?.marketing ?? false,
  });

  const [isSaving, setIsSaving] = useState(false);

  if (preferences && !prefsLoading) {
    if (
      formData.emailEnabled !== preferences.emailEnabled ||
      formData.smsEnabled !== preferences.smsEnabled ||
      formData.pushEnabled !== preferences.pushEnabled ||
      formData.transactional !== preferences.transactional ||
      formData.reminders !== preferences.reminders ||
      formData.marketing !== preferences.marketing
    ) {
      setFormData({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        pushEnabled: preferences.pushEnabled,
        transactional: preferences.transactional,
        reminders: preferences.reminders,
        marketing: preferences.marketing,
      });
    }
  }

  async function handleSavePreferences() {
    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync(formData);
      Alert.alert("Success", "Notification preferences updated successfully!");
    } catch (error) {
      Alert.alert(
        "Failed to Update",
        error instanceof Error ? error.message : "Please try again",
        [{ text: "OK" }]
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/signin");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/bookings")}
        >
          <Text style={styles.menuItemText}>My Bookings</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>

        {prefsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0066cc" />
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        ) : (
          <>
            <View style={styles.preferencesCard}>
              <Text style={styles.preferencesSubtitle}>
                Notification Channels
              </Text>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>Email</Text>
                  <Text style={styles.preferenceDescription}>
                    Receive notifications via email
                  </Text>
                </View>
                <Switch
                  value={formData.emailEnabled}
                  onValueChange={(value) =>
                    setFormData({ ...formData, emailEnabled: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>SMS</Text>
                  <Text style={styles.preferenceDescription}>
                    Receive notifications via text message
                  </Text>
                </View>
                <Switch
                  value={formData.smsEnabled}
                  onValueChange={(value) =>
                    setFormData({ ...formData, smsEnabled: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>Push</Text>
                  <Text style={styles.preferenceDescription}>
                    Receive push notifications on this device
                  </Text>
                </View>
                <Switch
                  value={formData.pushEnabled}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pushEnabled: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>
            </View>

            <View style={styles.preferencesCard}>
              <Text style={styles.preferencesSubtitle}>Notification Types</Text>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>Transactional</Text>
                  <Text style={styles.preferenceDescription}>
                    Booking confirmations, cancellations, refunds
                  </Text>
                </View>
                <Switch
                  value={formData.transactional}
                  onValueChange={(value) =>
                    setFormData({ ...formData, transactional: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>Reminders</Text>
                  <Text style={styles.preferenceDescription}>
                    Event reminders, waitlist offers
                  </Text>
                </View>
                <Switch
                  value={formData.reminders}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reminders: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceLabel}>Marketing</Text>
                  <Text style={styles.preferenceDescription}>
                    Promotional offers, new events, announcements
                  </Text>
                </View>
                <Switch
                  value={formData.marketing}
                  onValueChange={(value) =>
                    setFormData({ ...formData, marketing: value })
                  }
                  trackColor={{ false: "#ccc", true: "#0066cc" }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSavePreferences}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemText: {
    fontSize: 16,
    color: "#000",
  },
  menuItemArrow: {
    fontSize: 18,
    color: "#999",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#666",
  },
  preferencesCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  preferencesSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 12,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#0066cc",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  signOutButton: {
    margin: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff3b30",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginBottom: 24,
  },
});
