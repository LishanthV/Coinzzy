export interface LoanInput {
  principal: number;       // Total loan amount
  annualInterestRate: number; // e.g. 12 for 12%
  monthlySalary: number;   // Take-home salary
  tenureMonths: number;    // Desired loan tenure
}

export interface EMIScheduleRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  salaryPercentage: number;
  schedule: EMIScheduleRow[];
  strategies: RepaymentStrategy[];
  safeSalaryAllocation: SalaryAllocation;
}

export interface RepaymentStrategy {
  name: string;
  description: string;
  extraMonthly: number;
  newTenureMonths: number;
  interestSaved: number;
  icon: string;
}

export interface SalaryAllocation {
  emi: number;
  emiPercent: number;
  savings: number;
  savingsPercent: number;
  living: number;
  livingPercent: number;
  isHealthy: boolean;
  warning: string | null;
}

// Standard EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
export function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi * 100) / 100;
}

export function generateSchedule(
  principal: number,
  annualRate: number,
  months: number,
  extraMonthly = 0
): EMIScheduleRow[] {
  const r = annualRate / 12 / 100;
  const emi = calculateEMI(principal, annualRate, months);
  const schedule: EMIScheduleRow[] = [];
  let balance = principal;
  let month = 1;

  while (balance > 0 && month <= months * 2) {
    const interestPart = annualRate === 0 ? 0 : Math.round(balance * r * 100) / 100;
    const principalPart = Math.round((emi + extraMonthly - interestPart) * 100) / 100;
    const actualPrincipal = Math.min(principalPart, balance);
    balance = Math.round((balance - actualPrincipal) * 100) / 100;

    schedule.push({
      month,
      emi: Math.round((actualPrincipal + interestPart) * 100) / 100,
      principal: actualPrincipal,
      interest: interestPart,
      balance: balance < 0 ? 0 : balance,
    });

    if (balance <= 0) break;
    month++;
  }

  return schedule;
}

export function buildStrategies(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  monthlySalary: number
): RepaymentStrategy[] {
  const baseEMI = calculateEMI(principal, annualRate, tenureMonths);
  const baseSchedule = generateSchedule(principal, annualRate, tenureMonths);
  const baseTotalInterest = baseSchedule.reduce((s, r) => s + r.interest, 0);

  const strategies: RepaymentStrategy[] = [];

  // Strategy 1: Pay 10% extra
  const extra10 = Math.round(baseEMI * 0.1);
  const sched10 = generateSchedule(principal, annualRate, tenureMonths, extra10);
  strategies.push({
    name: 'Pay 10% Extra',
    description: `Add ₹${extra10.toLocaleString('en-IN')} extra every month`,
    extraMonthly: extra10,
    newTenureMonths: sched10.length,
    interestSaved: Math.round(baseTotalInterest - sched10.reduce((s, r) => s + r.interest, 0)),
    icon: '🚀',
  });

  // Strategy 2: Pay 20% extra
  const extra20 = Math.round(baseEMI * 0.2);
  const sched20 = generateSchedule(principal, annualRate, tenureMonths, extra20);
  strategies.push({
    name: 'Pay 20% Extra',
    description: `Add ₹${extra20.toLocaleString('en-IN')} extra every month`,
    extraMonthly: extra20,
    newTenureMonths: sched20.length,
    interestSaved: Math.round(baseTotalInterest - sched20.reduce((s, r) => s + r.interest, 0)),
    icon: '⚡',
  });

  // Strategy 3: One extra EMI per year
  const extraPerYear = Math.round(baseEMI / 12);
  const schedBonus = generateSchedule(principal, annualRate, tenureMonths, extraPerYear);
  strategies.push({
    name: 'One Bonus EMI/Year',
    description: `Pay 1 extra EMI annually (₹${extraPerYear.toLocaleString('en-IN')}/mo equivalent)`,
    extraMonthly: extraPerYear,
    newTenureMonths: schedBonus.length,
    interestSaved: Math.round(baseTotalInterest - schedBonus.reduce((s, r) => s + r.interest, 0)),
    icon: '🎯',
  });

  // Strategy 4: Use 5% of salary extra
  const extraSalary = Math.round(monthlySalary * 0.05);
  if (extraSalary > 0) {
    const schedSalary = generateSchedule(principal, annualRate, tenureMonths, extraSalary);
    strategies.push({
      name: '5% of Salary Extra',
      description: `Put ₹${extraSalary.toLocaleString('en-IN')} (5% salary) towards loan`,
      extraMonthly: extraSalary,
      newTenureMonths: schedSalary.length,
      interestSaved: Math.round(baseTotalInterest - schedSalary.reduce((s, r) => s + r.interest, 0)),
      icon: '💰',
    });
  }

  return strategies;
}

export function buildSalaryAllocation(emi: number, salary: number): SalaryAllocation {
  const emiPercent = Math.round((emi / salary) * 100);
  const savingsPercent = Math.max(0, Math.min(20, 100 - emiPercent - 50)); // at least try 20% savings
  const livingPercent = 100 - emiPercent - savingsPercent;
  const isHealthy = emiPercent <= 40;

  let warning: string | null = null;
  if (emiPercent > 60) warning = 'EMI exceeds 60% of salary. Consider a longer tenure or lower loan.';
  else if (emiPercent > 40) warning = 'EMI is high. Try to reduce expenses and avoid new debt.';

  return {
    emi,
    emiPercent,
    savings: Math.round(salary * savingsPercent / 100),
    savingsPercent,
    living: Math.round(salary * livingPercent / 100),
    livingPercent,
    isHealthy,
    warning,
  };
}

export function calculateLoan(input: LoanInput): LoanResult {
  const { principal, annualInterestRate, monthlySalary, tenureMonths } = input;
  const emi = calculateEMI(principal, annualInterestRate, tenureMonths);
  const schedule = generateSchedule(principal, annualInterestRate, tenureMonths);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPayment = schedule.reduce((s, r) => s + r.emi, 0);
  const salaryPercentage = Math.round((emi / monthlySalary) * 100);
  const strategies = buildStrategies(principal, annualInterestRate, tenureMonths, monthlySalary);
  const safeSalaryAllocation = buildSalaryAllocation(emi, monthlySalary);

  return {
    emi: Math.round(emi),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    salaryPercentage,
    schedule,
    strategies,
    safeSalaryAllocation,
  };
}
