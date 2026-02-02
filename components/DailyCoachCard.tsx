import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  Flame,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Heart,
  TrendingUp,
  AlertCircle,
  BookOpen,
  PartyPopper,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import {
  generateMorningGreeting,
  generateDailyTip,
  getDailyCoachState,
  recordCheckIn,
  generatePersonalizedInsights,
  type PersonalizedInsight,
  type FinancialContext,
} from '@/lib/dailyCoach';

interface DailyCoachCardProps {
  userName?: string;
  context: FinancialContext;
  onInsightPress?: (insight: PersonalizedInsight) => void;
}

export function DailyCoachCard({
  userName,
  context,
  onInsightPress,
}: DailyCoachCardProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [insights, setInsights] = useState<PersonalizedInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    loadDailyContent();
  }, [context]);

  const loadDailyContent = async () => {
    setIsLoading(true);
    try {
      // Record check-in and get streak
      const { streak: currentStreak } = await recordCheckIn();
      setStreak(currentStreak);

      // Generate greeting
      const greetingText = await generateMorningGreeting(userName || '', context);
      setGreeting(greetingText);

      // Generate daily tip
      const tip = await generateDailyTip(context);
      setDailyTip(tip);

      // Generate insights (limited to avoid rate limits)
      const state = await getDailyCoachState();
      const today = new Date().toDateString();
      if (state.lastInsightDate !== today) {
        const newInsights = await generatePersonalizedInsights(context, 2);
        setInsights(newInsights);
      }
    } catch (error) {
      console.error('[DailyCoachCard] Error loading content:', error);
      setGreeting("Hey there! Ready to make progress on your financial goals today?");
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 17) {
      return <Sun size={16} color={Colors.warning} />;
    }
    return <Moon size={16} color={Colors.lavender} />;
  };

  const getInsightIcon = (type: PersonalizedInsight['type']) => {
    switch (type) {
      case 'celebration':
        return <PartyPopper size={16} color={Colors.success} />;
      case 'tip':
        return <Sparkles size={16} color={Colors.accent} />;
      case 'warning':
        return <AlertCircle size={16} color={Colors.warning} />;
      case 'motivation':
        return <Heart size={16} color={Colors.coral} />;
      case 'education':
        return <BookOpen size={16} color={Colors.lavender} />;
      default:
        return <Sparkles size={16} color={Colors.accent} />;
    }
  };

  const getInsightColor = (type: PersonalizedInsight['type']) => {
    switch (type) {
      case 'celebration':
        return Colors.successMuted;
      case 'tip':
        return Colors.accentMuted;
      case 'warning':
        return Colors.warningMuted;
      case 'motivation':
        return Colors.coralMuted;
      case 'education':
        return Colors.lavenderMuted;
      default:
        return Colors.accentMuted;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.mascotSmall} />
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Greeting Card */}
      <Pressable
        style={styles.greetingCard}
        onPress={() => router.push('/(tabs)/profile' as any)}
      >
        <View style={styles.greetingHeader}>
          <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.mascot} />
          <View style={styles.greetingContent}>
            <View style={styles.greetingMeta}>
              {getTimeIcon()}
              {streak > 1 && (
                <View style={styles.streakBadge}>
                  <Flame size={12} color={Colors.coral} />
                  <Text style={styles.streakText}>{streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={styles.greetingText}>{greeting}</Text>
          </View>
        </View>
      </Pressable>

      {/* Daily Tip */}
      {dailyTip && (
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Sparkles size={14} color={Colors.accent} />
            <Text style={styles.tipLabel}>Today's Tip</Text>
          </View>
          <Text style={styles.tipText}>{dailyTip}</Text>
        </View>
      )}

      {/* Insights Toggle */}
      {insights.length > 0 && (
        <Pressable
          style={styles.insightsToggle}
          onPress={() => setShowInsights(!showInsights)}
        >
          <View style={styles.insightsToggleLeft}>
            <TrendingUp size={16} color={Colors.accent} />
            <Text style={styles.insightsToggleText}>
              {insights.length} personalized insight{insights.length > 1 ? 's' : ''}
            </Text>
          </View>
          <ChevronRight
            size={18}
            color={Colors.textMuted}
            style={{ transform: [{ rotate: showInsights ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      )}

      {/* Insights List */}
      {showInsights && insights.map((insight) => (
        <Pressable
          key={insight.id}
          style={[styles.insightCard, { backgroundColor: getInsightColor(insight.type) }]}
          onPress={() => onInsightPress?.(insight)}
        >
          <View style={styles.insightIcon}>
            {getInsightIcon(insight.type)}
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightMessage} numberOfLines={2}>
              {insight.message}
            </Text>
          </View>
          {insight.actionLabel && (
            <ChevronRight size={16} color={Colors.textMuted} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  mascotSmall: {
    width: 40,
    height: 40,
  },

  greetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mascot: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  greetingContent: {
    flex: 1,
  },
  greetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coralMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.coral,
  },
  greetingText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  tipCard: {
    backgroundColor: Colors.accentMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  insightsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  insightsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
