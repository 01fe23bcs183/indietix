import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { formatINR } from "@indietix/utils";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Music", value: "MUSIC" },
  { label: "Comedy", value: "COMEDY" },
  { label: "Sports", value: "SPORTS" },
  { label: "Tech", value: "TECH" },
  { label: "Food", value: "FOOD" },
  { label: "Art", value: "ART" },
  { label: "Workshop", value: "OTHER" },
];

const CITIES = [
  { label: "All Cities", value: "" },
  { label: "Bengaluru", value: "Bengaluru" },
  { label: "Mumbai", value: "Mumbai" },
  { label: "Delhi", value: "Delhi" },
  { label: "Hyderabad", value: "Hyderabad" },
  { label: "Chennai", value: "Chennai" },
  { label: "Pune", value: "Pune" },
];

export default function EventsListing(): JSX.Element {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: events,
    isLoading,
    refetch,
  } = trpc.search.query.useQuery({
    category: selectedCategory
      ? (selectedCategory as
          | "MUSIC"
          | "COMEDY"
          | "SPORTS"
          | "TECH"
          | "FOOD"
          | "ART"
          | "OTHER")
      : undefined,
    city: selectedCity || undefined,
    priceLte: maxPrice ? parseInt(maxPrice) : undefined,
    orderBy: "date_asc",
  });

  const eventsList = events?.events || [];

  function renderEventCard({ item }: { item: (typeof eventsList)[0] }) {
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
              hour: "2-digit",
              minute: "2-digit",
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

  if (isLoading && eventsList.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Events</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? "Hide Filters" : "Show Filters"} 🔍
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.categoryChips}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.chip,
                  selectedCategory === cat.value && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategory === cat.value && styles.chipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>City</Text>
          <View style={styles.categoryChips}>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city.value}
                style={[
                  styles.chip,
                  selectedCity === city.value && styles.chipSelected,
                ]}
                onPress={() => setSelectedCity(city.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCity === city.value && styles.chipTextSelected,
                  ]}
                >
                  {city.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Max Price</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="e.g., 2000"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedCategory("");
              setSelectedCity("");
              setMaxPrice("");
            }}
          >
            <Text style={styles.clearButtonText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {eventsList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎭</Text>
          <Text style={styles.emptyTitle}>No Events Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your filters or check back later
          </Text>
        </View>
      ) : (
        <FlatList
          data={eventsList}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {eventsList.length} event{eventsList.length !== 1 ? "s" : ""}{" "}
              found
            </Text>
          }
        />
      )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#e8f0fe",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    marginTop: 12,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: "#0066cc",
  },
  chipText: {
    fontSize: 14,
    color: "#666",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  priceInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  clearButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
