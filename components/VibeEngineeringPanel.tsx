import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Sliders,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from './Card';
import {
  runAutonomousTestingLoop,
  runWhatIfAnalysis,
  generateScenarios,
  type SimulationContext,
  type FinancialScenario,
  type ScenarioResult,
} from '@/lib/vibeEngineering';

interface VibeEngineeringPanelProps {
  context: SimulationContext;
  onRecommendationApply?: (recommendation: string) => void;
}

export function VibeEngineeringPanel({
  context,
  onRecommendationApply,
}: VibeEngineeringPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [scenarios, setScenarios] = useState<FinancialScenario[]>([]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  // What-If Analysis State
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfChanges, setWhatIfChanges] = useState({
    incomeChange: '',
    expenseChange: '',
    extraSavings: '',
    extraDebtPayment: '',
  });
  const [whatIfResult, setWhatIfResult] = useState<Awaited<ReturnType<typeof runWhatIfAnalysis>> | null>(null);
  const [isRunningWhatIf, setIsRunningWhatIf] = useState(false);

  const runFullAnalysis = async () => {
    setIsRunning(true);
    try {
      const result = await runAutonomousTestingLoop(context, 3);
      setScenarios(result.scenarios);
      setResults(result.results);
      setRecommendations(result.finalRecommendations);
      setConfidenceScore(result.confidenceScore);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runWhatIf = async () => {
    setIsRunningWhatIf(true);
    try {
      const changes = {
        incomeChange: parseFloat(whatIfChanges.incomeChange) || 0,
        expenseChange: parseFloat(whatIfChanges.expenseChange) || 0,
        extraSavings: parseFloat(whatIfChanges.extraSavings) || 0,
        extraDebtPayment: parseFloat(whatIfChanges.extraDebtPayment) || 0,
      };

      const result = await runWhatIfAnalysis(context, changes, 12);
      setWhatIfResult(result);
    } catch (error) {
      console.error('Error running what-if:', error);
    } finally {
      setIsRunningWhatIf(false);
    }
  };

  const getScenarioIcon = (type: FinancialScenario['type']) => {
    const icons = {
      income_change: TrendingUp,
      expense_reduction: TrendingDown,
      debt_payoff: Target,
      investment_growth: BarChart3,
      emergency_event: AlertTriangle,
      goal_achievement: CheckCircle2,
      inflation_impact: TrendingUp,
      job_loss: AlertTriangle,
    };
    return icons[type] || FlaskConical;
  };

  const getScenarioColor = (impact: FinancialScenario['impact']) => {
    return impact === 'positive' ? Colors.success
      : impact === 'negative' ? Colors.coral
      : Colors.warning;
  };

  return (
    <View style={styles.wrapper}>
      {/* Actions Card */}
      <Card style={styles.headerCard} variant="elevated">
        {confidenceScore !== null && (
          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceLabel}>Analysis Confidence</Text>
            <View style={styles.confidenceTrack}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${confidenceScore * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>{(confidenceScore * 100).toFixed(0)}%</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={runFullAnalysis}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <Play size={18} color={Colors.textLight} />
            )}
            <Text style={styles.primaryButtonText}>
              {isRunning ? 'Analyzing...' : 'Run Full Analysis'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setWhatIfMode(!whatIfMode)}
          >
            <Sliders size={18} color={Colors.coral} />
            <Text style={styles.secondaryButtonText}>What-If</Text>
          </Pressable>
        </View>
      </Card>

      {/* What-If Analysis */}
      {whatIfMode && (
        <Card style={styles.whatIfCard}>
          <Text style={styles.whatIfTitle}>What-If Scenario Builder</Text>
          <Text style={styles.whatIfDesc}>
            Adjust values to see how changes would impact your finances over 12 months.
          </Text>

          <View style={styles.whatIfInputs}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Income Change</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={whatIfChanges.incomeChange}
                  onChangeText={(v) => setWhatIfChanges({ ...whatIfChanges, incomeChange: v })}
                />
                <Text style={styles.inputSuffix}>/mo</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Expense Change</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={whatIfChanges.expenseChange}
                  onChangeText={(v) => setWhatIfChanges({ ...whatIfChanges, expenseChange: v })}
                />
                <Text style={styles.inputSuffix}>/mo</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Extra Savings</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={whatIfChanges.extraSavings}
                  onChangeText={(v) => setWhatIfChanges({ ...whatIfChanges, extraSavings: v })}
                />
                <Text style={styles.inputSuffix}>/mo</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Extra Debt Payment</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={whatIfChanges.extraDebtPayment}
                  onChangeText={(v) => setWhatIfChanges({ ...whatIfChanges, extraDebtPayment: v })}
                />
                <Text style={styles.inputSuffix}>/mo</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.runWhatIfButton}
            onPress={runWhatIf}
            disabled={isRunningWhatIf}
          >
            {isRunningWhatIf ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <Zap size={18} color={Colors.textLight} />
            )}
            <Text style={styles.runWhatIfText}>
              {isRunningWhatIf ? 'Calculating...' : 'Calculate Impact'}
            </Text>
          </Pressable>

          {whatIfResult && (
            <View style={styles.whatIfResults}>
              <Text style={styles.resultsTitle}>12-Month Projection</Text>

              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Current Path</Text>
                  <Text style={styles.comparisonValue}>
                    ${whatIfResult.baseline.projectedOutcome.netWorth.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.comparisonArrow}>
                  <TrendingUp size={24} color={Colors.success} />
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>With Changes</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.success }]}>
                    ${whatIfResult.withChanges.projectedOutcome.netWorth.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.improvementCard}>
                <Text style={styles.improvementTitle}>Improvements</Text>
                <View style={styles.improvementRow}>
                  <Text style={styles.improvementLabel}>Extra Savings</Text>
                  <Text style={styles.improvementValue}>
                    +${whatIfResult.improvement.savingsDifference.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.improvementRow}>
                  <Text style={styles.improvementLabel}>Debt Reduction</Text>
                  <Text style={styles.improvementValue}>
                    -${whatIfResult.improvement.debtDifference.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.improvementRow}>
                  <Text style={styles.improvementLabel}>Net Worth Gain</Text>
                  <Text style={[styles.improvementValue, { color: Colors.success }]}>
                    +${whatIfResult.improvement.netWorthDifference.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.improvementRow}>
                  <Text style={styles.improvementLabel}>Extra Runway</Text>
                  <Text style={styles.improvementValue}>
                    +{whatIfResult.improvement.runwayDifference.toFixed(1)} months
                  </Text>
                </View>
              </View>

              <View style={styles.analysisBox}>
                <Text style={styles.analysisText}>{whatIfResult.analysis}</Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Scenarios List */}
      {scenarios.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Tested Scenarios</Text>
          {scenarios.map((scenario, index) => {
            const result = results[index];
            const ScenarioIcon = getScenarioIcon(scenario.type);
            const color = getScenarioColor(scenario.impact);
            const isExpanded = expandedScenario === scenario.id;

            return (
              <Pressable
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => setExpandedScenario(isExpanded ? null : scenario.id)}
              >
                <View style={styles.scenarioHeader}>
                  <View style={[styles.scenarioIcon, { backgroundColor: color + '20' }]}>
                    <ScenarioIcon size={20} color={color} />
                  </View>
                  <View style={styles.scenarioInfo}>
                    <Text style={styles.scenarioName}>{scenario.name}</Text>
                    <View style={styles.scenarioMeta}>
                      <View style={[styles.impactBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.impactText, { color }]}>{scenario.impact}</Text>
                      </View>
                      <Text style={styles.probabilityText}>
                        {(scenario.probability * 100).toFixed(0)}% likely
                      </Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={Colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={Colors.textMuted} />
                  )}
                </View>

                {isExpanded && result && (
                  <View style={styles.scenarioDetails}>
                    <Text style={styles.scenarioDesc}>{scenario.description}</Text>

                    <View style={styles.outcomeGrid}>
                      <View style={styles.outcomeItem}>
                        <Text style={styles.outcomeLabel}>Projected Net Worth</Text>
                        <Text style={styles.outcomeValue}>
                          ${result.projectedOutcome.netWorth.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.outcomeItem}>
                        <Text style={styles.outcomeLabel}>Emergency Runway</Text>
                        <Text style={styles.outcomeValue}>
                          {result.projectedOutcome.emergencyRunway.toFixed(1)} mo
                        </Text>
                      </View>
                      <View style={styles.outcomeItem}>
                        <Text style={styles.outcomeLabel}>Risk Score</Text>
                        <Text style={[
                          styles.outcomeValue,
                          { color: result.riskScore > 50 ? Colors.coral : Colors.success }
                        ]}>
                          {result.riskScore}/100
                        </Text>
                      </View>
                      <View style={styles.outcomeItem}>
                        <Text style={styles.outcomeLabel}>Confidence</Text>
                        <Text style={styles.outcomeValue}>
                          {(result.confidenceLevel * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    {result.milestones.length > 0 && (
                      <View style={styles.milestonesSection}>
                        <Text style={styles.milestonesTitle}>Key Milestones</Text>
                        {result.milestones.slice(0, 3).map((milestone, mIndex) => (
                          <View key={mIndex} style={styles.milestoneItem}>
                            <View style={styles.milestoneDot} />
                            <Text style={styles.milestoneText}>
                              Month {milestone.month}: {milestone.event} (${milestone.savings.toLocaleString()})
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>AI Recommendations</Text>
          <Card style={styles.recommendationsCard}>
            {recommendations.map((rec, index) => {
              const priority = rec.match(/\[(.*?)\]/)?.[1] || 'MEDIUM';
              const content = rec.replace(/\[.*?\]\s*/, '');
              const priorityColor = priority === 'CRITICAL' ? Colors.coral
                : priority === 'HIGH' ? Colors.warning
                : Colors.accent;

              return (
                <Pressable
                  key={index}
                  style={styles.recommendationItem}
                  onPress={() => onRecommendationApply?.(content)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                  <View style={styles.recommendationContent}>
                    <View style={[styles.priorityTag, { backgroundColor: priorityColor + '20' }]}>
                      <Text style={[styles.priorityText, { color: priorityColor }]}>
                        {priority}
                      </Text>
                    </View>
                    <Text style={styles.recommendationText}>{content}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </View>
      )}

      {/* Empty State */}
      {scenarios.length === 0 && !isRunning && (
        <Card style={styles.emptyCard}>
          <FlaskConical size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Analysis Yet</Text>
          <Text style={styles.emptyText}>
            Run a full analysis to test multiple financial scenarios using Monte Carlo simulations.
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },

  headerCard: {
    padding: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  labIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.coralMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  labTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  labSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  geminiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  geminiText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  confidenceBar: {
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  confidenceTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
    textAlign: 'right',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.coral,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  secondaryButton: {
    backgroundColor: Colors.coralMuted,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.coral,
  },

  whatIfCard: {
    padding: 20,
    marginBottom: 20,
  },
  whatIfTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  whatIfDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  whatIfInputs: {
    gap: 12,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    width: 140,
  },
  inputPrefix: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  inputSuffix: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  runWhatIfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  runWhatIfText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },

  whatIfResults: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  comparisonArrow: {
    paddingHorizontal: 12,
  },
  improvementCard: {
    backgroundColor: Colors.mintMuted,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  improvementTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 12,
  },
  improvementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  improvementLabel: {
    fontSize: 13,
    color: Colors.text,
  },
  improvementValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  analysisBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
  },
  analysisText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },

  scenarioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  scenarioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  probabilityText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  scenarioDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scenarioDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  outcomeItem: {
    width: '47%',
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
  },
  outcomeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  outcomeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  milestonesSection: {
    backgroundColor: Colors.accentMuted,
    padding: 14,
    borderRadius: 12,
  },
  milestonesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 6,
    marginRight: 8,
  },
  milestoneText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  recommendationsCard: {
    padding: 16,
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  priorityTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recommendationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
