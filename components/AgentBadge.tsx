import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot, TrendingUp, GitBranch, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AgentType } from '@/types';

interface AgentBadgeProps {
  type: AgentType;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const AGENT_CONFIG = {
  'financial-reality': {
    label: 'Financial Reality',
    color: Colors.agents.financialReality,
    Icon: Bot,
  },
  'market-context': {
    label: 'Market Context',
    color: Colors.agents.marketContext,
    Icon: TrendingUp,
  },
  'scenario-learning': {
    label: 'Scenario & Learning',
    color: Colors.agents.scenarioLearning,
    Icon: GitBranch,
  },
  'adaptation': {
    label: 'Adaptation',
    color: Colors.agents.adaptation,
    Icon: RefreshCw,
  },
};

export function AgentBadge({ type, size = 'medium', showLabel = true }: AgentBadgeProps) {
  const config = AGENT_CONFIG[type];
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const padding = size === 'small' ? 4 : size === 'medium' ? 6 : 8;

  return (
    <View style={[styles.container, { backgroundColor: `${config.color}15` }]}>
      <View style={[styles.iconContainer, { backgroundColor: config.color, padding }]}>
        <config.Icon size={iconSize} color="#fff" />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingRight: 12,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    borderRadius: 12,
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
