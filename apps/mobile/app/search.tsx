import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { trpc } from './_layout';
import type { SearchFilters, SearchResult } from '@indietix/search';

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>
        {label}: {value}
      </Text>
      <TouchableOpacity onPress={onRemove} style={styles.chipRemove}>
        <Text style={styles.chipRemoveText}>x</Text>
      </TouchableOpacity>
    </View>
  );
}

function EventCard({ event }: { event: SearchResult }) {
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
        <Text style={styles.price}>₹{event.price}</Text>
      </View>
      
      <Text style={styles.cardTitle} numberOfLines={2}>
        {event.title}
      </Text>
      
      <Text style={styles.cardDescription} numberOfLines={2}>
        {event.description}
      </Text>
      
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{formattedDate}</Text>
        <Text style={styles.metaText}>
          {event.venue}
          {event.area && `, ${event.area}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilters>>({});

  const { data, isLoading, error } = trpc.search.query.useQuery(
    {
      q: submittedQuery || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      limit: 20,
    },
    {
      enabled: true,
      staleTime: 30000,
    }
  );

  const handleSearch = useCallback(() => {
    setSubmittedQuery(query);
  }, [query]);

  const handleRemoveFilter = useCallback((key: keyof SearchFilters) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setQuery('');
    setSubmittedQuery('');
  }, []);

  const appliedFilters = data?.debug?.appliedFilters || filters;
  const filterEntries = Object.entries(appliedFilters).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  ) as Array<[keyof SearchFilters, unknown]>;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Try: comedy tonight under 600 near indiranagar"
          placeholderTextColor="#999"
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {filterEntries.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsContainer}
        >
          {filterEntries.map(([key, value]) => (
            <FilterChip
              key={key}
              label={key}
              value={String(value)}
              onRemove={() => handleRemoveFilter(key)}
            />
          ))}
          <TouchableOpacity onPress={handleClearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching events...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
        </View>
      )}

      {data && (
        <>
          <Text style={styles.resultsCount}>
            {data.total} event{data.total !== 1 ? 's' : ''} found
          </Text>

          {data.results.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No events found</Text>
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={styles.clearLink}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={data.results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <EventCard event={item} />}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    color: '#1e40af',
    fontSize: 14,
  },
  chipRemove: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
  },
  resultsCount: {
    padding: 16,
    color: '#666',
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  clearLink: {
    color: '#2563eb',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardMeta: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
});
