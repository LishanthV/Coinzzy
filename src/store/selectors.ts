import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinanceStore } from './useFinanceStore';

export function useTotalBalance() {
  return useFinanceStore((s) =>
    s.accounts.reduce((sum, a) => sum + a.balance, 0)
  );
}

export function useNetForMonth(ref?: Date) {
  const finalRef = useMemo(() => ref ?? new Date(), [ref]);
  const month = finalRef.getMonth();
  const year = finalRef.getFullYear();

  const selector = useCallback(
    (s: any) => {
      let income = 0;
      let expense = 0;
      for (const t of s.transactions) {
        const d = new Date(t.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (t.type === 'income') income += t.amount;
          if (t.type === 'expense') expense += t.amount;
        }
      }
      return { income, expense };
    },
    [month, year]
  );

  return useFinanceStore(useShallow(selector));
}

export function useSpendByCategory(ref?: Date) {
  const finalRef = useMemo(() => ref ?? new Date(), [ref]);
  const month = finalRef.getMonth();
  const year = finalRef.getFullYear();

  const selector = useCallback(
    (s: any) => {
      const result: Record<string, number> = {};
      for (const t of s.transactions) {
        if (t.type !== 'expense') continue;
        const d = new Date(t.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (!t.categoryId) continue;
          result[t.categoryId] = (result[t.categoryId] ?? 0) + t.amount;
        }
      }
      return result;
    },
    [month, year]
  );

  return useFinanceStore(useShallow(selector));
}

export function useSpendingForecast() {
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);

  return useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Find total days in the current month
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Get current month's expenses
    let currentMonthExpense = 0;
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const d = new Date(t.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        currentMonthExpense += t.amount;
      }
    }

    const dailyAverage = currentDay > 0 ? currentMonthExpense / currentDay : 0;
    const projectedSpend = dailyAverage * totalDays;

    // Total active budget limits
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);

    const isOverBudget = totalBudgetLimit > 0 && projectedSpend > totalBudgetLimit;
    const pctOfBudget = totalBudgetLimit > 0 ? (projectedSpend / totalBudgetLimit) * 100 : 0;

    return {
      currentMonthExpense,
      dailyAverage,
      projectedSpend,
      totalBudgetLimit,
      isOverBudget,
      pctOfBudget,
      currentDay,
      totalDays,
    };
  }, [transactions, budgets]);
}


