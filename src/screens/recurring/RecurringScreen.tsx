import React, { useState, useMemo } from 'react';
import {
  ScrollView, StyleSheet, Text, View, Pressable, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../../components/finance';
import { Button, FormInput } from '../../components/ui';
import { colors, fonts, fontSizes, radii, spacing } from '../../theme';
import { useFinanceStore, RecurringRule } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/format';

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const TYPES = [
  { id: 'expense', label: 'Expense', color: colors.expense },
  { id: 'income', label: 'Income', color: colors.income },
];

export default function RecurringScreen() {
  const recurringRules = useFinanceStore((s) => s.recurringRules);
  const addRecurringRule = useFinanceStore((s) => s.addRecurringRule);
  const deleteRecurringRule = useFinanceStore((s) => s.deleteRecurringRule);
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? 'INR';

  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
    [categories, type]
  );

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setNote('');
    setAccountId(accounts[0]?.id ?? '');
    setCategoryId('');
    setFrequency('monthly');
    setNextDueDate(new Date().toISOString().slice(0, 10));
    setError('');
  };

  const handleAdd = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!accountId) {
      setError('Select an account.');
      return;
    }
    if (!categoryId) {
      setError('Select a category.');
      return;
    }
    if (!nextDueDate) {
      setError('Set a start date.');
      return;
    }

    await addRecurringRule({
      accountId,
      type,
      amount: parsedAmount,
      categoryId,
      note: note.trim(),
      frequency,
      nextDueDate,
    });

    setShowModal(false);
    resetForm();
  };

  const frequencyLabel = (f: string) => FREQUENCIES.find((x) => x.id === f)?.label ?? f;

  const nextDueDays = (dateStr: string) => {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Due today';
    if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`;
    return `Due in ${diff} day${diff !== 1 ? 's' : ''}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recurring</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {recurringRules.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No recurring transactions</Text>
            <Text style={styles.emptySubtitle}>Add salary, rent, EMIs or subscriptions to auto-track them every month.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Add your first one</Text>
            </Pressable>
          </View>
        ) : (
          recurringRules.map((rule) => {
            const cat = rule.categoryId ? categoryById[rule.categoryId] : null;
            const acc = accountById[rule.accountId];
            const isOverdue = new Date(rule.nextDueDate) <= new Date();
            return (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleLeft}>
                  {cat ? (
                    <CategoryIcon icon={cat.icon} color={cat.color} size={36} />
                  ) : (
                    <View style={[styles.ruleIconPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name="repeat-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleName}>{rule.note || cat?.name || 'Recurring'}</Text>
                    <Text style={styles.ruleMeta}>
                      {acc?.name} · {frequencyLabel(rule.frequency)}
                    </Text>
                    <Text style={[styles.ruleDue, isOverdue && { color: colors.expense }]}>
                      {nextDueDays(rule.nextDueDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.ruleRight}>
                  <Text style={[
                    styles.ruleAmount,
                    { color: rule.type === 'income' ? colors.income : colors.expense }
                  ]}>
                    {rule.type === 'expense' ? '-' : '+'}{formatCurrency(rule.amount, currency)}
                  </Text>
                  <Pressable
                    onPress={() => deleteRecurringRule(rule.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Recurring Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Recurring Transaction</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type */}
              <View style={styles.typeRow}>
                {TYPES.map((t) => {
                  const active = type === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => { setType(t.id as any); setCategoryId(''); }}
                      style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: `${t.color}22` }]}
                    >
                      <Text style={[styles.typeText, active && { color: t.color }]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <FormInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />

              <FormInput
                label="Note (e.g. Netflix, Rent, Salary)"
                value={note}
                onChangeText={setNote}
                placeholder="What is this for?"
              />

              {/* Account */}
              <Text style={styles.label}>Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  {accounts.map((acc) => {
                    const active = acc.id === accountId;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setAccountId(acc.id)}
                        style={[styles.chip, active && { borderColor: acc.color, backgroundColor: `${acc.color}22` }]}
                      >
                        <Text style={[styles.chipText, active && { color: acc.color }]}>{acc.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  {availableCategories.map((cat) => {
                    const active = cat.id === categoryId;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        style={[styles.chip, active && { borderColor: cat.color, backgroundColor: `${cat.color}22` }]}
                      >
                        <Text style={[styles.chipText, active && { color: cat.color }]}>{cat.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Frequency */}
              <Text style={styles.label}>Frequency</Text>
              <View style={[styles.row, { flexWrap: 'wrap', marginBottom: spacing.md }]}>
                {FREQUENCIES.map((f) => {
                  const active = frequency === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setFrequency(f.id as any)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Start date */}
              <FormInput
                label="Start Date (YYYY-MM-DD)"
                value={nextDueDate}
                onChangeText={setNextDueDate}
                placeholder="2026-07-01"
                keyboardType="numeric"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button label="Add Recurring Transaction" onPress={handleAdd} style={{ marginTop: spacing.sm }} />
              <Button label="Cancel" variant="ghost" onPress={() => { setShowModal(false); resetForm(); }} style={{ marginTop: spacing.sm }} />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.xxl },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.lg },
  emptySubtitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyBtn: {
    marginTop: spacing.sm, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm, borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  emptyBtnText: { color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm },
  ruleCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg, borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md, marginBottom: spacing.md,
  },
  ruleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  ruleIconPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ruleInfo: { flex: 1 },
  ruleName: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md },
  ruleMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSizes.xs, marginTop: 2 },
  ruleDue: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, marginTop: 2 },
  ruleRight: { alignItems: 'flex-end', gap: spacing.sm },
  ruleAmount: { fontFamily: fonts.displayBold, fontSize: fontSizes.md },
  deleteBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    borderWidth: 1, borderColor: colors.border, maxHeight: '90%',
  },
  modalTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: fontSizes.lg, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  typeText: { color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm },
  label: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radii.pill, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  chipTextActive: { color: colors.primary },
  error: { color: colors.expense, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, marginBottom: spacing.md },
});
