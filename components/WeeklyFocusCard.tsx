import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Target, BookOpen, Wallet, PiggyBank } from 'lucide-react-native';
import { Card } from './Card';
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

  return (
    <Card variant="elevated" style={styles.card}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${PRIORITY_COLORS[focus.priority]}15` }]}>
          <Icon size={20} color={PRIORITY_COLORS[focus.priority]} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{focus.title}</Text>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[focus.priority] }]} />
          </View>
          <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
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
            <Text style={styles.progressLabel}>Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${focus.progress}%` }]} />
            </View>
            <View style={styles.progressButtons}>
              {[0, 25, 50, 75, 100].map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.progressButton,
                    focus.progress === value && styles.progressButtonActive,
                  ]}
                  onPress={() => onProgressUpdate?.(value)}
                >
                  <Text style={[
                    styles.progressButtonText,
                    focus.progress === value && styles.progressButtonTextActive,
                  ]}>
                    {value}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </Card>
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
    backgroundColor: Colors.backgroundDark + '08',
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
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
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
  progressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressButtonTextActive: {
    color: '#fff',
  },
});
