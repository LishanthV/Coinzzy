import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, fontSizes, spacing, radii } from '../theme';
import {
  calculateLoan,
  LoanResult,
  RepaymentStrategy,
  EMIScheduleRow,
} from '../utils/loanCalculator';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

// ─── sub-components ─────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  suffix?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SummaryCard({ result }: { result: LoanResult }) {
  const healthColor =
    result.salaryPercentage <= 30
      ? '#22c55e'
      : result.salaryPercentage <= 40
      ? '#f59e0b'
      : '#ef4444';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 Loan Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{fmt(result.emi)}</Text>
          <Text style={styles.summaryLabel}>Monthly EMI</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{fmt(result.totalInterest)}</Text>
          <Text style={styles.summaryLabel}>Total Interest</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{fmt(result.totalPayment)}</Text>
          <Text style={styles.summaryLabel}>Total Payment</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: healthColor }]}>
            {result.salaryPercentage}%
          </Text>
          <Text style={styles.summaryLabel}>Of Salary</Text>
        </View>
      </View>

      {/* Salary health bar */}
      <View style={styles.healthBar}>
        <View
          style={[
            styles.healthFill,
            {
              width: `${Math.min(result.salaryPercentage, 100)}%` as any,
              backgroundColor: healthColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.healthText, { color: healthColor }]}>
        {result.salaryPercentage <= 30
          ? '✅ Comfortable — EMI is within safe range'
          : result.salaryPercentage <= 40
          ? '⚠️ Manageable — keep other expenses low'
          : '🚨 Risky — EMI is too high for your salary'}
      </Text>
    </View>
  );
}

function AllocationCard({ result }: { result: LoanResult }) {
  const { safeSalaryAllocation: a } = result;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💼 Recommended Salary Split</Text>
      {a.warning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠️ {a.warning}</Text>
        </View>
      )}
      <AllocationRow
        label="EMI Payment"
        amount={a.emi}
        percent={a.emiPercent}
        color="#ef4444"
      />
      <AllocationRow
        label="Savings / Emergency"
        amount={a.savings}
        percent={a.savingsPercent}
        color="#22c55e"
      />
      <AllocationRow
        label="Living Expenses"
        amount={a.living}
        percent={a.livingPercent}
        color="#6366f1"
      />
    </View>
  );
}

