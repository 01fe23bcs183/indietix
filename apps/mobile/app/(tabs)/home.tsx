import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { formatINR } from "@indietix/utils";

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    MUSIC: "🎵",
    COMEDY: "😂",
    SPORTS: "🏆",
    TECH: "💻",
    ART: "🎨",
    FOOD: "🍽️",
    OTHER: "📅",
  };
  return emojiMap[category] ?? "📅";
}

export default function Home(): JSX.Element {
  const router = useRouter();

  const {
    data: events,
    isLoading,
    refetch,
  } = trpc.search.query.useQuery({
    orderBy: "date_asc",
  });

  const { data: recoData } = trpc.reco.forUser.useQuery({
    limit: 6,
  });

  const logRecoClick = trpc.reco.logClick.useMutation();

  const featuredEvents = events?.events.filter((e) => e.featured) || [];
  const upcomingEvents = events?.events.slice(0, 10) || [];
  const recommendations = recoData?.recommendations || [];

  function renderEventCard({ item }: { item: (typeof upcomingEvents)[0] }) {
    const seatsLeft = item.totalSeats - (item._count?.bookings || 0);

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/events/${item.slug}`)}
      >
        <View style={styles.eventImagePlaceholder}>
          <Text style={styles.eventEmoji}>🎉</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.eventDate}>
            📅{" "}
            {new Date(item.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.eventLocation}>📍 {item.city}</Text>
          <View style={styles.eventFooter}>
            <Text style={styles.eventPrice}>{formatINR(item.price)}</Text>
            <Text style={styles.seatsLeft}>{seatsLeft} seats left</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Discover Events</Text>
              <Text style={styles.headerSubtitle}>
                Find amazing events near you
              </Text>
            </View>

            {recommendations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {recoData?.isPersonalized
                      ? "Recommended for You"
                      : "Popular Events"}
                  </Text>
                  <TouchableOpacity onPress={() => router.push("/events")}>
                    <Text style={styles.seeAllLink}>See All →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {recommendations.slice(0, 6).map((reco, index) => (
                    <TouchableOpacity
                      key={reco.event.id}
                      style={styles.recoCard}
                      onPress={() => {
                        logRecoClick.mutate({
                          eventId: reco.event.id,
                          position: index,
                          score: reco.score,
                        });
                        router.push(`/events/${reco.event.slug}`);
                      }}
                    >
                      <View style={styles.recoImagePlaceholder}>
                        <Text style={styles.recoEmoji}>
                          {getCategoryEmoji(reco.event.category)}
                        </Text>
                      </View>
                      <View style={styles.recoInfo}>
                        <Text style={styles.recoTitle} numberOfLines={2}>
                          {reco.event.title}
                        </Text>
                        <Text style={styles.recoDate}>
                          {new Date(reco.event.date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </Text>
                        <Text style={styles.recoPrice}>
                          {formatINR(reco.event.price)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {featuredEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⭐ Featured Events</Text>
                {featuredEvents.map((event) => (
                  <View key={event.id}>{renderEventCard({ item: event })}</View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => router.push("/events")}>
                  <Text style={styles.seeAllLink}>See All →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        data={upcomingEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      />
    </View>
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
  listContent: {
    paddingBottom: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  eventImagePlaceholder: {
    height: 150,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  eventEmoji: {
    fontSize: 48,
  },
  eventInfo: {
    padding: 16,
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
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0066cc",
  },
  seatsLeft: {
    fontSize: 12,
    color: "#666",
  },
  horizontalList: {
    paddingRight: 16,
  },
  recoCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  recoImagePlaceholder: {
    height: 80,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  recoEmoji: {
    fontSize: 32,
  },
  recoInfo: {
    padding: 12,
  },
  recoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
    height: 36,
  },
  recoDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  recoPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0066cc",
  },
});
