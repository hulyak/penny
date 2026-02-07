import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  Sparkles,
  DollarSign,
  Calendar,
  Tag,
  Brain,
  Zap,
  Check,
  RefreshCw,
  Building2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { generateStructuredWithGemini } from '@/lib/gemini';
import { usePurchases, ENTITLEMENTS, useRequireEntitlement } from '@/context/PurchasesContext';
import { PremiumCard } from '@/components/PremiumBadge';
import { z } from 'zod';
import portfolioService from '@/lib/portfolioService';

// Schema for extracted statement holdings
const StatementHoldingSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
  value: z.number(),
  assetType: z.enum(['stock', 'bond', 'mutual_fund', 'etf', 'option', 'crypto', 'other']),
  confidence: z.number().min(0).max(1), // Confidence score 0-1
});

const StatementAnalysisSchema = z.object({
  broker: z.string(),
  accountNumber: z.string().optional(),
  statementDate: z.string(),
  accountType: z.enum(['brokerage', 'ira', 'roth_ira', '401k', 'taxable', 'other']),
  holdings: z.array(StatementHoldingSchema),
  totalValue: z.number(),
  cashBalance: z.number().optional(),
  reasoning: z.string(),
  extractionQuality: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).optional(),
});

type StatementAnalysis = z.infer<typeof StatementAnalysisSchema>;
type StatementHolding = z.infer<typeof StatementHoldingSchema>;

const BROKER_COLORS: Record<string, string> = {
  fidelity: '#00A758',
  schwab: '#00A0DF',
  vanguard: '#C41E3A',
  'interactive brokers': '#CE0E2D',
  robinhood: '#00C805',
  'e*trade': '#6633CC',
  other: Colors.primary,
};

const ASSET_TYPE_ICONS: Record<string, any> = {
  stock: TrendingUp,
  bond: Building2,
  mutual_fund: Building2,
  etf: TrendingUp,
  option: Zap,
  crypto: DollarSign,
  other: Tag,
};

