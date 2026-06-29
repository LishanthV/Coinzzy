import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import { TransactionRow } from '../../components/finance';
import { colors, fonts, fontSizes, radii, spacing } from '../../theme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { dayLabel } from '../../utils/format';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'History'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
];

const DATE_RANGES = [
  { id: 'all', label: 'All time' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_3', label: 'Last 3 months' },
];

function isInRange(dateStr: string, range: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  if (range === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (range === 'last_month') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getFullYear() === last.getFullYear() && d.getMonth() === last.getMonth();
  }
  if (range === 'last_3') {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return d >= cutoff;
  }
  return true;
}

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? 'INR';

  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!isInRange(t.date, dateRange)) return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
      if (q) {
        const inNote = t.note?.toLowerCase().includes(q);
        const inMerchant = t.merchant?.toLowerCase().includes(q);
        const inAmount = t.amount.toString().includes(q);
        const inCategory = t.categoryId ? categoryById[t.categoryId]?.name?.toLowerCase().includes(q) : false;
        if (!inNote && !inMerchant && !inAmount && !inCategory) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, dateRange, categoryFilter, search]);

  const sections = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, typeof sorted> = {};
    const order: string[] = [];
    for (const txn of sorted) {
      const key = dayLabel(txn.date);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(txn);
    }
    return order.map((key) => ({ title: key, data: groups[key] }));
  }, [filtered]);

  const activeFilterCount = [
    typeFilter !== 'all',
    dateRange !== 'all',
    categoryFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          style={[styles.filterToggle, activeFilterCount > 0 && styles.filterToggleActive]}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? colors.primary : colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by note, merchant, amount..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Type filter chips */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setTypeFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Expanded filters */}
      {showFilters && (
        <View style={styles.expandedFilters}>
          {/* Date range */}
          <Text style={styles.filterSectionLabel}>Date range</Text>
          <View style={styles.filterRow}>
            {DATE_RANGES.map((d) => {
              const active = dateRange === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDateRange(d.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category filter */}
          <Text style={styles.filterSectionLabel}>Category</Text>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setCategoryFilter('all')}
              style={[styles.chip, categoryFilter === 'all' && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryFilter === 'all' && styles.chipTextActive]}>All</Text>
            </Pressable>
            {expenseCategories.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryFilter(cat.id)}
                  style={[styles.chip, active && { borderColor: cat.color, backgroundColor: `${cat.color}22` }]}
                >
                  <Text style={[styles.chipText, active && { color: cat.color }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reset */}
          <Pressable
            onPress={() => { setTypeFilter('all'); setDateRange('all'); setCategoryFilter('all'); setSearch(''); }}
            style={styles.resetBtn}
          >
            <Text style={styles.resetText}>Reset all filters</Text>
          </Pressable>
        </View>
      )}

      {/* Results count */}
      <Text style={styles.resultCount}>
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
      </Text>

      {sections.length === 0 ? (
        <EmptyState
          title="No transactions found"
          subtitle="Try adjusting your filters or search query."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              category={item.categoryId ? categoryById[item.categoryId] : undefined}
              accountName={accountById[item.accountId]?.name}
              currency={currency}
              onPress={() => navigation.navigate('TxnDetail', { id: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderSectionFooter={() => <View style={{ height: spacing.lg }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.xxl },
  filterToggle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterToggleActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 9 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1, color: colors.text,
    fontFamily: fonts.body, fontSize: fontSizes.sm,
  },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radii.pill, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  chipTextActive: { color: colors.primary },
  expandedFilters: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.borderSoft,
    padding: spacing.md,
  },
  filterSectionLabel: {
    color: colors.textMuted, fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  resetBtn: {
    marginTop: spacing.md, alignSelf: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
  },
  resetText: { color: colors.expense, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs },
  resultCount: {
    color: colors.textFaint, fontFamily: fonts.body,
    fontSize: fontSizes.xs, paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  sectionHeader: {
    color: colors.textMuted, fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm, marginTop: spacing.md,
    marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: colors.borderSoft },
});
