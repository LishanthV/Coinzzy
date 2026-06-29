import { Transaction, Budget } from '../types'; // adjust import path if needed

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryForecast {
  category: string;
  spentSoFar: number;
  projectedTotal: number;
  budgetLimit: number | null;
  percentOfBudget: number | null;
  status: 'on_track' | 'warning' | 'over_budget' | 'no_budget';
  daysRemaining: number;
  dailyAverage: number;
}

export interface SpendingForecast {
  totalSpentSoFar: number;
  projectedMonthTotal: number;
  projectedSavings: number | null; // null if no income data
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyAverageSpend: number;
  categories: CategoryForecast[];
  overBudgetCategories: CategoryForecast[];
  warningCategories: CategoryForecast[];
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDaysElapsed(): number {
  const now = new Date();
  return now.getDate(); // day of month (1-based = days elapsed including today)
}

function isCurrentMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

// ─── Core forecast engine ─────────────────────────────────────────────────────

export function generateSpendingForecast(
  transactions: Transaction[],
  budgets: Budget[],
  monthlyIncome?: number
): SpendingForecast {
  const now = new Date();
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
  const daysElapsed = getDaysElapsed();
  const daysRemaining = daysInMonth - daysElapsed;

  // Filter to current month expenses only
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && isCurrentMonth(t.date)
  );

  const totalSpentSoFar = currentMonthExpenses.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const dailyAverageSpend = daysElapsed > 0 ? totalSpentSoFar / daysElapsed : 0;
  const projectedMonthTotal = dailyAverageSpend * daysInMonth;

  // Income-based savings projection
  const projectedSavings =
    monthlyIncome != null && monthlyIncome > 0
      ? monthlyIncome - projectedMonthTotal
      : null;

  // ── Per-category breakdown ────────────────────────────────────────────────

  // Group expenses by category
  const categoryTotals: Record<string, number> = {};
  for (const t of currentMonthExpenses) {
    const cat = t.categoryId || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
  }

  // Build a budget lookup map
  const budgetMap: Record<string, number> = {};
  for (const b of budgets) {
    if (b.period === 'monthly') {
      budgetMap[b.categoryId] = Number(b.limit);
    }
  }

  // Generate per-category forecasts
  const categories: CategoryForecast[] = Object.entries(categoryTotals).map(
    ([category, spentSoFar]) => {
      const dailyAverage = daysElapsed > 0 ? spentSoFar / daysElapsed : 0;
      const projectedTotal = dailyAverage * daysInMonth;
      const budgetLimit = budgetMap[category] ?? null;

      let percentOfBudget: number | null = null;
      let status: CategoryForecast['status'] = 'no_budget';

      if (budgetLimit !== null) {
        percentOfBudget = (projectedTotal / budgetLimit) * 100;
        if (projectedTotal > budgetLimit) {
          status = 'over_budget';
        } else if (percentOfBudget >= 80) {
          status = 'warning';
        } else {
          status = 'on_track';
        }
      }

      return {
        category,
        spentSoFar,
        projectedTotal,
        budgetLimit,
        percentOfBudget,
        status,
        daysRemaining,
        dailyAverage,
      };
    }
  );

  // Sort: over_budget first, then warning, then on_track, then no_budget
  const statusOrder = { over_budget: 0, warning: 1, on_track: 2, no_budget: 3 };
  categories.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  return {
    totalSpentSoFar,
    projectedMonthTotal,
    projectedSavings,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    dailyAverageSpend,
    categories,
    overBudgetCategories: categories.filter((c) => c.status === 'over_budget'),
    warningCategories: categories.filter((c) => c.status === 'warning'),
    generatedAt: now.toISOString(),
  };
}

// ─── Formatting helpers (use in UI) ───────────────────────────────────────────

export function formatForecastAmount(amount: number, currency = '₹'): string {
  if (amount >= 100000) return `${currency}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${currency}${(amount / 1000).toFixed(1)}K`;
  return `${currency}${amount.toFixed(0)}`;
}

export function getForecastStatusColor(status: CategoryForecast['status']): string {
  switch (status) {
    case 'over_budget': return '#EF4444'; // red
    case 'warning':     return '#F59E0B'; // amber
    case 'on_track':    return '#10B981'; // green
    default:            return '#6B7280'; // gray
  }
}

export function getForecastStatusLabel(status: CategoryForecast['status']): string {
  switch (status) {
    case 'over_budget': return 'Over Budget';
    case 'warning':     return 'At Risk';
    case 'on_track':    return 'On Track';
    default:            return 'No Budget Set';
  }
}
