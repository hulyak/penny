import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Home,
  Car,
  GraduationCap,
  User,
  CreditCard,
  ChevronRight,
  Calendar,
  DollarSign,
  Percent,
  Trash2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import loanService, { Loan, LoanSummary, LoanPayment } from '@/lib/loanService';

const LOAN_TYPE_ICONS: Record<string, any> = {
  mortgage: Home,
  auto: Car,
  student: GraduationCap,
  personal: User,
  other: CreditCard,
};

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const [loadedLoans, loadedSummary] = await Promise.all([
        loanService.getLoans(),
        loanService.getLoanSummary(),
      ]);
      setLoans(loadedLoans);
      setSummary(loadedSummary);
    } catch (error) {
      console.error('Failed to load loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  }, []);

  const handleDeleteLoan = (loan: Loan) => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.name}"? This will also delete all payment history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await loanService.deleteLoan(loan.id);
            loadLoans();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Loans</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/portfolio/add-loan' as any)}
        >
          <Plus size={20} color={Colors.textLight} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {/* Summary Card */}
        {summary && loans.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Loan Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Balance</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.totalBalance)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Monthly Payment</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.totalMonthlyPayment)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Principal Paid</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  {formatCurrency(summary.totalPrincipalPaid)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Interest Paid</Text>
                <Text style={[styles.summaryValue, { color: Colors.warning }]}>
                  {formatCurrency(summary.totalInterestPaid)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Upcoming Payments */}
        {summary && summary.upcomingPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Payments</Text>
            {summary.upcomingPayments.slice(0, 3).map((payment) => {
              const loan = loans.find(l => l.id === payment.loanId);
              return (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{loan?.name || 'Unknown'}</Text>
                    <Text style={styles.paymentDate}>Due {formatDate(payment.dueDate)}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Loans List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Loans</Text>
          {loans.length === 0 ? (
            <Pressable
              style={styles.emptyCard}
              onPress={() => router.push('/portfolio/add-loan' as any)}
            >
              <CreditCard size={32} color={Colors.accent} />
              <Text style={styles.emptyTitle}>No loans tracked</Text>
              <Text style={styles.emptySubtitle}>
                Add your loans to track payments and amortization
              </Text>
            </Pressable>
          ) : (
            loans.map((loan) => {
              const Icon = LOAN_TYPE_ICONS[loan.type] || CreditCard;
              const payoffDate = loanService.getPayoffDate(loan);
              const totalInterest = loanService.calculateTotalInterest(
                loan.principal,
                loan.interestRate,
                loan.termMonths
              );

              return (
                <Pressable
                  key={loan.id}
                  style={styles.loanCard}
                  onPress={() => router.push(`/portfolio/loan/${loan.id}` as any)}
                >
                  <View style={styles.loanHeader}>
                    <View style={styles.loanIconWrapper}>
                      <Icon size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.loanInfo}>
                      <Text style={styles.loanName}>{loan.name}</Text>
                      <Text style={styles.loanLender}>{loan.lender}</Text>
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteLoan(loan)}
                    >
                      <Trash2 size={18} color={Colors.danger} />
                    </Pressable>
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailRow}>
                      <View style={styles.loanDetail}>
                        <DollarSign size={14} color={Colors.textSecondary} />
                        <Text style={styles.loanDetailLabel}>Principal</Text>
                        <Text style={styles.loanDetailValue}>{formatCurrency(loan.principal)}</Text>
                      </View>
                      <View style={styles.loanDetail}>
                        <Percent size={14} color={Colors.textSecondary} />
                        <Text style={styles.loanDetailLabel}>Rate</Text>
                        <Text style={styles.loanDetailValue}>{loan.interestRate}%</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <View style={styles.loanDetail}>
                        <Calendar size={14} color={Colors.textSecondary} />
                        <Text style={styles.loanDetailLabel}>Term</Text>
                        <Text style={styles.loanDetailValue}>{loan.termMonths} months</Text>
                      </View>
                      <View style={styles.loanDetail}>
                        <DollarSign size={14} color={Colors.textSecondary} />
                        <Text style={styles.loanDetailLabel}>Monthly</Text>
                        <Text style={styles.loanDetailValue}>{formatCurrency(loan.monthlyPayment)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.loanFooter}>
                    <Text style={styles.loanFooterText}>
                      Total interest: {formatCurrency(totalInterest)} · Payoff: {formatDate(payoffDate)}
                    </Text>
                    <ChevronRight size={18} color={Colors.textMuted} />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  loanLender: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  loanDetails: {
    gap: 8,
    marginBottom: 12,
  },
  loanDetailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loanDetail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loanDetailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loanDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 'auto',
  },
  loanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  loanFooterText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
