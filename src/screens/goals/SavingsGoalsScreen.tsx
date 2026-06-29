import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, FormInput, SectionHeader } from '../../components/ui';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency, formatMonthYear } from '../../utils/format';
import { colors, fonts, fontSizes, radii, spacing, useAppTheme } from '../../theme';
import { SavingsGoal } from '../../types';

export default function SavingsGoalsScreen() {
  const { colors: themeColors } = useAppTheme();
  const navigation = useNavigation();
  const goals = useFinanceStore((s) => s.goals);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? 'USD';

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Add Form Inputs
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [addError, setAddError] = useState('');

  // Manage Fund Inputs
  const [fundAmount, setFundAmount] = useState('');
  const [fundAction, setFundAction] = useState<'add' | 'withdraw'>('add');
  const [manageError, setManageError] = useState('');

  const handleAddGoal = async () => {
    const target = parseFloat(targetAmount);
    if (!name.trim()) {
      setAddError('Goal name is required.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setAddError('Please enter a valid target amount.');
      return;
    }

    await addGoal({
      name: name.trim(),
      targetAmount: target,
      currentAmount: 0,
      targetDate: targetDate ? targetDate : undefined,
    });

    setName('');
    setTargetAmount('');
    setTargetDate('');
    setAddError('');
    setShowAddModal(false);
  };

  const handleManageFunds = async () => {
    if (!selectedGoal) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      setManageError('Please enter a valid amount.');
      return;
    }

    let newCurrent = selectedGoal.currentAmount;
    if (fundAction === 'add') {
      newCurrent += amount;
    } else {
      if (amount > selectedGoal.currentAmount) {
        setManageError('Cannot withdraw more than you have saved.');
        return;
      }
      newCurrent -= amount;
    }

    await updateGoal(selectedGoal.id, {
      currentAmount: newCurrent,
    });

    setFundAmount('');
    setManageError('');
    setShowManageModal(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id);
    setShowManageModal(false);
    setSelectedGoal(null);
  };

  const openManageModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setFundAction('add');
    setFundAmount('');
    setManageError('');
    setShowManageModal(true);
  };

  const renderGoalCard = ({ item }: { item: SavingsGoal }) => {
    const progress = item.targetAmount > 0 ? Math.min(item.currentAmount / item.targetAmount, 1) : 0;
    const pct = Math.round(progress * 100);

    return (
      <Pressable onPress={() => openManageModal(item)} style={styles.cardPressable}>
        <Card style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalHeaderLeft}>
              <View style={[styles.goalIconContainer, { backgroundColor: themeColors.primarySoft }]}>
                <Ionicons name="trophy-outline" size={20} color={themeColors.primary} />
              </View>
              <View>
                <Text style={[styles.goalName, { color: themeColors.text }]}>{item.name}</Text>
                {item.targetDate && (
                  <Text style={[styles.goalDate, { color: themeColors.textMuted }]}>
                    Target by: {item.targetDate}
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.goalPctText, { color: themeColors.primary }]}>{pct}%</Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: themeColors.textMuted }]}>
              Saved: <Text style={[styles.amountValue, { color: themeColors.text }]}>{formatCurrency(item.currentAmount, currency)}</Text>
            </Text>
            <Text style={[styles.amountLabel, { color: themeColors.textMuted }]}>
              Target: <Text style={styles.targetValue}>{formatCurrency(item.targetAmount, currency)}</Text>
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: themeColors.surfaceAlt }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${pct}%` as any,
                  backgroundColor: progress >= 1 ? colors.income : themeColors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.actionPromptRow}>
            <Text style={[styles.actionPrompt, { color: themeColors.textMuted }]}>Tap to edit or add funds</Text>
            <Ionicons name="chevron-forward" size={14} color={themeColors.textFaint} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </Pressable>
        <Text style={[styles.title, { color: themeColors.text }]}>Savings Goals</Text>
        <Pressable style={[styles.addBtn, { backgroundColor: themeColors.primary }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={colors.white} />
        </Pressable>
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={64} color={themeColors.textFaint} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Start Saving Today</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
            Create savings goals for vacations, emergencies, gadgets or long-term dreams and track your progress.
          </Text>
          <Button label="Create your first goal" onPress={() => setShowAddModal(true)} style={styles.emptyBtn} />
        </View>
      ) : (
        <FlatList
          data={goals}
          renderItem={renderGoalCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal: Add Goal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Savings Goal</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

              <FormInput
                label="Goal Name"
                placeholder="e.g. Europe Trip, Emergency Fund"
                value={name}
                onChangeText={setName}
              />

              <FormInput
                label="Target Amount"
                placeholder="e.g. 50000"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <FormInput
                label="Target Date (Optional)"
                placeholder="YYYY-MM-DD"
                value={targetDate}
                onChangeText={setTargetDate}
              />

              <Button label="Create Goal" onPress={handleAddGoal} style={{ marginTop: spacing.md }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Manage Funds */}
      <Modal visible={showManageModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {selectedGoal?.name}
              </Text>
              <Pressable onPress={() => setShowManageModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {manageError ? <Text style={styles.errorText}>{manageError}</Text> : null}

              <View style={[styles.progressStatusContainer, { backgroundColor: themeColors.surfaceAlt }]}>
                <Text style={[styles.progressStatusLabel, { color: themeColors.textMuted }]}>Current Progress</Text>
                <Text style={[styles.progressStatusValue, { color: themeColors.text }]}>
                  {formatCurrency(selectedGoal?.currentAmount ?? 0, currency)} /{' '}
                  {formatCurrency(selectedGoal?.targetAmount ?? 0, currency)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionSelectRow}>
                <Pressable
                  onPress={() => setFundAction('add')}
                  style={[
                    styles.actionChip,
                    { borderColor: themeColors.border },
                    fundAction === 'add' && { backgroundColor: themeColors.primarySoft, borderColor: themeColors.primary },
                  ]}
                >
                  <Ionicons name="add-circle" size={18} color={fundAction === 'add' ? themeColors.primary : themeColors.textMuted} />
                  <Text style={[styles.actionChipText, { color: fundAction === 'add' ? themeColors.primary : themeColors.textMuted }]}>Add Fund</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFundAction('withdraw')}
                  style={[
                    styles.actionChip,
                    { borderColor: themeColors.border },
                    fundAction === 'withdraw' && { backgroundColor: colors.expenseSoft, borderColor: colors.expense },
                  ]}
                >
                  <Ionicons name="remove-circle" size={18} color={fundAction === 'withdraw' ? colors.expense : themeColors.textMuted} />
                  <Text style={[styles.actionChipText, { color: fundAction === 'withdraw' ? colors.expense : themeColors.textMuted }]}>Withdraw</Text>
                </Pressable>
              </View>

              <FormInput
                label="Amount"
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={fundAmount}
                onChangeText={setFundAmount}
              />

              <Button
                label={fundAction === 'add' ? 'Add to Savings' : 'Withdraw from Savings'}
                onPress={handleManageFunds}
                variant={fundAction === 'withdraw' ? 'danger' : 'primary'}
                style={{ marginTop: spacing.md }}
              />

              <Button
                label="Delete Goal"
                onPress={() => selectedGoal && handleDeleteGoal(selectedGoal.id)}
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xl,
    flex: 1,
    marginLeft: spacing.md,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardPressable: {
    marginBottom: spacing.md,
  },
  goalCard: {
    padding: spacing.lg,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
  },
  goalDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  goalPctText: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  amountLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
  },
  amountValue: {
    fontFamily: fonts.bodySemiBold,
  },
  targetValue: {
    fontFamily: fonts.bodyMedium,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  actionPromptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionPrompt: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: 240,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  errorText: {
    color: colors.expense,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
  },
  progressStatusContainer: {
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressStatusLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    marginBottom: 4,
  },
  progressStatusValue: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.md,
  },
  actionSelectRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  actionChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
});
