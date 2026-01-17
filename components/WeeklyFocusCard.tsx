import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ChevronDown, ChevronUp, Target, BookOpen, Wallet, PiggyBank, CheckCircle } from 'lucide-react-native';
import { Card } from './Card';
import { WhatWouldChange } from './WhatWouldChange';
import { WeeklyFocus } from '@/types';
import Colors from '@/constants/colors';

interface WeeklyFocusCardProps {
  focus: WeeklyFocus;
  onProgressUpdate?: (progress: number) => void;
}

const CATEGORY_ICONS = {
  save: PiggyBank,
  reduce: Wallet,
  learn: BookOpen,
  buffer: Target,
};

const PRIORITY_COLORS = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.secondary,
};

export function WeeklyFocusCard({ focus, onProgressUpdate }: WeeklyFocusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[focus.category];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isCompleted = focus.progress === 100;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getWhatWouldChangeItems = (): string[] => {
    switch (focus.category) {
      case 'save':
        return [
          'Setting up automatic transfers',
          'Finding one expense to cut this week',
          'Using cash instead of cards for discretionary spending',
        ];
      case 'reduce':
        return [
          'Comparing prices before purchasing',
          'Waiting 24 hours before non-essential buys',
          'Canceling unused subscriptions',
        ];
      case 'learn':
        return [
          'Spending 10 minutes daily on financial content',
          'Asking questions when confused',
          'Applying one new concept each week',
        ];
      case 'buffer':
        return [
          'Increasing emergency fund contributions',
          'Building a 1-month expense buffer first',
          'Automating savings before spending',
        ];
      default:
        return [];
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Card variant="elevated" style={[styles.card, isCompleted && styles.cardCompleted]}>
        <Pressable 
          onPress={() => setExpanded(!expanded)} 
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.header}
        >
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isCompleted ? Colors.successMuted : `${PRIORITY_COLORS[focus.priority]}15` }
          ]}>
            {isCompleted ? (
              <CheckCircle size={20} color={Colors.success} />
            ) : (
              <Icon size={20} color={PRIORITY_COLORS[focus.priority]} />
            )}
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isCompleted && styles.titleCompleted]}>{focus.title}</Text>
              {!isCompleted && (
                <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[focus.priority] }]} />
              )}
            </View>
            <Text style={[styles.description, isCompleted && styles.descriptionCompleted]} numberOfLines={expanded ? undefined : 2}>
              {focus.description}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={20} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={Colors.textMuted} />
          )}
        </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningLabel}>Why this matters:</Text>
            <Text style={styles.reasoning}>{focus.agentReasoning}</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercent}>{focus.progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { width: `${focus.progress}%` },
                isCompleted && styles.progressFillComplete
              ]} />
            </View>
            <View style={styles.progressButtons}>
              {[0, 25, 50, 75, 100].map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.progressButton,
                    focus.progress === value && styles.progressButtonActive,
                    value === 100 && focus.progress === 100 && styles.progressButtonComplete,
                  ]}
                  onPress={() => onProgressUpdate?.(value)}
                >
                  <Text style={[
                    styles.progressButtonText,
                    focus.progress === value && styles.progressButtonTextActive,
                  ]}>
                    {value === 100 ? 'Done!' : `${value}%`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <WhatWouldChange items={getWhatWouldChangeItems()} compact />
        </View>
      )}
    </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningContainer: {
    backgroundColor: Colors.primary + '08',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasoning: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  cardCompleted: {
    borderColor: Colors.success + '40',
  },
  titleCompleted: {
    color: Colors.success,
  },
  descriptionCompleted: {
    color: Colors.textMuted,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  progressFillComplete: {
    backgroundColor: Colors.success,
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  progressButtonActive: {
    backgroundColor: Colors.accent,
  },
  progressButtonComplete: {
    backgroundColor: Colors.success,
  },
  progressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressButtonTextActive: {
    color: '#fff',
  },
});