export default function StatementParseScreen() {
  const router = useRouter();
  const { hasEntitlement, showPaywall, subscriptionTier } = usePurchases();
  const hasPremium = subscriptionTier === 'premium';
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StatementAnalysis | null>(null);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [selectedHoldings, setSelectedHoldings] = useState<Set<number>>(new Set());
  const cameraRef = useRef<CameraView>(null);

  const addAgentStep = (step: string) => {
    setAgentSteps(prev => [...prev, step]);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.9,
        });
        if (photo?.base64) {
          setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
          analyzeStatement(`data:image/jpeg;base64,${photo.base64}`);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setCapturedImage(imageUri);
      analyzeStatement(imageUri);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        // For PDF, we'd need to convert to image first
        // For now, show a message
        Alert.alert(
          'PDF Support',
          'PDF parsing is coming soon. Please use an image of your statement for now.',
        );
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const analyzeStatement = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAgentSteps([]);
    setAnalysis(null);
    setSelectedHoldings(new Set());

    try {
      addAgentStep('Detecting statement format...');
      await new Promise(r => setTimeout(r, 500));

      addAgentStep('Identifying broker and account type...');
      await new Promise(r => setTimeout(r, 500));

      addAgentStep('Extracting holdings table...');
      await new Promise(r => setTimeout(r, 500));

      addAgentStep('Gemini 3 Vision analyzing (thinking: high)...');

      const result = await generateStructuredWithGemini({
        prompt: `Analyze this brokerage statement image and extract all portfolio holdings.

Extract:
1. Broker name (Fidelity, Schwab, Vanguard, Interactive Brokers, E*TRADE, Robinhood, etc.)
2. Account number (if visible, mask sensitive digits)
3. Statement date
4. Account type (brokerage, IRA, Roth IRA, 401k, taxable, other)
5. All holdings with:
   - Symbol/ticker
   - Full name
   - Quantity/shares
   - Current price
   - Total value
   - Asset type (stock, bond, mutual_fund, etf, option, crypto, other)
   - Confidence score (0-1) for each holding extraction
6. Total account value
7. Cash balance (if shown)

Also provide:
- Reasoning for your analysis
- Extraction quality assessment (high/medium/low)
- Any warnings about unclear or ambiguous data

Be extremely thorough and accurate with numbers. If a field is unclear, note it in warnings.
For confidence scores: 1.0 = very clear, 0.8 = clear, 0.6 = somewhat clear, 0.4 = unclear.`,
        schema: StatementAnalysisSchema,
        image: imageBase64,
        temperature: 0.1, // Very low temperature for accuracy
        thinkingLevel: 'high',
      });

      addAgentStep('Validating extracted data...');
      await new Promise(r => setTimeout(r, 400));

      addAgentStep(`Found ${result.holdings.length} holdings from ${result.broker}`);

      // Auto-select high-confidence holdings
      const highConfidenceIndices = new Set(
        result.holdings
          .map((h, i) => ({ h, i }))
          .filter(({ h }) => h.confidence >= 0.7)
          .map(({ i }) => i)
      );
      setSelectedHoldings(highConfidenceIndices);

      setAnalysis(result);
    } catch (error) {
      console.error('Statement analysis failed:', error);
      addAgentStep('Analysis failed');
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the statement. Please ensure the image is clear and shows the holdings table.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleHolding = (index: number) => {
    setSelectedHoldings(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const resetScan = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setAgentSteps([]);
    setSelectedHoldings(new Set());
  };

  const importHoldings = async () => {
    if (!analysis) return;

    const holdingsToImport = analysis.holdings.filter((_, i) => selectedHoldings.has(i));

    if (holdingsToImport.length === 0) {
      Alert.alert('No Holdings Selected', 'Please select at least one holding to import.');
      return;
    }

    try {
      // Convert to app's holding format and save
      for (const holding of holdingsToImport) {
        await portfolioService.addHolding({
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity,
          purchasePrice: holding.price,
          currentPrice: holding.price,
          assetClass: holding.assetType === 'stock' || holding.assetType === 'etf' ? 'equity' : 
                      holding.assetType === 'bond' ? 'debt' : 'alternative',
          sector: 'Unknown', // Would need additional API call to get sector
          country: 'US',
        });
      }

      Alert.alert(
        'Import Successful',
        `${holdingsToImport.length} holdings have been added to your portfolio.`,
        [{ text: 'View Portfolio', onPress: () => router.push('/portfolio') }]
      );
    } catch (error) {
      console.error('Failed to import holdings:', error);
      Alert.alert('Import Failed', 'Could not save holdings to your portfolio.');
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Premium gate
  if (!hasPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Parse Statement</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.premiumGateContainer}>
          <View style={styles.premiumGateIcon}>
            <FileText size={48} color={Colors.accent} />
          </View>
          <Text style={styles.premiumGateTitle}>AI Statement Parser</Text>
          <Text style={styles.premiumGateSubtitle}>
            Automatically extract holdings from brokerage statements using Gemini Vision
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureItemText}>Supports all major brokers</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureItemText}>Extracts symbols, quantities, and values</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureItemText}>Confidence scoring for accuracy</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureItemText}>Review before importing</Text>
            </View>
          </View>
          <PremiumCard
            title="Unlock Statement Parsing"
            description="Upgrade to Premium to automatically import your portfolio from brokerage statements."
            onUpgrade={showPaywall}
          />
        </View>
      </View>
    );
  }

  const brokerColor = analysis ? BROKER_COLORS[analysis.broker.toLowerCase()] || BROKER_COLORS.other : Colors.primary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Parse Statement</Text>
        <View style={styles.gemini3Badge}>
          <Sparkles size={14} color="#4285F4" />
          <Text style={styles.gemini3Text}>Gemini 3</Text>
        </View>
      </View>

      {!capturedImage ? (
        // Camera/Upload View
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Upload Statement</Text>
            <Text style={styles.sectionSubtitle}>
              Take a photo or upload an image of your brokerage statement
            </Text>

            <View style={styles.uploadOptions}>
              <Pressable style={styles.uploadButton} onPress={pickImage}>
                <ImageIcon size={32} color={Colors.primary} />
                <Text style={styles.uploadButtonText}>Choose Image</Text>
              </Pressable>

              {permission.granted && (
                <Pressable style={styles.uploadButton} onPress={takePicture}>
                  <Camera size={32} color={Colors.primary} />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </Pressable>
              )}

              <Pressable style={styles.uploadButton} onPress={pickDocument}>
                <FileText size={32} color={Colors.primary} />
                <Text style={styles.uploadButtonText}>Choose PDF</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Supported Brokers</Text>
            <View style={styles.brokerList}>
              {['Fidelity', 'Schwab', 'Vanguard', 'Interactive Brokers', 'E*TRADE', 'Robinhood', 'Others'].map(broker => (
                <View key={broker} style={styles.brokerChip}>
                  <Text style={styles.brokerChipText}>{broker}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Tips for Best Results</Text>
            <View style={styles.tipItem}>
              <Check size={16} color={Colors.success} />
              <Text style={styles.tipText}>Ensure the holdings table is clearly visible</Text>
            </View>
            <View style={styles.tipItem}>
              <Check size={16} color={Colors.success} />
              <Text style={styles.tipText}>Use good lighting and avoid glare</Text>
            </View>
            <View style={styles.tipItem}>
              <Check size={16} color={Colors.success} />
              <Text style={styles.tipText}>Capture the entire page if possible</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Analysis Results View
        <ScrollView style={styles.content} contentContainerStyle={styles.resultsContainer}>
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              <View style={styles.analyzingOverlay}>
                <View style={styles.analyzingCard}>
                  <Brain size={32} color={Colors.primary} />
                  <Text style={styles.analyzingTitle}>Analyzing Statement...</Text>
                  <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 16 }} />
                  <View style={styles.agentSteps}>
                    {agentSteps.map((step, i) => (
                      <View key={i} style={styles.agentStep}>
                        <Zap size={14} color={Colors.textMuted} />
                        <Text style={styles.agentStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ) : analysis ? (
            <>
              {/* Statement Info */}
              <View style={[styles.statementCard, { borderLeftColor: brokerColor }]}>
                <View style={styles.statementHeader}>
                  <Building2 size={24} color={brokerColor} />
                  <View style={styles.statementHeaderText}>
                    <Text style={styles.brokerName}>{analysis.broker}</Text>
                    <Text style={styles.statementDate}>{analysis.statementDate}</Text>
                  </View>
                  <View style={[styles.qualityBadge, {
                    backgroundColor: analysis.extractionQuality === 'high' ? Colors.successMuted :
                                    analysis.extractionQuality === 'medium' ? Colors.goldMuted : Colors.dangerMuted
                  }]}>
                    <Text style={[styles.qualityBadgeText, {
                      color: analysis.extractionQuality === 'high' ? Colors.success :
                             analysis.extractionQuality === 'medium' ? Colors.gold : Colors.danger
                    }]}>
                      {analysis.extractionQuality.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.statementDetails}>
                  <View style={styles.statementDetailRow}>
                    <Text style={styles.statementDetailLabel}>Account Type</Text>
                    <Text style={styles.statementDetailValue}>{analysis.accountType.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <View style={styles.statementDetailRow}>
                    <Text style={styles.statementDetailLabel}>Total Value</Text>
                    <Text style={styles.statementDetailValue}>${analysis.totalValue.toLocaleString()}</Text>
                  </View>
                  {analysis.cashBalance !== undefined && (
                    <View style={styles.statementDetailRow}>
                      <Text style={styles.statementDetailLabel}>Cash Balance</Text>
                      <Text style={styles.statementDetailValue}>${analysis.cashBalance.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Warnings */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <View style={styles.warningsCard}>
                  <View style={styles.warningsHeader}>
                    <AlertCircle size={20} color={Colors.gold} />
                    <Text style={styles.warningsTitle}>Review Needed</Text>
                  </View>
                  {analysis.warnings.map((warning, i) => (
                    <Text key={i} style={styles.warningText}>• {warning}</Text>
                  ))}
                </View>
              )}

              {/* Holdings List */}
              <View style={styles.holdingsSection}>
                <View style={styles.holdingsSectionHeader}>
                  <Text style={styles.holdingsSectionTitle}>
                    Holdings ({analysis.holdings.length})
                  </Text>
                  <Text style={styles.holdingsSectionSubtitle}>
                    Select holdings to import
                  </Text>
                </View>

                {analysis.holdings.map((holding, index) => {
                  const AssetIcon = ASSET_TYPE_ICONS[holding.assetType] || Tag;
                  const isSelected = selectedHoldings.has(index);
                  const confidenceColor = holding.confidence >= 0.7 ? Colors.success :
                                         holding.confidence >= 0.5 ? Colors.gold : Colors.danger;

                  return (
                    <Pressable
                      key={index}
                      style={[styles.holdingCard, isSelected && styles.holdingCardSelected]}
                      onPress={() => toggleHolding(index)}
                    >
                      <View style={styles.holdingCheckbox}>
                        {isSelected && <Check size={16} color={Colors.primary} />}
                      </View>
                      <View style={styles.holdingContent}>
                        <View style={styles.holdingHeader}>
                          <View style={styles.holdingSymbol}>
                            <AssetIcon size={16} color={Colors.textMuted} />
                            <Text style={styles.holdingSymbolText}>{holding.symbol}</Text>
                          </View>
                          <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}20` }]}>
                            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                              {Math.round(holding.confidence * 100)}%
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.holdingName}>{holding.name}</Text>
                        <View style={styles.holdingDetails}>
                          <Text style={styles.holdingDetailText}>
                            {holding.quantity} shares @ ${holding.price.toFixed(2)}
                          </Text>
                          <Text style={styles.holdingValue}>${holding.value.toLocaleString()}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable style={styles.resetButton} onPress={resetScan}>
                  <RefreshCw size={20} color={Colors.textSecondary} />
                  <Text style={styles.resetButtonText}>Scan Another</Text>
                </Pressable>
                <Pressable
                  style={[styles.importButton, selectedHoldings.size === 0 && styles.importButtonDisabled]}
                  onPress={importHoldings}
                  disabled={selectedHoldings.size === 0}
                >
                  <Check size={20} color="#fff" />
                  <Text style={styles.importButtonText}>
                    Import {selectedHoldings.size} Holdings
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  gemini3Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  gemini3Text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  uploadSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  brokerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brokerChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brokerChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tipsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  premiumGateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  premiumGateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  premiumGateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumGateSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  resultsContainer: {
    padding: 20,
  },
  analyzingContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  analyzingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '90%',
  },
  analyzingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  agentSteps: {
    width: '100%',
    gap: 8,
  },
  agentStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentStepText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statementCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statementHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  brokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statementDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qualityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statementDetails: {
    gap: 8,
  },
  statementDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statementDetailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statementDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  warningsCard: {
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  warningText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  holdingsSection: {
    marginBottom: 16,
  },
  holdingsSectionHeader: {
    marginBottom: 12,
  },
  holdingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingsSectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  holdingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  holdingCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  holdingCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holdingContent: {
    flex: 1,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  holdingSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holdingSymbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  holdingName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingDetailText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  importButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
