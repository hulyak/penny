import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Lightbulb,
  PieChart,
  AlertTriangle,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { z } from 'zod';
import Colors from '@/constants/colors';
import { Spacing, FontSize, BorderRadius, ComponentHeight, Layout } from '@/constants/design';
import { Holding } from '@/types';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from '@/lib/gemini';
import { calculateMetrics, PortfolioMetrics } from '@/lib/portfolioAnalysis';
import { usePurchases } from '@/context/PurchasesContext';
import { PremiumCard } from '@/components/PremiumBadge';
import portfolioService from '@/lib/portfolioService';

// Schema for AI response
const PurchaseAnalysisSchema = z.object({
  verdict: z.enum(['go_ahead', 'think_twice', 'skip_it']),
  verdictEmoji: z.string(),
  verdictTitle: z.string(),
  portfolioImpact: z.object({
    percentOfPortfolio: z.number(),
    impactDescription: z.string(),
    cashFlowNote: z.string(),
  }),
  opportunityCost: z.object({
    alternativeInvestment: z.string(),
    potentialGrowth: z.string(),
    comparisonNote: z.string(),
  }),
  considerations: z.array(z.object({
    type: z.enum(['pro', 'con', 'neutral']),
    text: z.string(),
  })),
  bottomLine: z.string(),
});

type PurchaseAnalysis = z.infer<typeof PurchaseAnalysisSchema>;

