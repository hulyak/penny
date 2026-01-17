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
  Sparkles,
} from 'lucide-react-native';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/vgkftarej1um5e3yfmz34';

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

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  basics: { color: Colors.accent, bg: Colors.mintMuted, label: 'Basics' },
  budgeting: { color: Colors.lavender, bg: Colors.lavenderMuted, label: 'Budgeting' },
  saving: { color: Colors.warning, bg: Colors.warningMuted, label: 'Saving' },
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
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenCoachCard screenName="learn" />

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressSubtitle}>
              {completedCount === totalCount 
                ? "You've completed all lessons!" 
                : `${totalCount - completedCount} lessons to go`}
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Sparkles size={14} color={Colors.accent} />
            <Text style={styles.progressBadgeText}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Financial Literacy</Text>

      {LEARNING_CARDS.map((card) => {
        const Icon = card.icon;
        const isExpanded = expandedCard === card.id;
        const isComplete = completedCards.includes(card.id);
        const category = CATEGORY_CONFIG[card.category];

        return (
          <Pressable 
            key={card.id}
            style={[styles.card, isComplete && styles.cardComplete]}
            onPress={() => setExpandedCard(isExpanded ? null : card.id)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: category.bg }]}>
                <Icon size={22} color={category.color} />
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {isComplete && (
                    <CheckCircle size={18} color={Colors.success} />
                  )}
                </View>
                <Text style={styles.cardSummary}>{card.summary}</Text>
                
                <View style={styles.cardMeta}>
                  <View style={[styles.categoryPill, { backgroundColor: category.bg }]}>
                    <Text style={[styles.categoryText, { color: category.color }]}>
                      {category.label}
                    </Text>
                  </View>
                  <View style={styles.readTime}>
                    <Clock size={12} color={Colors.textMuted} />
                    <Text style={styles.readTimeText}>{card.readTime} min</Text>
                  </View>
                </View>
              </View>

              {!isExpanded && !isComplete && (
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
                    {isComplete ? 'Completed!' : 'Mark as Complete'}
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      })}

      <View style={styles.tipCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.tipMascot} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Keep Learning!</Text>
          <Text style={styles.tipText}>
            Small lessons add up to big knowledge. Come back tomorrow for more!
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

  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  progressSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardComplete: {
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  cardSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  lessonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.mintMuted,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  miniMascot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  lessonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '15',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonActive: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  completeButtonTextActive: {
    color: '#fff',
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.mintMuted,
    padding: 18,
    borderRadius: 18,
    marginTop: 8,
  },
  tipMascot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
