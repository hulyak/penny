import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Shield, TrendingUp, Zap } from 'lucide-react-native';
import { Card } from './Card';
import { Scenario } from '@/types';
import Colors from '@/constants/colors';

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected?: boolean;
  onSelect?: () => void;
}

const RISK_CONFIG = {
  low: { color: Colors.accent, icon: Shield, label: 'Low Risk' },
  medium: { color: Colors.warning, icon: TrendingUp, label: 'Medium Risk' },
  high: { color: Colors.danger, icon: Zap, label: 'Higher Effort' },
};

export function ScenarioCard({ scenario, isSelected, onSelect }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const riskConfig = RISK_CONFIG[scenario.riskLevel];
  const RiskIcon = riskConfig.icon;

  return (
    <Card 
      variant={isSelected ? 'elevated' : 'outlined'} 
      style={[styles.card, isSelected && styles.selectedCard]}
    >
      <Pressable onPress={onSelect} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{scenario.name}</Text>
          <View style={[styles.riskBadge, { backgroundColor: `${riskConfig.color}15` }]}>
            <RiskIcon size={12} color={riskConfig.color} />
            <Text style={[styles.riskText, { color: riskConfig.color }]}>{riskConfig.label}</Text>
          </View>
        </View>
        {isSelected && <View style={styles.selectedIndicator} />}
      </Pressable>

      <Text style={styles.description}>{scenario.description}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>${scenario.monthlyContribution}</Text>
          <Text style={styles.statLabel}>Monthly</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>${scenario.projectedOutcome.toLocaleString()}</Text>
          <Text style={styles.statLabel}>36-Month Projection</Text>
        </View>
      </View>

      <Pressable 
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandText}>
          {expanded ? 'Hide reasoning' : 'Show reasoning'}
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={Colors.secondary} />
        ) : (
          <ChevronDown size={16} color={Colors.secondary} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoning}>{scenario.reasoning}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginRight: 4,
  },
  reasoningContainer: {
    backgroundColor: Colors.secondary + '10',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  reasoning: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
