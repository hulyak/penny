import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Lightbulb } from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { ScenarioCard } from '@/components/ScenarioCard';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

export default function ScenariosScreen() {
  const { scenarios, financials, snapshot } = useApp();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const emergencyGap = financials.emergencyFundGoal - financials.savings;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.agents.scenarioLearning + '20', Colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>What-If Explorer</Text>
          <Text style={styles.subtitle}>
            Compare different paths to reach your financial goals
          </Text>
        </View>
      </LinearGradient>

      <Card style={styles.contextCard} variant="elevated">
        <View style={styles.contextHeader}>
          <Info size={18} color={Colors.secondary} />
          <Text style={styles.contextTitle}>Your Current Situation</Text>
        </View>
        <View style={styles.contextStats}>
          <View style={styles.contextStat}>
            <Text style={styles.contextLabel}>Emergency Fund Gap</Text>
            <Text style={styles.contextValue}>${emergencyGap.toLocaleString()}</Text>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextStat}>
            <Text style={styles.contextLabel}>Available Monthly</Text>
            <Text style={styles.contextValue}>${snapshot?.disposableIncome.toFixed(0) || '0'}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.scenariosSection}>
        <Text style={styles.sectionTitle}>Explore Your Options</Text>
        <Text style={styles.sectionSubtitle}>
          Each scenario is personalized based on your financial reality
        </Text>

        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isSelected={selectedScenario === scenario.id}
            onSelect={() => setSelectedScenario(
              selectedScenario === scenario.id ? null : scenario.id
            )}
          />
        ))}
      </View>

      <Card style={styles.educationCard}>
        <View style={styles.educationHeader}>
          <Lightbulb size={20} color={Colors.warning} />
          <Text style={styles.educationTitle}>Understanding Scenarios</Text>
        </View>
        <Text style={styles.educationText}>
          These projections are educational simulations, not predictions. 
          Real outcomes depend on many factors including consistency, 
          unexpected expenses, and life changes. The goal is to help you 
          think through trade-offs, not to tell you what to do.
        </Text>
      </Card>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This is an educational tool. It does not provide financial advice, 
          investment recommendations, or predictions about market performance.
        </Text>
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
    paddingBottom: 32,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  contextCard: {
    marginHorizontal: 16,
    marginTop: -8,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  contextStats: {
    flexDirection: 'row',
  },
  contextStat: {
    flex: 1,
    alignItems: 'center',
  },
  contextDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  contextValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  scenariosSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  educationCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.warning + '10',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  educationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  educationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  educationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  disclaimer: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.border,
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
