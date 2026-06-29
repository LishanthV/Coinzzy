import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader, EmptyState } from '../../components/ui';
import { CategoryIcon, TransactionRow } from '../../components/finance';
import { RingGauge } from '../../components/charts';
import { colors, fonts, fontSizes, radii, spacing, useAppTheme, useThemeStore } from '../../theme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTotalBalance, useNetForMonth, useSpendingForecast } from '../../store/selectors';
import { formatCurrency } from '../../utils/format';
import { RootStackParamList, MainTabParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const goals = useFinanceStore((s) => s.goals || []);
  const totalBalance = useTotalBalance();
  const { income, expense } = useNetForMonth();

  const { themeMode, colors: themeColors } = useAppTheme();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const styles = getStyles(themeColors);

  const currency = user?.currency ?? 'USD';
  const firstName = (user?.name ?? 'there').split(' ')[0];
  const forecast = useSpendingForecast();

  const spentRatio = income > 0 ? expense / income : expense > 0 ? 1 : 0;
  const recent = transactions.slice(0, 5);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
            <Text style={styles.subGreeting}>Here's where things stand</Text>
          </View>
          <View style={styles.headerRightActions}>
            <Pressable
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.themeToggle,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name={themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={themeColors.text}
              />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={({ pressed }) => [
                styles.avatar,
                { backgroundColor: user?.avatarColor ?? themeColors.primary, overflow: 'hidden' },
                pressed && { opacity: 0.8 },
              ]}
            >
              {user?.avatarUri ? (
                <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Balance card */}
        <LinearGradient
          colors={[colors.surfaceRaised, colors.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>{formatCurrency(totalBalance, currency)}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <View style={[styles.dot, { backgroundColor: colors.income }]} />
              <View>
                <Text style={styles.statLabel}>Income this month</Text>
                <Text style={[styles.statValue, { color: colors.income }]}>
                  {formatCurrency(income, currency)}
                </Text>
              </View>
            </View>
            <View style={styles.balanceStat}>
              <View style={[styles.dot, { backgroundColor: colors.expense }]} />
              <View>
                <Text style={styles.statLabel}>Spent this month</Text>
                <Text style={[styles.statValue, { color: colors.expense }]}>
                  {formatCurrency(expense, currency)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Flow ring */}
        <View style={styles.flowCard}>
          <RingGauge
            progress={spentRatio}
            color={spentRatio > 0.9 ? colors.expense : colors.primary}
            value={`${Math.round(spentRatio * 100)}%`}
            label="of income spent"
          />
          <View style={styles.flowText}>
            <Text style={styles.flowTitle}>This month's flow</Text>
            <Text style={styles.flowSubtitle}>
              {income > 0
                ? spentRatio < 1
                  ? `You've spent ${Math.round(spentRatio * 100)}% of what you've earned. ${formatCurrency(
                      income - expense,
                      currency
                    )} left to plan with.`
                  : `Spending has passed income by ${formatCurrency(expense - income, currency)} this month.`
                : `You've spent ${formatCurrency(expense, currency)} so far, with no income logged yet.`}
            </Text>
          </View>
        </View>

        {/* Spending Forecast */}
        <Pressable
          onPress={() => navigation.navigate('SpendingForecast')}
          style={({ pressed }) => [styles.forecastCard, pressed && { opacity: 0.95 }]}
        >
          <View style={styles.forecastHeader}>
            <View style={styles.forecastHeaderLeft}>
              <View style={[styles.forecastIconContainer, { backgroundColor: themeColors.primarySoft }]}>
                <Ionicons name="analytics-outline" size={20} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.forecastTitle}>Spending Forecast</Text>
                <Text style={styles.forecastSub}>Projected spending for {new Date().toLocaleString('default', { month: 'long' })}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.forecastRow}>
            <View style={styles.forecastStat}>
              <Text style={styles.forecastStatVal}>{formatCurrency(forecast.dailyAverage, currency)}</Text>
              <Text style={styles.forecastStatLbl}>Daily Average</Text>
            </View>
            <View style={styles.forecastStat}>
              <Text style={[styles.forecastStatVal, { color: forecast.isOverBudget ? colors.expense : colors.income }]}>
                {formatCurrency(forecast.projectedSpend, currency)}
              </Text>
              <Text style={styles.forecastStatLbl}>Projected Total</Text>
            </View>
          </View>

          {forecast.totalBudgetLimit > 0 ? (
            <View style={styles.forecastBudgetProgressContainer}>
              <View style={styles.forecastBudgetRow}>
                <Text style={styles.forecastBudgetLbl}>Projected vs Budget Limit</Text>
                <Text style={styles.forecastBudgetVal}>
                  {Math.round(forecast.pctOfBudget)}%
                </Text>
              </View>
              <View style={[styles.forecastBudgetBarTrack, { backgroundColor: themeColors.surfaceAlt }]}>
                <View
                  style={[
                    styles.forecastBudgetBarFill,
                    {
                      width: `${Math.min(forecast.pctOfBudget, 100)}%` as any,
                      backgroundColor: forecast.isOverBudget ? colors.expense : colors.income,
                    },
                  ]}
                />
              </View>
              {forecast.isOverBudget && (
                <Text style={styles.forecastWarningText}>
                  ⚠️ You are projected to exceed your budgets by {formatCurrency(forecast.projectedSpend - forecast.totalBudgetLimit, currency)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.forecastNoBudget}>
              No active budgets set for this month. Set budgets to see warning threshold.
            </Text>
          )}
        </Pressable>

        {/* Accounts */}
        <SectionHeader
          title="Accounts"
          action="Manage"
          onPressAction={() => navigation.navigate('Settings')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
          <View style={styles.accountsRow}>
            {accounts.map((acc) => (
              <View key={acc.id} style={styles.accountCard}>
                <CategoryIcon icon={acc.icon} color={acc.color} size={36} />
                <Text style={styles.accountName}>{acc.name}</Text>
                <Text
                  style={[
                    styles.accountBalance,
                    { color: acc.balance < 0 ? colors.expense : colors.text },
                  ]}
                >
                  {formatCurrency(acc.balance, currency)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
 
        {/* Savings Goals */}
        <SectionHeader
          title="Savings Goals"
          action="See all"
          onPressAction={() => navigation.navigate('SavingsGoals')}
        />
        <View style={[styles.listCard, { marginBottom: spacing.lg }]}>
          {goals.length === 0 ? (
            <Pressable
              onPress={() => navigation.navigate('SavingsGoals')}
              style={({ pressed }) => [styles.emptyGoalRow, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="ribbon-outline" size={20} color={themeColors.textMuted} />
              <Text style={[styles.emptyGoalText, { color: themeColors.textMuted }]}>
                Set savings goals for trips, emergency funds, and more.
              </Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textFaint} />
            </Pressable>
          ) : (
            goals.slice(0, 2).map((goal, idx) => {
              const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
              const pct = Math.round(progress * 100);
              return (
                <View key={goal.id}>
                  <Pressable
                    onPress={() => navigation.navigate('SavingsGoals')}
                    style={styles.goalItem}
                  >
                    <View style={styles.goalRowHeader}>
                      <Text style={[styles.goalRowName, { color: themeColors.text }]}>{goal.name}</Text>
                      <Text style={[styles.goalRowPct, { color: themeColors.primary }]}>{pct}%</Text>
                    </View>
                    <View style={[styles.goalRowBarTrack, { backgroundColor: themeColors.surfaceAlt }]}>
                      <View
                        style={[
                          styles.goalRowBarFill,
                          {
                            width: `${pct}%` as any,
                            backgroundColor: progress >= 1 ? colors.income : themeColors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.goalRowAmt, { color: themeColors.textMuted }]}>
                      {formatCurrency(goal.currentAmount, currency)} of {formatCurrency(goal.targetAmount, currency)}
                    </Text>
                  </Pressable>
                  {idx < Math.min(goals.length, 2) - 1 && <View style={styles.divider} />}
                </View>
              );
            })
          )}
        </View>

        {/* Recent transactions */}
        <SectionHeader
          title="Recent activity"
          action="See all"
          onPressAction={() => navigation.navigate('History')}
        />
        <View style={styles.listCard}>
          {recent.length === 0 ? (
            <EmptyState title="No transactions yet" subtitle="Tap the + button to add your first one." />
          ) : (
            recent.map((txn, idx) => (
              <View key={txn.id}>
                <TransactionRow
                  transaction={txn}
                  category={txn.categoryId ? categoryById[txn.categoryId] : undefined}
                  accountName={accountById[txn.accountId]?.name}
                  currency={currency}
                  onPress={() => navigation.navigate('TxnDetail', { id: txn.id })}
                />
                {idx < recent.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (themeColors: typeof colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl * 1.5 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: { color: themeColors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.xxl },
  subGreeting: { color: themeColors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.sm, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: themeColors.white, fontFamily: fonts.displayBold, fontSize: fontSizes.lg },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  balanceCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  balanceLabel: { color: themeColors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  balanceValue: {
    color: themeColors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.display,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  balanceRow: { flexDirection: 'row', gap: spacing.xl },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { color: themeColors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs },
  statValue: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, marginTop: 2 },

  flowCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: themeColors.borderSoft,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  flowText: { flex: 1 },
  flowTitle: { color: themeColors.text, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, marginBottom: 4 },
  flowSubtitle: { color: themeColors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: 18 },

  accountsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md },
  accountCard: {
    width: 150,
    backgroundColor: themeColors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: themeColors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  accountName: { color: themeColors.text, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  accountBalance: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md },

  listCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: themeColors.borderSoft,
    paddingHorizontal: spacing.lg,
  },
  divider: { height: 1, backgroundColor: themeColors.borderSoft },
  emptyGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyGoalText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
  },
  goalItem: {
    paddingVertical: spacing.md,
  },
  goalRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  goalRowName: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },
  goalRowPct: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
  goalRowBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  goalRowBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalRowAmt: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
  },
  forecastCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: themeColors.borderSoft,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  forecastHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  forecastIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: themeColors.text,
  },
  forecastSub: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: themeColors.textMuted,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: themeColors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  forecastStat: {
    flex: 1,
    alignItems: 'center',
  },
  forecastStatVal: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.md,
    color: themeColors.text,
  },
  forecastStatLbl: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  forecastBudgetProgressContainer: {
    marginTop: spacing.xs,
  },
  forecastBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  forecastBudgetLbl: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: themeColors.textMuted,
  },
  forecastBudgetVal: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: themeColors.text,
  },
  forecastBudgetBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  forecastBudgetBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  forecastWarningText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.expense,
  },
  forecastNoBudget: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: themeColors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
