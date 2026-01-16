import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, TrendingUp, GitBranch, RefreshCw } from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { InsightCard } from '@/components/InsightCard';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';
import { AgentType } from '@/types';

const AGENT_INFO = [
  {
    type: 'financial-reality' as AgentType,
    name: 'Financial Reality',
    description: 'Maintains your financial context and generates plain-language snapshots.',
    icon: Bot,
    color: Colors.agents.financialReality,
  },
  {
    type: 'market-context' as AgentType,
    name: 'Market Context',
    description: 'Explains current economic conditions in neutral, educational terms.',
    icon: TrendingUp,
    color: Colors.agents.marketContext,
  },
  {
    type: 'scenario-learning' as AgentType,
    name: 'Scenario & Learning',
    description: 'Runs what-if simulations and explains trade-offs.',
    icon: GitBranch,
    color: Colors.agents.scenarioLearning,
  },
  {
    type: 'adaptation' as AgentType,
    name: 'Adaptation',
    description: 'Monitors your progress and adjusts weekly plans automatically.',
    icon: RefreshCw,
    color: Colors.agents.adaptation,
  },
];

export default function InsightsScreen() {
  const { agentInsights, marketContext, agentsProcessing } = useApp();
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);

  const filteredInsights = selectedAgent 
    ? agentInsights.filter(i => i.agentType === selectedAgent)
    : agentInsights;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
      >
        <Text style={styles.title}>AI Agents</Text>
        <Text style={styles.subtitle}>
          Four autonomous agents work together to provide personalized financial clarity
        </Text>
        
        {agentsProcessing && (
          <View style={styles.processingBanner}>
            <RefreshCw size={16} color={Colors.warning} />
            <Text style={styles.processingText}>Agents are processing...</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.agentsGrid}>
        {AGENT_INFO.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.type;
          
          return (
            <Pressable
              key={agent.type}
              style={[
                styles.agentCard,
                isSelected && { borderColor: agent.color, borderWidth: 2 },
              ]}
              onPress={() => setSelectedAgent(isSelected ? null : agent.type)}
            >
              <View style={[styles.agentIcon, { backgroundColor: agent.color + '20' }]}>
                <Icon size={20} color={agent.color} />
              </View>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentDescription} numberOfLines={2}>
                {agent.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.marketCard} variant="elevated">
        <Text style={styles.sectionTitle}>Market Context Summary</Text>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>Stocks</Text>
          <Text style={styles.marketValue}>{marketContext.stocksDescription}</Text>
        </View>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>Bonds</Text>
          <Text style={styles.marketValue}>{marketContext.bondsDescription}</Text>
        </View>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>Inflation</Text>
          <Text style={styles.marketValue}>{marketContext.inflationDescription}</Text>
        </View>
        <View style={[styles.marketItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.marketLabel}>Gold</Text>
          <Text style={styles.marketValue}>{marketContext.goldDescription}</Text>
        </View>
      </Card>

      <View style={styles.insightsSection}>
        <View style={styles.insightsHeader}>
          <Text style={styles.sectionTitle}>Recent Agent Activity</Text>
          {selectedAgent && (
            <Pressable onPress={() => setSelectedAgent(null)}>
              <Text style={styles.clearFilter}>Clear filter</Text>
            </Pressable>
          )}
        </View>
        
        {filteredInsights.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No insights from this agent yet</Text>
          </Card>
        ) : (
          filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </View>

      <Card style={styles.transparencyCard}>
        <Text style={styles.transparencyTitle}>Agent Transparency</Text>
        <Text style={styles.transparencyText}>
          Every decision made by our AI agents includes reasoning you can inspect. 
          Tap &quot;Show reasoning&quot; on any insight to understand why an agent took action.
          Our agents are designed to be helpful collaborators, not black boxes.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    opacity: 0.8,
    lineHeight: 22,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  processingText: {
    fontSize: 13,
    color: Colors.warning,
    marginLeft: 8,
  },
  agentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: -12,
  },
  agentCard: {
    width: '50%',
    padding: 4,
  },
  agentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  marketCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  marketItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  marketLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 4,
  },
  marketValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  insightsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearFilter: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  transparencyCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: Colors.accent + '10',
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  transparencyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 8,
  },
  transparencyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
