import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Bot, TrendingUp, GitBranch, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/components/Card';

const AGENT_DETAILS = [
  {
    name: 'Financial Reality Agent',
    icon: Bot,
    color: Colors.agents.financialReality,
    responsibility: 'Maintains your financial context and generates plain-language snapshots.',
    howItWorks: [
      'Calculates your disposable income from your inputs',
      'Computes savings rate and debt-to-income ratio',
      'Determines emergency fund progress',
      'Generates a health score weighted across multiple factors',
      'Updates automatically when any financial input changes',
    ],
    reasoning: 'This agent believes financial clarity starts with an accurate picture of where you stand. Numbers without context are meaningless, so it translates everything into plain language.',
  },
  {
    name: 'Market Context Agent',
    icon: TrendingUp,
    color: Colors.agents.marketContext,
    responsibility: 'Explains current economic conditions in neutral, educational terms.',
    howItWorks: [
      'Monitors high-level market indicators',
      'Assesses overall volatility levels',
      'Generates educational descriptions of each asset class',
      'Provides context without recommendations',
      'Emphasizes that personal readiness matters more than timing',
    ],
    reasoning: 'Markets affect everyone, but understanding them shouldn\'t require a finance degree. This agent provides context, not predictions or advice.',
  },
  {
    name: 'Scenario & Learning Agent',
    icon: GitBranch,
    color: Colors.agents.scenarioLearning,
    responsibility: 'Runs what-if simulations and explains trade-offs.',
    howItWorks: [
      'Calculates multiple savings paths based on your capacity',
      'Projects outcomes over different time horizons',
      'Explains the trade-offs of each approach',
      'Compares conservative, balanced, and aggressive options',
      'Updates projections when your financials change',
    ],
    reasoning: 'Every financial decision involves trade-offs. This agent helps you understand them without telling you what to choose.',
  },
  {
    name: 'Adaptation Agent',
    icon: RefreshCw,
    color: Colors.agents.adaptation,
    responsibility: 'Monitors your progress and adjusts weekly plans automatically.',
    howItWorks: [
      'Generates personalized weekly focus items',
      'Prioritizes based on your current situation',
      'Monitors for significant changes in your inputs',
      'Adjusts recommendations when circumstances change',
      'Provides gentle check-ins if engagement drops',
    ],
    reasoning: 'Financial progress is a marathon, not a sprint. This agent helps you stay on track with small, achievable steps that adapt as you go.',
  },
];

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How Agents Work</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {AGENT_DETAILS.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card key={agent.name} style={styles.agentCard} variant="elevated">
              <View style={styles.agentHeader}>
                <View style={[styles.agentIcon, { backgroundColor: agent.color + '20' }]}>
                  <Icon size={24} color={agent.color} />
                </View>
                <Text style={styles.agentName}>{agent.name}</Text>
              </View>

              <Text style={styles.responsibility}>{agent.responsibility}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                {agent.howItWorks.map((item, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <View style={[styles.bullet, { backgroundColor: agent.color }]} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.reasoningBox, { backgroundColor: agent.color + '10' }]}>
                <Text style={[styles.reasoningLabel, { color: agent.color }]}>Agent Philosophy</Text>
                <Text style={styles.reasoningText}>{agent.reasoning}</Text>
              </View>
            </Card>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All agents are designed to be transparent about their reasoning. 
            Tap the Show reasoning button on any insight to understand why an agent made a decision.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  agentCard: {
    marginBottom: 16,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  responsibility: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  reasoningBox: {
    borderRadius: 12,
    padding: 12,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  reasoningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
