export type TxnType = 'expense' | 'income' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  updatedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number; // always positive; sign derived from type
  accountId: string;
  toAccountId?: string; // for transfers
  categoryId?: string; // not used for transfers
  note: string;
  date: string; // ISO date string
  merchant?: string;
  customCategory?: string;
  items?: { name: string; price: number; quantity?: number }[];
  updatedAt?: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: 'monthly';
  updatedAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: string;
  avatarColor: string;
  avatarUri?: string;
  age?: string;
  dob?: string;
  occupation?: string;
  maritalStatus?: string;
  sex?: string;
  monthlyIncomeTarget?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  updatedAt?: number;
}

