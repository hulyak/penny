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
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/vgkftarej1um5e3yfmz34';

export default function ScenariosScreen() {
  const { scenarios, financials } = useApp();
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const emergencyGap = financials.emergencyFundGoal - financials.savings;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenCoachCard screenName="scenarios" />

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Gap to Goal</Text>
          <Text style={styles.summaryValue}>${emergencyGap.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Current Savings</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            ${financials.savings.toLocaleString()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose Your Path</Text>
      <Text style={styles.sectionSubtitle}>Compare strategies to reach your goal</Text>

      {scenarios.map((scenario) => {
        const isExpanded = expandedScenario === scenario.id;
        const Icon = getScenarioIcon(scenario.id);
        const color = getScenarioColor(scenario.riskLevel);
        const bgColor = getScenarioBgColor(scenario.id);

        return (
          <Pressable 
            key={scenario.id}
            style={[styles.scenarioCard, isExpanded && styles.scenarioCardExpanded]}
            onPress={() => setExpandedScenario(isExpanded ? null : scenario.id)}
          >
            <View style={styles.scenarioHeader}>
              <View style={[styles.scenarioIcon, { backgroundColor: bgColor }]}>
                <Icon size={24} color={color} />
              </View>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioDesc} numberOfLines={isExpanded ? undefined : 1}>
                  {scenario.description}
                </Text>
              </View>
              <View style={styles.expandButton}>
                {isExpanded ? (
                  <ChevronUp size={20} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={Colors.textMuted} />
                )}
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>${scenario.monthlyContribution}</Text>
                <Text style={styles.metricLabel}>Monthly</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{scenario.monthsToGoal}mo</Text>
                <Text style={styles.metricLabel}>Timeline</Text>
              </View>
              <View style={styles.metricBox}>
                <View style={[styles.riskPill, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.riskText, { color }]}>
                    {scenario.riskLevel}
                  </Text>
                </View>
                <Text style={styles.metricLabel}>Effort</Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.reasoningSection}>
                  <Image source={{ uri: MASCOT_URL }} style={styles.miniMascot} />
                  <View style={styles.reasoningContent}>
                    <Text style={styles.reasoningTitle}>Why this works</Text>
                    <Text style={styles.reasoningText}>{scenario.reasoning}</Text>
                  </View>
                </View>

                {scenario.tradeoffs && scenario.tradeoffs.length > 0 && (
                  <View style={styles.tradeoffsSection}>
                    <Text style={styles.tradeoffsTitle}>Trade-offs to consider</Text>
                    {scenario.tradeoffs.map((tradeoff, index) => (
                      <View key={index} style={styles.tradeoffItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tradeoffText}>{tradeoff}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.projectionCard}>
                  <TrendingUp size={20} color={Colors.success} />
                  <View style={styles.projectionContent}>
                    <Text style={styles.projectionLabel}>3-Year Projection</Text>
                    <Text style={styles.projectionValue}>
                      ${(scenario.projectedSavings || scenario.projectedOutcome || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These are educational projections based on your inputs. Actual results will vary based on your consistency and circumstances.
        </Text>
      </View>
    </ScrollView>
  );
}

function getScenarioIcon(id: string) {
  const icons: Record<string, typeof Shield> = {
    conservative: Shield,
    balanced: Target,
    accelerated: Zap,
  };
  return icons[id] || Target;
}

function getScenarioColor(risk: string): string {
  const colors: Record<string, string> = {
    low: Colors.success,
    medium: Colors.warning,
    high: Colors.coral,
  };
  return colors[risk] || Colors.accent;
}

function getScenarioBgColor(id: string): string {
  const colors: Record<string, string> = {
    conservative: Colors.successMuted,
    balanced: Colors.warningMuted,
    accelerated: Colors.coralMuted,
  };
  return colors[id] || Colors.accentMuted;
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

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },

  scenarioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scenarioCardExpanded: {
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  scenarioDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  expandButton: {
    padding: 4,
  },

  metricsRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  riskPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  expandedContent: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.mintMuted,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  miniMascot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  reasoningContent: {
    flex: 1,
  },
  reasoningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  tradeoffsSection: {
    marginBottom: 16,
  },
  tradeoffsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  tradeoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 6,
    marginRight: 10,
  },
  tradeoffText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  projectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successMuted,
    padding: 16,
    borderRadius: 14,
  },
  projectionContent: {
    marginLeft: 12,
  },
  projectionLabel: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 2,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },

  disclaimer: {
    marginTop: 8,
    padding: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
