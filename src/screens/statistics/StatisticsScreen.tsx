import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen, SectionHeader, EmptyState, Card } from '../../components/ui';
import { DonutChart } from '../../components/charts';
import { CategoryIcon } from '../../components/finance';
import { colors, fonts, fontSizes, spacing, radii } from '../../theme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSpendByCategory, useNetForMonth } from '../../store/selectors';
import { formatCurrency, formatMonthYear } from '../../utils/format';

export default function StatisticsScreen() {
  const [refDate, setRefDate] = useState(new Date());

  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const budgets = useFinanceStore((s) => s.budgets);
  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? 'INR';

  const spendByCategory = useSpendByCategory(refDate);
  const { income, expense } = useNetForMonth(refDate);
  const netSavings = income - expense;

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const breakdown = useMemo(() => {
    return Object.entries(spendByCategory)
      .map(([categoryId, value]) => ({ categoryId, value, category: categoryById[categoryId] }))
      .filter((b) => b.category)
      .sort((a, b) => b.value - a.value);
  }, [spendByCategory, categories]);

  const totalSpend = breakdown.reduce((s, b) => s + b.value, 0);

  // Last 6 months trend relative to refDate
  const monthlyTrend = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const label = ref.toLocaleDateString(undefined, { month: 'short' });
      let inc = 0;
      let exp = 0;
      for (const t of transactions) {
        const d = new Date(t.date);
        if (d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()) {
          if (t.type === 'income') inc += t.amount;
          if (t.type === 'expense') exp += t.amount;
        }
      }
      months.push({ label, income: inc, expense: exp });
    }
    return months;
  }, [transactions, refDate]);

  // Budget utilization
  const budgetUtilization = useMemo(() => {
    return budgets
      .map((b) => {
        const spent = spendByCategory[b.categoryId] ?? 0;
        const pct = b.limit > 0 ? Math.min(spent / b.limit, 1) : 0;
        const cat = categoryById[b.categoryId];
        return { ...b, spent, pct, cat };
      })
      .filter((b) => b.cat)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, spendByCategory, categories]);

  const goToPrevMonth = () => {
    setRefDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const next = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
    if (next <= new Date()) setRefDate(next);
  };

  const isCurrentMonth =
    refDate.getMonth() === new Date().getMonth() &&
    refDate.getFullYear() === new Date().getFullYear();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Statistics</Text>

        {/* Month selector */}
        <View style={styles.monthRow}>
          <Pressable onPress={goToPrevMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthYear(refDate)}</Text>
          <Pressable
            onPress={goToNextMonth}
            style={[styles.monthBtn, isCurrentMonth && styles.monthBtnDisabled]}
            disabled={isCurrentMonth}
          >
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textFaint : colors.text} />
          </Pressable>
        </View>

        {/* Net savings card */}
        <View style={[styles.savingsCard, { borderColor: netSavings >= 0 ? colors.income : colors.expense }]}>
          <View style={styles.savingsRow}>
            <View style={styles.savingsStat}>
              <Text style={styles.savingsStatLabel}>Income</Text>
              <Text style={[styles.savingsStatValue, { color: colors.income }]}>
                {formatCurrency(income, currency)}
              </Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsStat}>
              <Text style={styles.savingsStatLabel}>Expenses</Text>
              <Text style={[styles.savingsStatValue, { color: colors.expense }]}>
                {formatCurrency(expense, currency)}
              </Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsStat}>
              <Text style={styles.savingsStatLabel}>Net Saved</Text>
              <Text style={[styles.savingsStatValue, { color: netSavings >= 0 ? colors.income : colors.expense }]}>
                {formatCurrency(netSavings, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Spending by category */}
        <SectionHeader title="Spending by category" />
        {breakdown.length === 0 ? (
          <Card>
            <EmptyState title="No expenses this month" subtitle="Your category breakdown will appear here." />
          </Card>
        ) : (
          <Card>
            <View style={styles.donutRow}>
              <DonutChart data={breakdown.map((b) => ({ value: b.value, color: b.category!.color }))} />
              <View style={styles.donutCenter}>
                <Text style={styles.donutTotalLabel}>Total spent</Text>
                <Text style={styles.donutTotal}>{formatCurrency(totalSpend, currency)}</Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.lg }}>
              {breakdown.map((b) => (
                <View key={b.categoryId} style={styles.legendRow}>
                  <CategoryIcon icon={b.category!.icon} color={b.category!.color} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legendName}>{b.category!.name}</Text>
                    <Text style={styles.legendPercent}>
                      {totalSpend > 0 ? Math.round((b.value / totalSpend) * 100) : 0}% of spending
                    </Text>
                  </View>
                  <Text style={styles.legendValue}>{formatCurrency(b.value, currency)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Budget utilization */}
        <SectionHeader title="Budget utilization" />
        {budgetUtilization.length === 0 ? (
          <Card>
            <EmptyState title="No budgets set" subtitle="Set a budget for a category to track utilization." />
          </Card>
        ) : (
          <Card>
            {budgetUtilization.map((b, idx) => (
              <View key={b.categoryId} style={[styles.budgetItem, idx > 0 && { marginTop: spacing.lg }]}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetLeft}>
                    <CategoryIcon icon={b.cat!.icon} color={b.cat!.color} size={28} />
                    <Text style={styles.budgetName}>{b.cat!.name}</Text>
                  </View>
                  <Text style={[
                    styles.budgetAmount,
                    { color: b.pct >= 1 ? colors.expense : b.pct >= 0.8 ? colors.transfer : colors.textMuted }
                  ]}>
                    {formatCurrency(b.spent, currency)} / {formatCurrency(b.limit, currency)}
                  </Text>
                </View>
                <View style={styles.budgetTrack}>
                  <View style={[
                    styles.budgetFill,
                    {
                      width: `${Math.round(b.pct * 100)}%` as any,
                      backgroundColor: b.pct >= 1 ? colors.expense : b.pct >= 0.8 ? colors.transfer : b.cat!.color,
                    }
                  ]} />
                </View>
                <Text style={styles.budgetPct}>
                  {b.pct >= 1
                    ? `Over budget by ${formatCurrency(b.spent - b.limit, currency)}`
                    : `${Math.round(b.pct * 100)}% used — ${formatCurrency(b.limit - b.spent, currency)} remaining`}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Income vs expenses trend */}
        <SectionHeader title="Income vs. expenses" />
        <Card>
          <View style={styles.legendKeyRow}>
            <View style={styles.legendKey}>
              <View style={[styles.dot, { backgroundColor: colors.income }]} />
              <Text style={styles.legendKeyText}>Income</Text>
            </View>
            <View style={styles.legendKey}>
              <View style={[styles.dot, { backgroundColor: colors.expense }]} />
              <Text style={styles.legendKeyText}>Expenses</Text>
            </View>
          </View>
          <View style={styles.trendBars}>
            {monthlyTrend.map((m, i) => {
              const max = Math.max(...monthlyTrend.map((x) => Math.max(x.income, x.expense)), 1);
              const incomeH = Math.max((m.income / max) * 120, 3);
              const expenseH = Math.max((m.expense / max) * 120, 3);
              return (
                <View key={i} style={styles.trendCol}>
                  <View style={styles.trendBarGroup}>
                    <View style={[styles.trendBar, { height: incomeH, backgroundColor: colors.income }]} />
                    <View style={[styles.trendBar, { height: expenseH, backgroundColor: colors.expense }]} />
                  </View>
                  <Text style={styles.trendLabel}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl * 1.5 },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.xxl, marginBottom: spacing.md },

  // Month selector
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  monthBtn: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  monthBtnDisabled: { opacity: 0.3 },
  monthLabel: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md },

  // Net savings
  savingsCard: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  savingsRow: { flexDirection: 'row', alignItems: 'center' },
  savingsStat: { flex: 1, alignItems: 'center' },
  savingsStatLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs, marginBottom: 4 },
  savingsStatValue: { fontFamily: fonts.displayBold, fontSize: fontSizes.md },
  savingsDivider: { width: 1, height: 40, backgroundColor: colors.border },

  // Donut
  donutRow: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotalLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs },
  donutTotal: { color: colors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.lg, marginTop: 2 },

  // Category legend
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  legendName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: fontSizes.md },
  legendPercent: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs, marginTop: 2 },
  legendValue: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md },

  // Budget utilization
  budgetItem: {},
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  budgetName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  budgetAmount: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs },
  budgetTrack: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  budgetFill: { height: 8, borderRadius: 4 },
  budgetPct: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs },

  // Trend chart
  legendKeyRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendKeyText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  trendBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150 },
  trendCol: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  trendBarGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 },
  trendBar: { width: 10, borderRadius: 4 },
  trendLabel: { color: colors.textFaint, fontFamily: fonts.body, fontSize: fontSizes.xs },
});
