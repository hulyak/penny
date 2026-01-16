import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { 
  Clock, 
  CheckCircle,
  PiggyBank,
  Wallet,
  Target,
  BookOpen,
  ChevronRight,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

const LEARNING_CARDS = [
  {
    id: 'learn-1',
    title: 'Emergency Fund Basics',
    summary: 'Why 3-6 months of savings matters',
    content: 'An emergency fund gives you peace of mind. It covers unexpected expenses like job loss, medical bills, or car repairs without going into debt.',
    category: 'basics',
    readTime: 3,
    icon: PiggyBank,
  },
  {
    id: 'learn-2',
    title: 'The 50/30/20 Rule',
    summary: 'A simple way to budget your money',
    content: '50% for needs (rent, food, utilities), 30% for wants (fun stuff), and 20% for savings. It\'s a starting point—adjust it to fit your life!',
    category: 'budgeting',
    readTime: 4,
    icon: Wallet,
  },
  {
    id: 'learn-3',
    title: 'Power of Compound Growth',
    summary: 'How small amounts grow big over time',
    content: 'When your money earns returns, and those returns earn more returns, that\'s compounding! Starting early—even with small amounts—makes a huge difference.',
    category: 'saving',
    readTime: 4,
    icon: Target,
  },
  {
    id: 'learn-4',
    title: 'Understanding Debt',
    summary: 'Not all debt is created equal',
    content: 'Some debt (like mortgages) can build wealth. High-interest debt (like credit cards) works against you. Focus on paying off high-interest debt first.',
    category: 'basics',
    readTime: 3,
    icon: BookOpen,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  basics: Colors.accent,
  budgeting: Colors.success,
  saving: Colors.warning,
};

export default function LearnScreen() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [completedCards, setCompletedCards] = useState<string[]>([]);

  const toggleComplete = (id: string) => {
    setCompletedCards(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const completedCount = completedCards.length;
  const totalCount = LEARNING_CARDS.length;

  const getMascotMessage = () => {
    if (completedCount === totalCount) return "You're a financial knowledge pro! 🎓";
    if (completedCount > totalCount / 2) return "Great progress! Keep learning!";
    if (completedCount > 0) return "Nice start! Knowledge is power.";
    return "Let's learn something new today!";
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Mascot Header */}
      <View style={styles.mascotCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.mascotImage} />
        <View style={styles.mascotContent}>
          <Text style={styles.mascotTitle}>Learn & Grow</Text>
          <Text style={styles.mascotMessage}>{getMascotMessage()}</Text>
        </View>
      </View>

      {/* Progress Card */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Your Progress</Text>
          <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(completedCount / totalCount) * 100}%` }
            ]} 
          />
        </View>
      </Card>

      {/* Learning Cards */}
      {LEARNING_CARDS.map((card) => {
        const Icon = card.icon;
        const isExpanded = expandedCard === card.id;
        const isComplete = completedCards.includes(card.id);
        const categoryColor = CATEGORY_COLORS[card.category] || Colors.accent;

        return (
          <Pressable 
            key={card.id}
            style={[styles.card, isComplete && styles.cardComplete]}
            onPress={() => setExpandedCard(isExpanded ? null : card.id)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: categoryColor + '15' }]}>
                <Icon size={20} color={categoryColor} />
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSummary}>{card.summary}</Text>
                
                <View style={styles.cardMeta}>
                  <Clock size={12} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{card.readTime} min read</Text>
                </View>
              </View>

              {isComplete ? (
                <CheckCircle size={22} color={Colors.success} />
              ) : (
                <ChevronRight size={20} color={Colors.textMuted} />
              )}
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.lessonBox}>
                  <Image source={{ uri: MASCOT_URL }} style={styles.miniMascot} />
                  <Text style={styles.lessonText}>{card.content}</Text>
                </View>
                
                <Pressable 
                  style={[styles.completeButton, isComplete && styles.completeButtonActive]}
                  onPress={() => toggleComplete(card.id)}
                >
                  <CheckCircle size={18} color={isComplete ? '#fff' : Colors.success} />
                  <Text style={[styles.completeButtonText, isComplete && styles.completeButtonTextActive]}>
                    {isComplete ? 'Completed!' : 'Mark Complete'}
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.tipMascot} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>
            Learning a little each day adds up! Come back tomorrow for more.
          </Text>
        </View>
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
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mascotImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  mascotContent: {
    flex: 1,
    marginLeft: 12,
  },
  mascotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  mascotMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressCard: {
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardComplete: {
    borderColor: Colors.success + '50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lessonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentMuted,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  miniMascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  lessonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '15',
    paddingVertical: 12,
    borderRadius: 10,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipMascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
