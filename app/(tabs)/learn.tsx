import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
} from 'react-native';
import { 
  Clock, 
  CheckCircle,
  GraduationCap,
  PiggyBank,
  Wallet,
  Target,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

const LEARNING_CARDS = [
  {
    id: 'learn-1',
    title: 'Emergency Fund Basics',
    summary: 'Why you need 3-6 months of expenses saved',
    content: 'An emergency fund provides financial security for unexpected events like job loss, medical emergencies, or major repairs. The recommended amount is 3-6 months of essential expenses, stored in an easily accessible savings account.',
    category: 'basics',
    readTime: 3,
    completed: false,
    icon: PiggyBank,
  },
  {
    id: 'learn-2',
    title: 'The 50/30/20 Rule',
    summary: 'A simple framework for budgeting your income',
    content: 'This popular budgeting rule suggests: 50% for needs (housing, food, utilities), 30% for wants (entertainment, dining out), and 20% for savings and debt repayment. Adjust based on your situation—it\'s a starting point, not a strict rule.',
    category: 'budgeting',
    readTime: 4,
    completed: false,
    icon: Wallet,
  },
  {
    id: 'learn-3',
    title: 'Compound Growth',
    summary: 'How small amounts grow significantly over time',
    content: 'Compound growth means earning returns on your returns. Example: $200/month invested at 7% annual return grows to over $240,000 in 30 years. The key insight: time matters more than the amount. Starting early, even with small amounts, makes a significant difference.',
    category: 'saving',
    readTime: 4,
    completed: false,
    icon: Target,
  },
  {
    id: 'learn-4',
    title: 'Understanding Debt',
    summary: 'Not all debt is created equal',
    content: 'Debt can be categorized as "good" or "bad" based on its purpose. Mortgages and education loans can build assets or earning potential. High-interest consumer debt (like credit cards) typically works against your financial goals. Priority: pay off high-interest debt first.',
    category: 'basics',
    readTime: 3,
    completed: false,
    icon: GraduationCap,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  basics: Colors.accent,
  budgeting: Colors.success,
  saving: Colors.warning,
  planning: Colors.agents.scenarioLearning,
};

export default function LearnScreen() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [completedCards, setCompletedCards] = useState<string[]>([]);

  const toggleComplete = (id: string) => {
    setCompletedCards(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>
          Build your financial knowledge, one concept at a time
        </Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressCount}>
            {completedCards.length} of {LEARNING_CARDS.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(completedCards.length / LEARNING_CARDS.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {LEARNING_CARDS.map((card) => {
        const Icon = card.icon;
        const isExpanded = expandedCard === card.id;
        const isComplete = completedCards.includes(card.id);
        const categoryColor = CATEGORY_COLORS[card.category] || Colors.accent;

        return (
          <Card key={card.id} style={styles.card}>
            <Pressable 
              style={styles.cardHeader}
              onPress={() => setExpandedCard(isExpanded ? null : card.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: categoryColor + '15' }]}>
                <Icon size={20} color={categoryColor} />
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSummary} numberOfLines={isExpanded ? undefined : 1}>
                  {card.summary}
                </Text>
                
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{card.readTime} min</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15' }]}>
                    <Text style={[styles.categoryText, { color: categoryColor }]}>
                      {card.category}
                    </Text>
                  </View>
                </View>
              </View>

              {isComplete && (
                <CheckCircle size={20} color={Colors.success} style={styles.checkIcon} />
              )}
            </Pressable>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <Text style={styles.fullContent}>{card.content}</Text>
                
                <Pressable 
                  style={[
                    styles.completeButton,
                    isComplete && styles.completeButtonActive
                  ]}
                  onPress={() => toggleComplete(card.id)}
                >
                  <CheckCircle size={18} color={isComplete ? '#fff' : Colors.success} />
                  <Text style={[
                    styles.completeButtonText,
                    isComplete && styles.completeButtonTextActive
                  ]}>
                    {isComplete ? 'Completed' : 'Mark as Complete'}
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This content is educational only. For personalized financial advice, 
          consult a qualified financial professional.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  progressCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  card: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  checkIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fullContent: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 16,
    marginTop: 16,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '15',
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonActive: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: 8,
  },
  completeButtonTextActive: {
    color: '#fff',
  },
  disclaimer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