function AllocationRow({
  label,
  amount,
  percent,
  color,
}: {
  label: string;
  amount: number;
  percent: number;
  color: string;
}) {
  return (
    <View style={styles.allocRow}>
      <View style={[styles.allocDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.allocLabelRow}>
          <Text style={styles.allocLabel}>{label}</Text>
          <Text style={styles.allocAmount}>
            {fmt(amount)} ({percent}%)
          </Text>
        </View>
        <View style={styles.allocBar}>
          <View
            style={[
              styles.allocFill,
              { width: `${Math.min(percent, 100)}%` as any, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function StrategyCard({ s, index }: { s: RepaymentStrategy; index: number }) {
  const monthsSaved = s.newTenureMonths < 0 ? 0 : undefined;
  return (
    <View style={styles.strategyCard}>
      <View style={styles.strategyHeader}>
        <Text style={styles.strategyIcon}>{s.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.strategyName}>{s.name}</Text>
          <Text style={styles.strategyDesc}>{s.description}</Text>
        </View>
      </View>
      <View style={styles.strategyStats}>
        <View style={styles.strategyStat}>
          <Text style={styles.strategyStatValue}>{s.newTenureMonths} mo</Text>
          <Text style={styles.strategyStatLabel}>New Tenure</Text>
        </View>
        <View style={styles.strategyStat}>
          <Text style={[styles.strategyStatValue, { color: '#22c55e' }]}>
            {fmt(s.interestSaved)}
          </Text>
          <Text style={styles.strategyStatLabel}>Interest Saved</Text>
        </View>
      </View>
    </View>
  );
}

function ScheduleTable({ schedule }: { schedule: EMIScheduleRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? schedule : schedule.slice(0, 6);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📅 Repayment Schedule</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, styles.tableHead]}>Mo</Text>
        <Text style={[styles.tableCell, styles.tableHead]}>EMI</Text>
        <Text style={[styles.tableCell, styles.tableHead]}>Principal</Text>
        <Text style={[styles.tableCell, styles.tableHead]}>Interest</Text>
        <Text style={[styles.tableCell, styles.tableHead]}>Balance</Text>
      </View>
      {rows.map((row) => (
        <View
          key={row.month}
          style={[
            styles.tableRow,
            row.month % 2 === 0 && styles.tableRowAlt,
          ]}
        >
          <Text style={styles.tableCell}>{row.month}</Text>
          <Text style={styles.tableCell}>{fmt(row.emi)}</Text>
          <Text style={[styles.tableCell, { color: '#6366f1' }]}>
            {fmt(row.principal)}
          </Text>
          <Text style={[styles.tableCell, { color: '#ef4444' }]}>
            {fmt(row.interest)}
          </Text>
          <Text style={styles.tableCell}>{fmt(row.balance)}</Text>
        </View>
      ))}
      {schedule.length > 6 && (
        <TouchableOpacity
          style={styles.showMoreBtn}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.showMoreText}>
            {showAll ? 'Show Less ↑' : `Show All ${schedule.length} Months ↓`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────
export default function LoanPlannerScreen() {
  const navigation = useNavigation();

  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [salary, setSalary] = useState('');
  const [result, setResult] = useState<LoanResult | null>(null);
  const [error, setError] = useState('');

  const calculate = useCallback(() => {
    setError('');
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseInt(tenure);
    const s = parseFloat(salary);

    if (!p || !r || !t || !s) {
      setError('Please fill in all fields.');
      return;
    }
    if (p <= 0 || r < 0 || t <= 0 || s <= 0) {
      setError('All values must be positive.');
      return;
    }
    if (r > 100) {
      setError('Interest rate seems too high. Enter annual % (e.g. 12).');
      return;
    }

    const res = calculateLoan({
      principal: p,
      annualInterestRate: r,
      monthlySalary: s,
      tenureMonths: t,
    });
    setResult(res);
  }, [principal, rate, tenure, salary]);

  const reset = () => {
    setPrincipal('');
    setRate('');
    setTenure('');
    setSalary('');
    setResult(null);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Loan Planner</Text>
          <Text style={styles.subtitle}>
            Enter your loan details to get the smartest repayment strategy
          </Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏦 Loan Details</Text>
          <InputField
            label="Loan Amount"
            value={principal}
            onChangeText={setPrincipal}
            placeholder="e.g. 500000"
            suffix="₹"
          />
          <InputField
            label="Annual Interest Rate"
            value={rate}
            onChangeText={setRate}
            placeholder="e.g. 12"
            suffix="%"
          />
          <InputField
            label="Tenure"
            value={tenure}
            onChangeText={setTenure}
            placeholder="e.g. 36"
            suffix="months"
          />
          <InputField
            label="Monthly Take-Home Salary"
            value={salary}
            onChangeText={setSalary}
            placeholder="e.g. 50000"
            suffix="₹"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
            <Text style={styles.calcBtnText}>Calculate Repayment Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <>
            <SummaryCard result={result} />
            <AllocationCard result={result} />

            {/* Strategies */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚡ Faster Payoff Strategies</Text>
              <Text style={styles.strategyIntro}>
                Pick a strategy below to clear your loan faster and save on interest:
              </Text>
              {result.strategies.map((s, i) => (
                <StrategyCard key={i} s={s} index={i} />
              ))}
            </View>

            <ScheduleTable schedule={result.schedule} />

            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>🔄 Reset & Calculate Again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 48 },

  header: { marginBottom: spacing.lg },
  backBtn: { marginBottom: spacing.md },
  backText: { color: colors.primary || '#6366f1', fontSize: fontSizes.md, fontFamily: fonts.bodyMedium },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xxl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface || '#1e1e2e',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
    marginBottom: spacing.md,
  },

  inputGroup: { marginBottom: spacing.md },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || '#2e2e42',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    paddingVertical: 12,
  },
  suffix: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    marginLeft: 8,
  },

  error: {
    color: '#ef4444',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  calcBtn: {
    backgroundColor: colors.primary || '#6366f1',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  calcBtnText: {
    color: '#fff',
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.md,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    marginTop: 4,
  },

  healthBar: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  healthFill: { height: '100%', borderRadius: 4 },
  healthText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },

  warningBox: {
    backgroundColor: '#f59e0b22',
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    color: '#f59e0b',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },

  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  allocDot: { width: 10, height: 10, borderRadius: 5 },
  allocLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  allocLabel: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
  },
  allocAmount: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },
  allocBar: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  allocFill: { height: '100%', borderRadius: 3 },

  strategyIntro: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  strategyCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border || '#2e2e42',
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  strategyIcon: { fontSize: 22 },
  strategyName: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.md,
  },
  strategyDesc: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  strategyStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  strategyStat: { alignItems: 'center' },
  strategyStatValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.md,
  },
  strategyStatLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingVertical: 8,
    marginBottom: 4,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 7 },
  tableRowAlt: { backgroundColor: colors.bg + '55' },
  tableHead: { color: colors.textMuted, fontFamily: fonts.displayBold },
  tableCell: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
  },
  showMoreBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#2e2e42',
  },
  showMoreText: {
    color: colors.primary || '#6366f1',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },

  resetBtn: {
    borderWidth: 1,
    borderColor: colors.border || '#2e2e42',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resetText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
  },
});
