import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Home,
  Car,
  GraduationCap,
  User,
  CreditCard,
  DollarSign,
  Percent,
  Calendar,
  TrendingDown,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import loanService, {
  Loan,
  LoanPayment,
  AmortizationEntry,
  generateAmortizationSchedule,
} from '@/lib/loanService';

const LOAN_TYPE_ICONS: Record<string, any> = {
  mortgage: Home,
  auto: Car,
  student: GraduationCap,
  personal: User,
  other: CreditCard,
};

export default function LoanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  useEffect(() => {
    if (id) loadLoanData();
  }, [id]);

  const loadLoanData = async () => {
    try {
      const [loadedLoan, loadedPayments] = await Promise.all([
        loanService.getLoan(id!),
        loanService.getLoanPayments(id!),
      ]);
      setLoan(loadedLoan);
      setPayments(loadedPayments);
    } catch (error) {
      console.error('Failed to load loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const schedule = useMemo(() => {
    if (!loan) return [];
    return generateAmortizationSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.startDate,
      loan.paymentDay
    );
  }, [loan]);

  const totalInterest = useMemo(() => {
    if (!loan) return 0;
    return loanService.calculateTotalInterest(loan.principal, loan.interestRate, loan.termMonths);
  }, [loan]);

  const paidPayments = useMemo(() => {
    return payments.filter(p => p.status === 'paid' || p.status === 'partial');
  }, [payments]);

  const principalPaid = useMemo(() => {
    return paidPayments.reduce((sum, p) => sum + p.principalPortion, 0);
  }, [paidPayments]);

  const interestPaid = useMemo(() => {
    return paidPayments.reduce((sum, p) => sum + p.interestPortion, 0);
  }, [paidPayments]);

  const currentBalance = useMemo(() => {
    if (paidPayments.length === 0) return loan?.principal || 0;
    return paidPayments[paidPayments.length - 1].remainingBalance;
  }, [paidPayments, loan]);

  const progressPercent = useMemo(() => {
    if (!loan) return 0;
    return ((loan.principal - currentBalance) / loan.principal) * 100;
  }, [loan, currentBalance]);

  const handleRecordPayment = (payment: LoanPayment) => {
    Alert.alert(
      'Record Payment',
      `Mark payment #${payment.paymentNumber} (${formatCurrency(payment.amount)}) as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            await loanService.recordPayment(loan!.id, payment.paymentNumber);
            loadLoanData();
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

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading loan details...</Text>
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <AlertCircle size={48} color={Colors.textMuted} />
        <Text style={styles.loadingText}>Loan not found</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const Icon = LOAN_TYPE_ICONS[loan.type] || CreditCard;
  const displayedSchedule = showFullSchedule ? schedule : schedule.slice(0, 12);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{loan.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Loan Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.loanIconWrapper}>
              <Icon size={24} color={Colors.accent} />
            </View>
            <View style={styles.overviewInfo}>
              <Text style={styles.overviewLender}>{loan.lender}</Text>
              <Text style={styles.overviewType}>
                {loan.type.charAt(0).toUpperCase() + loan.type.slice(1)} Loan
              </Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Remaining Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${Math.min(progressPercent, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progressPercent.toFixed(1)}% paid off
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <DollarSign size={14} color={Colors.textSecondary} />
              <Text style={styles.statLabel}>Principal</Text>
              <Text style={styles.statValue}>{formatCurrency(loan.principal)}</Text>
            </View>
            <View style={styles.statItem}>
              <Percent size={14} color={Colors.textSecondary} />
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={styles.statValue}>{loan.interestRate}%</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={14} color={Colors.textSecondary} />
              <Text style={styles.statLabel}>Term</Text>
              <Text style={styles.statValue}>{loan.termMonths}mo</Text>
            </View>
            <View style={styles.statItem}>
              <DollarSign size={14} color={Colors.textSecondary} />
              <Text style={styles.statLabel}>Monthly</Text>
              <Text style={styles.statValue}>{formatCurrency(loan.monthlyPayment)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Principal Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatCurrency(principalPaid)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Interest Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatCurrency(interestPaid)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Interest (life of loan)</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalInterest)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Payoff Date</Text>
            <Text style={styles.summaryValue}>{formatDate(loanService.getPayoffDate(loan))}</Text>
          </View>
        </View>

        {/* Upcoming Payments */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Payments</Text>
            {payments
              .filter(p => p.status === 'scheduled')
              .slice(0, 3)
              .map((payment) => (
                <Pressable
                  key={payment.id}
                  style={styles.paymentCard}
                  onPress={() => handleRecordPayment(payment)}
                >
                  <View style={styles.paymentLeft}>
                    <View style={styles.paymentNumberBadge}>
                      <Text style={styles.paymentNumberText}>#{payment.paymentNumber}</Text>
                    </View>
                    <View>
                      <Text style={styles.paymentDate}>Due {formatDate(payment.dueDate)}</Text>
                      <Text style={styles.paymentBreakdown}>
                        Principal: {formatCurrency(payment.principalPortion)} · Interest: {formatCurrency(payment.interestPortion)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                    <Text style={styles.paymentAction}>Tap to record</Text>
                  </View>
                </Pressable>
              ))}
          </View>
        )}

        {/* Paid Payments */}
        {paidPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {paidPayments.slice(-5).reverse().map((payment) => (
              <View key={payment.id} style={styles.paidCard}>
                <View style={styles.paidIcon}>
                  <Check size={14} color={Colors.success} />
                </View>
                <View style={styles.paidInfo}>
                  <Text style={styles.paidText}>Payment #{payment.paymentNumber}</Text>
                  <Text style={styles.paidDate}>{formatDate(payment.paidDate || payment.dueDate)}</Text>
                </View>
                <Text style={styles.paidAmount}>{formatCurrency(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Amortization Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amortization Schedule</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Principal</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Interest</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Balance</Text>
          </View>

          {/* Table Rows */}
          {displayedSchedule.map((entry) => {
            const payment = payments.find(p => p.paymentNumber === entry.paymentNumber);
            const isPaid = payment?.status === 'paid' || payment?.status === 'partial';

            return (
              <View
                key={entry.paymentNumber}
                style={[styles.tableRow, isPaid && styles.tableRowPaid]}
              >
                <Text style={[styles.tableCell, { flex: 0.5 }]}>
                  {isPaid ? '✓' : entry.paymentNumber}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {formatShortDate(entry.date)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: Colors.success }]}>
                  {formatCurrency(entry.principal)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: Colors.warning }]}>
                  {formatCurrency(entry.interest)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(entry.balance)}
                </Text>
              </View>
            );
          })}

          {/* Show More / Less */}
          {schedule.length > 12 && (
            <Pressable
              style={styles.showMoreButton}
              onPress={() => setShowFullSchedule(!showFullSchedule)}
            >
              <Text style={styles.showMoreText}>
                {showFullSchedule
                  ? 'Show Less'
                  : `Show All ${schedule.length} Payments`}
              </Text>
            </Pressable>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  backLink: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  backLinkText: {
    color: '#fff',
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loanIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overviewInfo: {
    flex: 1,
  },
  overviewLender: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  overviewType: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  balanceSection: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 'auto',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  // Section
  section: {
    marginBottom: 24,
  },

  // Payment Cards
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  paymentNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentBreakdown: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentAction: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },

  // Paid Cards
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  paidIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  paidInfo: {
    flex: 1,
  },
  paidText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  paidDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowPaid: {
    backgroundColor: `${Colors.success}08`,
  },
  tableCell: {
    fontSize: 12,
    color: Colors.text,
  },
  showMoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
