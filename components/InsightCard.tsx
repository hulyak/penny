import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { Card } from './Card';
import { AgentBadge } from './AgentBadge';
import { AgentInsight } from '@/types';
import Colors from '@/constants/colors';

interface InsightCardProps {
  insight: AgentInsight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <AgentBadge type={insight.agentType} size="small" />
        <View style={styles.timeContainer}>
          <Clock size={12} color={Colors.textMuted} />
          <Text style={styles.time}>{formatTime(insight.timestamp)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.message}>{insight.message}</Text>

      <Pressable 
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandText}>
          {expanded ? 'Hide details' : 'Show reasoning'}
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={Colors.secondary} />
        ) : (
          <ChevronDown size={16} color={Colors.secondary} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.reasoningSection}>
            <Text style={styles.sectionLabel}>Agent Reasoning</Text>
            <Text style={styles.reasoning}>{insight.reasoning}</Text>
          </View>

          {insight.actionTaken && (
            <View style={styles.actionSection}>
              <Text style={styles.sectionLabel}>Action Taken</Text>
              <Text style={styles.action}>{insight.actionTaken}</Text>
            </View>
          )}

          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${insight.confidence * 100}%` }]} />
            </View>
            <Text style={styles.confidenceValue}>{Math.round(insight.confidence * 100)}%</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginRight: 4,
  },
  expandedContent: {
    marginTop: 16,
  },
  reasoningSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  actionSection: {
    backgroundColor: Colors.accent + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reasoning: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  action: {
    fontSize: 14,
    color: Colors.accent,
    lineHeight: 20,
    fontWeight: '500',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginRight: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
});
