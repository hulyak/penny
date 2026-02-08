import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '@/types';

const EXPENSES_STORAGE_KEY = 'penny_expenses';

export const expenseService = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const stored = await AsyncStorage.getItem(EXPENSES_STORAGE_KEY);
      const expenses: Expense[] = stored ? JSON.parse(stored) : [];
      return expenses.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error reading expenses:', error);
      return [];
    }
  },

  async saveExpense(expense: Expense): Promise<boolean> {
    try {
      const expenses = await this.getExpenses();
      expenses.push(expense);
      await AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      return true;
    } catch (error) {
      console.error('Error saving expense:', error);
      return false;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const expenses = await this.getExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      await AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  },
};

export default expenseService;