export default function AskBeforeBuyScreen() {
  const router = useRouter();
  const { isPremium, showPaywall } = usePurchases();
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PurchaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const loadedHoldings = await portfolioService.getHoldings();
      setHoldings(loadedHoldings);
      if (loadedHoldings.length > 0) {
        const calculatedMetrics = calculateMetrics(loadedHoldings);
        setMetrics(calculatedMetrics);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzePurchase = async () => {
    if (!itemName.trim() || !itemCost.trim()) {
      setError('Please enter both item name and cost');
      return;
    }

    const cost = parseFloat(itemCost.replace(/[^0-9.]/g, ''));
    if (isNaN(cost) || cost <= 0) {
      setError('Please enter a valid cost');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const totalPortfolioValue = metrics?.totalValue || 0;
      const percentOfPortfolio = totalPortfolioValue > 0
        ? ((cost / totalPortfolioValue) * 100).toFixed(2)
        : 'N/A';

      // Build portfolio context for AI
      const portfolioContext = metrics ? `
Portfolio Overview:
- Total Value: $${metrics.totalValue.toLocaleString()}
- Number of Holdings: ${metrics.holdingsCount}
- Asset Classes: ${Object.keys(metrics.assetClassDistribution).join(', ')}

Asset Allocation:
${Object.entries(metrics.assetClassDistribution)
  .map(([cls, data]) => `- ${cls}: ${data.percent.toFixed(1)}% ($${data.value.toLocaleString()})`)
  .join('\n')}

Top Holdings:
${metrics.topHoldings.slice(0, 5).map(h => `- ${h.name}: ${h.percent.toFixed(1)}%`).join('\n')}
` : 'User has no investments yet.';

      const prompt = `A user is considering a purchase and wants your advice on whether to buy it or invest the money instead.

PURCHASE DETAILS:
- Item: ${itemName}
- Cost: $${cost.toLocaleString()}
- This represents ${percentOfPortfolio}% of their current portfolio value

${portfolioContext}

Analyze this potential purchase and provide guidance. Consider:
1. Is this a need or a want?
2. What's the opportunity cost of this purchase vs investing?
3. How does this fit with their current financial situation?
4. What could $${cost.toLocaleString()} grow to if invested instead?

Be practical and balanced - not everything needs to be invested. But help them make an informed decision.

Provide your analysis as a JSON object with:
- verdict: "go_ahead" (reasonable purchase), "think_twice" (consider alternatives), or "skip_it" (probably not worth it)
- verdictEmoji: An appropriate emoji for the verdict
- verdictTitle: A short, catchy title for your verdict (5-8 words)
- portfolioImpact: { percentOfPortfolio, impactDescription, cashFlowNote }
- opportunityCost: { alternativeInvestment (suggest a specific investment like VOO, bonds, etc), potentialGrowth (what it could be worth in 5 years), comparisonNote }
- considerations: Array of { type: "pro" | "con" | "neutral", text } - 3-4 key points
- bottomLine: A single sentence summary of your recommendation`;

      const result = await generateStructuredWithGemini({
        prompt,
        systemInstruction: `${GEMINI_SYSTEM_PROMPT}

You are helping users make smarter spending decisions by showing them the true cost of purchases relative to their investment portfolio. Be honest but not preachy - sometimes a purchase is worth it! Focus on education and awareness, not guilt.`,
        schema: PurchaseAnalysisSchema,
        temperature: 0.7,
        thinkingLevel: 'medium',
      });

      setAnalysis(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze purchase. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'go_ahead': return Colors.success;
      case 'think_twice': return Colors.warning;
      case 'skip_it': return Colors.danger;
      default: return Colors.textMuted;
    }
  };

  const getVerdictBackground = (verdict: string) => {
    switch (verdict) {
      case 'go_ahead': return Colors.successMuted;
      case 'think_twice': return Colors.warningMuted;
      case 'skip_it': return Colors.dangerMuted;
      default: return Colors.surface;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  // Premium gate
  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Ask Before I Buy</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.premiumGateContainer}>
          <View style={styles.premiumGateIcon}>
            <ShoppingCart size={48} color="#4285F4" />
          </View>
          <Text style={styles.premiumGateTitle}>Smart Spending Advisor</Text>
          <Text style={styles.premiumGateSubtitle}>
            Get AI-powered analysis on any purchase to see if you should buy it or invest the money instead
          </Text>
          <PremiumCard
            title="Unlock Ask Before I Buy"
            description="Make smarter spending decisions with Gemini-powered purchase analysis."
            onUpgrade={showPaywall}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Ask Before I Buy</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIconWrapper}>
            <ShoppingCart size={28} color="#4285F4" />
          </View>
          <Text style={styles.introTitle}>Should I buy this?</Text>
          <Text style={styles.introSubtitle}>
            Enter any purchase you're considering. Gemini will analyze its impact on your portfolio and suggest if you should buy it or invest instead.
          </Text>
          <View style={styles.geminiTag}>
            <Sparkles size={14} color="#4285F4" />
            <Text style={styles.geminiTagText}>Powered by Gemini 3</Text>
          </View>
        </View>

        {/* Portfolio Context */}
        {metrics && metrics.totalValue > 0 && (
          <View style={styles.portfolioContext}>
            <PieChart size={16} color={Colors.textSecondary} />
            <Text style={styles.portfolioContextText}>
              Your portfolio: ${metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>What do you want to buy?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., MacBook Pro, Vacation, New TV"
              placeholderTextColor={Colors.textMuted}
              value={itemName}
              onChangeText={setItemName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How much does it cost?</Text>
            <View style={styles.costInputWrapper}>
              <DollarSign size={20} color={Colors.textSecondary} style={styles.dollarIcon} />
              <TextInput
                style={styles.costInput}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={itemCost}
                onChangeText={setItemCost}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertTriangle size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
            onPress={analyzePurchase}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color={Colors.textLight} />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color={Colors.textLight} />
                <Text style={styles.analyzeButtonText}>Analyze Purchase</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Analysis Results */}
        {analysis && (
          <View style={styles.analysisSection}>
            {/* Verdict Card */}
            <View style={[styles.verdictCard, { backgroundColor: getVerdictBackground(analysis.verdict) }]}>
              <Text style={styles.verdictEmoji}>{analysis.verdictEmoji}</Text>
              <Text style={[styles.verdictTitle, { color: getVerdictColor(analysis.verdict) }]}>
                {analysis.verdictTitle}
              </Text>
              <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor(analysis.verdict) }]}>
                <Text style={styles.verdictBadgeText}>
                  {analysis.verdict.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Portfolio Impact */}
            <View style={styles.analysisCard}>
              <View style={styles.analysisCardHeader}>
                <PieChart size={20} color={Colors.primary} />
                <Text style={styles.analysisCardTitle}>Portfolio Impact</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {analysis.portfolioImpact.percentOfPortfolio.toFixed(1)}%
                </Text>
                <Text style={styles.impactStatLabel}>of your portfolio</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.portfolioImpact.impactDescription}</Text>
              <Text style={styles.analysisNote}>{analysis.portfolioImpact.cashFlowNote}</Text>
            </View>

            {/* Opportunity Cost */}
            <View style={styles.analysisCard}>
              <View style={styles.analysisCardHeader}>
                <TrendingUp size={20} color={Colors.success} />
                <Text style={styles.analysisCardTitle}>Opportunity Cost</Text>
              </View>
              <View style={styles.alternativeRow}>
                <View style={styles.alternativeBadge}>
                  <Text style={styles.alternativeBadgeText}>
                    {analysis.opportunityCost.alternativeInvestment}
                  </Text>
                </View>
                <Text style={styles.growthText}>{analysis.opportunityCost.potentialGrowth}</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.opportunityCost.comparisonNote}</Text>
            </View>

            {/* Considerations */}
            <View style={styles.analysisCard}>
              <View style={styles.analysisCardHeader}>
                <Lightbulb size={20} color={Colors.warning} />
                <Text style={styles.analysisCardTitle}>Key Considerations</Text>
              </View>
              {analysis.considerations.map((consideration, index) => (
                <View key={index} style={styles.considerationRow}>
                  <View style={[
                    styles.considerationIcon,
                    { backgroundColor: consideration.type === 'pro'
                        ? Colors.successMuted
                        : consideration.type === 'con'
                          ? Colors.dangerMuted
                          : Colors.surface }
                  ]}>
                    {consideration.type === 'pro' ? (
                      <Check size={14} color={Colors.success} />
                    ) : consideration.type === 'con' ? (
                      <AlertTriangle size={14} color={Colors.danger} />
                    ) : (
                      <Lightbulb size={14} color={Colors.textSecondary} />
                    )}
                  </View>
                  <Text style={styles.considerationText}>{consideration.text}</Text>
                </View>
              ))}
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineLabel}>THE BOTTOM LINE</Text>
              <Text style={styles.bottomLineText}>{analysis.bottomLine}</Text>
            </View>
          </View>
        )}

        {/* Suggestions for empty state */}
        {!analysis && !isAnalyzing && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Try asking about:</Text>
            <View style={styles.suggestionChips}>
              {['New iPhone $999', 'Vacation $3,000', 'Car upgrade $5,000', 'Course $500'].map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => {
                    const [name, cost] = suggestion.split(' $');
                    setItemName(name);
                    setItemCost(cost);
                  }}
                >
                  <Text style={styles.suggestionChipText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This analysis is for informational purposes only. Make financial decisions based on your complete situation.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Layout.screenPaddingTop + Spacing.xs,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: ComponentHeight.iconButton,
    height: ComponentHeight.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },

  introCard: {
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    marginHorizontal: Layout.screenPaddingHorizontal,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.2)',
    marginBottom: Spacing.lg,
  },
  introIconWrapper: {
    width: ComponentHeight.avatarLg,
    height: ComponentHeight.avatarLg,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontSize: FontSize.xxxl - 2,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  introSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  geminiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    backgroundColor: 'rgba(66, 133, 244, 0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
  },
  geminiTagText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#4285F4',
  },

  portfolioContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  portfolioContextText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  inputSection: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.xxl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.lg,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  costInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dollarIcon: {
    marginLeft: Spacing.lg,
  },
  costInput: {
    flex: 1,
    padding: Spacing.lg,
    fontSize: FontSize.xxxl,
    fontWeight: '600',
    color: Colors.text,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm + 2,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.danger,
  },

  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md - 2,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.xl - 2,
    marginTop: Spacing.sm,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    fontSize: FontSize.lg + 1,
    fontWeight: '600',
    color: Colors.textLight,
  },

  analysisSection: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    gap: Spacing.lg,
  },

  verdictCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  verdictEmoji: {
    fontSize: Spacing.massive,
    marginBottom: Spacing.md,
  },
  verdictTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  verdictBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
  },
  verdictBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  analysisCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 2,
    marginBottom: Spacing.lg,
  },
  analysisCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },

  impactStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  impactStatValue: {
    fontSize: FontSize.hero + 4,
    fontWeight: '700',
    color: Colors.primary,
  },
  impactStatLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  analysisText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  analysisNote: {
    fontSize: FontSize.sm + 1,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  alternativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  alternativeBadge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.sm,
  },
  alternativeBadgeText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.success,
  },
  growthText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },

  considerationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  considerationIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  considerationText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },

  bottomLineCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  bottomLineLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  bottomLineText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },

  suggestionsSection: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginTop: Spacing.sm,
  },
  suggestionsTitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionChipText: {
    fontSize: FontSize.sm + 1,
    color: Colors.text,
  },

  footer: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xxxl,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Premium gate styles
  premiumGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  premiumGateIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  premiumGateTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  premiumGateSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
});
