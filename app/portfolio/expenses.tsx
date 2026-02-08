import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Receipt,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Utensils,
  Car,
  Coffee,
  Tag,
  Heart,
  Home,
  Plane,
  Sparkles,
  Camera,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Expense } from '@/types';
import { expenseService } from '@/lib/expenseService';

const CATEGORY_ICONS: Record<string, any> = {
  groceries: ShoppingCart,
  dining: Utensils,
  transportation: Car,
  entertainment: Coffee,
  shopping: Tag,
  healthcare: Heart,
  utilities: Home,
  travel: Plane,
  other: Receipt,
};

const CATEGORY_COLORS: Record<string, string> = {
  groceries: Colors.success,
  dining: Colors.coral,
  transportation: Colors.blue,
  entertainment: Colors.lavender,
  shopping: Colors.gold,
  healthcare: Colors.danger,
  utilities: Colors.cyan,
  travel: Colors.accent,
  other: Colors.textMuted,
};

export default function ExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  const loadExpenses = async () => {
    setLoading(true);
    const data = await expenseService.getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Remove $${expense.total.toFixed(2)} at ${expense.merchant}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await expenseService.deleteExpense(expense.id);
            setExpenses(prev => prev.filter(e => e.id !== expense.id));
          },
        },
      ]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.total, 0);

  const renderExpense = ({ item }: { item: Expense }) => {
    const CategoryIcon = CATEGORY_ICONS[item.category] || Receipt;
    const color = CATEGORY_COLORS[item.category] || Colors.textMuted;
    const isExpanded = expandedId === item.id;
    const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;

    return (
      <Pressable
        style={styles.expenseCard}
        onPress={() => toggleExpand(item.id)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.expenseRow}>
          <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
            <CategoryIcon size={22} color={color} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.merchantName}>{item.merchant}</Text>
            <Text style={styles.expenseMeta}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              {item.date ? ` \u2022 ${item.date}` : ''}
            </Text>
          </View>
          <View style={styles.expenseRight}>
            <Text style={styles.expenseTotal}>${item.total.toFixed(2)}</Text>
            <ExpandIcon size={16} color={Colors.textMuted} />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Items */}
            <View style={styles.itemsList}>
              {item.items.map((lineItem, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <Text style={styles.lineItemName} numberOfLines={1}>
                    {lineItem.name}
                  </Text>
                  <Text style={styles.lineItemPrice}>
                    ${lineItem.totalPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.expandedTotals}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Subtotal</Text>
                <Text style={styles.totalLineValue}>${item.subtotal.toFixed(2)}</Text>
              </View>
              {item.tax != null && (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Tax</Text>
                  <Text style={styles.totalLineValue}>${item.tax.toFixed(2)}</Text>
                </View>
              )}
              {item.tip != null && (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Tip</Text>
                  <Text style={styles.totalLineValue}>${item.tip.toFixed(2)}</Text>
                </View>
              )}
              {item.paymentMethod && (
                <Text style={styles.paymentMethod}>Paid with {item.paymentMethod}</Text>
              )}
            </View>

            {/* Budget Insight */}
            <View style={styles.insightCard}>
              <Sparkles size={14} color={Colors.accent} />
              <Text style={styles.insightText}>{item.budgetInsight}</Text>
            </View>

            {/* Delete button */}
            <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Trash2 size={16} color={Colors.danger} />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Receipt size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Expenses Yet</Text>
      <Text style={styles.emptyText}>
        Scan a receipt to start tracking your expenses
      </Text>
      <Pressable
        style={styles.scanButton}
        onPress={() => router.push('/portfolio/receipt-scan')}
      >
        <Camera size={18} color={Colors.textLight} />
        <Text style={styles.scanButtonText}>Scan Receipt</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Pressable
          style={styles.scanHeaderButton}
          onPress={() => router.push('/portfolio/receipt-scan')}
        >
          <Camera size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Summary */}
      {expenses.length > 0 && (
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Tracked</Text>
            <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryCount}>{expenses.length}</Text>
            <Text style={styles.summaryCountLabel}>receipts</Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          renderItem={renderExpense}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  scanHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryRight: {
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryCountLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Expense Card
  expenseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  expenseMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  expenseTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  // Expanded
  expandedContent: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  itemsList: {
    gap: 6,
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineItemName: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lineItemPrice: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  expandedTotals: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginBottom: 12,
    gap: 4,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLineLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  totalLineValue: {
    fontSize: 13,
    color: Colors.text,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.accentMuted,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  insightText: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 17,
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
