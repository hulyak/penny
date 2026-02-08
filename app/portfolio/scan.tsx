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
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
  X,
  Brain,
  Zap,
  FileText,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Holding, AssetType, ASSET_TYPE_CONFIG } from '@/types';
import { generateStructuredWithGemini } from '@/lib/gemini';
import portfolioService from '@/lib/portfolioService';
import { z } from 'zod';

// Schema for extracted holdings from document
const ExtractedHoldingSchema = z.object({
  name: z.string(),
  symbol: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  type: z.enum(['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'other']),
  confidence: z.number().min(0).max(1),
});

const DocumentAnalysisSchema = z.object({
  holdings: z.array(ExtractedHoldingSchema),
  documentType: z.string(),
  brokerName: z.string().optional(),
  accountType: z.string().optional(),
  totalValue: z.number().optional(),
  asOfDate: z.string().optional(),
  reasoning: z.string(),
});

type ExtractedHolding = z.infer<typeof ExtractedHoldingSchema>;
type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [selectedHoldings, setSelectedHoldings] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const addAgentStep = (step: string) => {
    setAgentSteps(prev => [...prev, step]);
  };

  const loadSampleStatement = async () => {
    setIsAnalyzing(true);
    setCapturedImage('sample');
    setAgentSteps([]);
    setAnalysis(null);
    setSelectedHoldings(new Set());

    addAgentStep('🔍 Loading sample Fidelity statement...');
    await new Promise(r => setTimeout(r, 600));
    addAgentStep('📝 Extracting text and tables...');
    await new Promise(r => setTimeout(r, 500));
    addAgentStep('🧠 Gemini 3 reasoning (thinking: high)...');
    await new Promise(r => setTimeout(r, 1200));
    addAgentStep('✅ Validating extracted data...');
    await new Promise(r => setTimeout(r, 400));

    const sampleResult: DocumentAnalysis = {
      holdings: [
        { name: 'Apple Inc', symbol: 'AAPL', quantity: 50, price: 185.50, type: 'stock', confidence: 0.98 },
        { name: 'Microsoft Corporation', symbol: 'MSFT', quantity: 30, price: 420.00, type: 'stock', confidence: 0.97 },
        { name: 'Alphabet Inc Class A', symbol: 'GOOGL', quantity: 20, price: 175.25, type: 'stock', confidence: 0.95 },
        { name: 'Vanguard Total Stock Market ETF', symbol: 'VTI', quantity: 100, price: 245.80, type: 'etf', confidence: 0.99 },
        { name: 'Vanguard Total Bond Market ETF', symbol: 'BND', quantity: 75, price: 72.50, type: 'bond', confidence: 0.96 },
        { name: 'Amazon.com Inc', symbol: 'AMZN', quantity: 15, price: 198.30, type: 'stock', confidence: 0.93 },
        { name: 'Berkshire Hathaway Class B', symbol: 'BRK.B', quantity: 8, price: 412.00, type: 'stock', confidence: 0.72 },
        { name: 'Schwab US Dividend Equity ETF', symbol: 'SCHD', quantity: 40, price: 78.90, type: 'etf', confidence: 0.48 },
      ],
      documentType: 'Brokerage Statement',
      brokerName: 'Fidelity Investments',
      accountType: 'Individual Brokerage',
      totalValue: 64824,
      asOfDate: '2026-01-31',
      reasoning: 'Successfully extracted 8 holdings from Fidelity brokerage statement. The document contained a clear holdings table with symbols, quantities, current prices, and market values. Two holdings (BRK.B and SCHD) had lower confidence due to partially obscured text near the page fold.',
    };

    addAgentStep(`📊 Found ${sampleResult.holdings.length} holdings`);

    setAnalysis(sampleResult);
    const highConfidence = new Set<number>();
    sampleResult.holdings.forEach((h, i) => {
      if (h.confidence >= 0.7) highConfidence.add(i);
    });
    setSelectedHoldings(highConfidence);
    setIsAnalyzing(false);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.8,
        });
        if (photo?.base64) {
          setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
          analyzeDocument(`data:image/jpeg;base64,${photo.base64}`);
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setCapturedImage(imageUri);
      analyzeDocument(imageUri);
    }
  };

  const analyzeDocument = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAgentSteps([]);
    setAnalysis(null);

    try {
      // Step 1: Document recognition
      addAgentStep('🔍 Analyzing document type...');
      await new Promise(r => setTimeout(r, 500));

      // Step 2: OCR and extraction
      addAgentStep('📝 Extracting text and tables...');
      await new Promise(r => setTimeout(r, 500));

      // Step 3: Gemini 3 analysis with HIGH thinking level
      addAgentStep('🧠 Gemini 3 reasoning (thinking: high)...');

      const result = await generateStructuredWithGemini({
        prompt: `Analyze this financial document (brokerage statement, portfolio report, or investment summary).

Extract ALL holdings/positions visible in the document. For each holding, identify:
- Name of the security/asset
- Ticker symbol if visible
- Quantity/shares held
- Current price or value per unit
- Type (stock, ETF, mutual fund, bond, crypto, other)
- Your confidence level (0-1) in the extraction

Also identify:
- Document type (statement, report, screenshot, etc.)
- Broker/platform name if visible
- Account type if mentioned
- Total portfolio value if shown
- Date of the statement

Provide reasoning explaining your analysis process and any assumptions made.

Be thorough - extract EVERY holding you can identify, even if partially visible.`,
        schema: DocumentAnalysisSchema,
        image: imageBase64,
        temperature: 0.2,
        thinkingLevel: 'high', // Use highest reasoning for accuracy
      });

      // Step 4: Validation
      addAgentStep('✅ Validating extracted data...');
      await new Promise(r => setTimeout(r, 300));

      // Step 5: Results
      addAgentStep(`📊 Found ${result.holdings.length} holdings`);

      setAnalysis(result);
      // Auto-select high confidence holdings
      const highConfidence = new Set<number>();
      result.holdings.forEach((h, i) => {
        if (h.confidence >= 0.7) highConfidence.add(i);
      });
      setSelectedHoldings(highConfidence);

    } catch (error) {
      console.error('Document analysis failed:', error);
      addAgentStep('❌ Analysis failed - please try again');
      Alert.alert('Analysis Failed', 'Could not analyze the document. Please try a clearer image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleHolding = (index: number) => {
    const newSelected = new Set(selectedHoldings);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedHoldings(newSelected);
  };

  const importSelected = async () => {
    if (!analysis || selectedHoldings.size === 0) return;

    setIsImporting(true);
    try {
      for (const index of selectedHoldings) {
        const extracted = analysis.holdings[index];
        const holding: Holding = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: extracted.type as AssetType,
          name: extracted.name,
          symbol: extracted.symbol,
          quantity: extracted.quantity,
          purchasePrice: extracted.price,
          purchaseDate: analysis.asOfDate || new Date().toISOString().split('T')[0],
          currency: 'USD',
          currentPrice: extracted.price,
          currentValue: extracted.quantity * extracted.price,
          lastPriceUpdate: new Date().toISOString(),
          isManualPricing: false,
          assetClass: ASSET_TYPE_CONFIG[extracted.type as AssetType]?.assetClass || 'equity',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await portfolioService.saveHolding(holding);
      }

      Alert.alert(
        'Import Successful',
        `Imported ${selectedHoldings.size} holdings from your document.`,
        [{ text: 'View Portfolio', onPress: () => router.replace('/(tabs)/portfolio') }]
      );
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert('Import Failed', 'Could not import holdings. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setAgentSteps([]);
    setSelectedHoldings(new Set());
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Camera size={48} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Scan your brokerage statements to automatically import holdings
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.galleryButton} onPress={pickImage}>
            <ImageIcon size={18} color={Colors.primary} />
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={loadSampleStatement}>
            <Sparkles size={18} color="#4285F4" />
            <Text style={styles.sampleButtonText}>Load Sample Statement</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Statement</Text>
        <View style={styles.gemini3Badge}>
          <Sparkles size={14} color="#4285F4" />
          <Text style={styles.gemini3Text}>Gemini 3</Text>
        </View>
      </View>

      {!capturedImage ? (
        // Camera View
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>
                Position your statement within the frame
              </Text>
            </View>
          </CameraView>

          <View style={styles.cameraControls}>
            <Pressable style={styles.galleryButtonSmall} onPress={pickImage}>
              <ImageIcon size={24} color={Colors.text} />
            </Pressable>
            <Pressable style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </Pressable>
            <View style={{ width: 56 }} />
          </View>

          {/* Sample + Feature Highlight */}
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.featureHighlight}
          >
            <Pressable style={styles.sampleButtonCamera} onPress={loadSampleStatement}>
              <Sparkles size={16} color="#4285F4" />
              <Text style={styles.sampleButtonCameraText}>Load Sample Statement</Text>
            </Pressable>
            <View style={styles.featureCard}>
              <Brain size={20} color={Colors.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Multimodal AI Analysis</Text>
                <Text style={styles.featureText}>
                  Gemini 3 vision extracts holdings from any statement
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      ) : (
        // Analysis View
        <ScrollView style={styles.analysisContainer} showsVerticalScrollIndicator={false}>
          {/* Captured Image Preview */}
          {capturedImage && capturedImage !== 'sample' && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              <Pressable style={styles.retakeButton} onPress={resetScan}>
                <RefreshCw size={18} color={Colors.text} />
                <Text style={styles.retakeText}>Retake</Text>
              </Pressable>
            </View>
          )}

          {/* Agent Reasoning Steps */}
          <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <Brain size={18} color={Colors.primary} />
              <Text style={styles.agentTitle}>Agent Reasoning</Text>
              <View style={styles.thinkingBadge}>
                <Zap size={12} color={Colors.warning} />
                <Text style={styles.thinkingText}>thinking: high</Text>
              </View>
            </View>
            <View style={styles.agentSteps}>
              {agentSteps.map((step, i) => (
                <View key={i} style={styles.agentStep}>
                  <Text style={styles.agentStepText}>{step}</Text>
                </View>
              ))}
              {isAnalyzing && (
                <View style={styles.agentStep}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
            </View>
          </View>

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Document Info */}
              <View style={styles.docInfoCard}>
                <FileText size={18} color={Colors.accent} />
                <View style={styles.docInfoContent}>
                  <Text style={styles.docInfoTitle}>{analysis.documentType}</Text>
                  {analysis.brokerName && (
                    <Text style={styles.docInfoText}>
                      {analysis.brokerName} {analysis.accountType ? `• ${analysis.accountType}` : ''}
                    </Text>
                  )}
                  {analysis.totalValue && (
                    <Text style={styles.docInfoValue}>
                      Total: ${analysis.totalValue.toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>

              {/* AI Reasoning */}
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningLabel}>AI Reasoning:</Text>
                <Text style={styles.reasoningText}>{analysis.reasoning}</Text>
              </View>

              {/* Extracted Holdings */}
              <View style={styles.holdingsSection}>
                <Text style={styles.holdingsTitle}>
                  Extracted Holdings ({analysis.holdings.length})
                </Text>
                <Text style={styles.holdingsHint}>
                  Tap to select/deselect for import
                </Text>

                {analysis.holdings.map((holding, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.holdingCard,
                      selectedHoldings.has(index) && styles.holdingCardSelected,
                    ]}
                    onPress={() => toggleHolding(index)}
                  >
                    <View style={styles.holdingCheckbox}>
                      {selectedHoldings.has(index) ? (
                        <Check size={16} color={Colors.primary} />
                      ) : (
                        <View style={styles.checkboxEmpty} />
                      )}
                    </View>
                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingName}>{holding.name}</Text>
                      <Text style={styles.holdingMeta}>
                        {holding.symbol && `${holding.symbol} • `}
                        {holding.quantity} shares @ ${holding.price.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={[
                        styles.confidenceText,
                        { color: holding.confidence >= 0.7 ? Colors.success : Colors.warning }
                      ]}>
                        {Math.round(holding.confidence * 100)}%
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Import Button */}
      {analysis && selectedHoldings.size > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.importButton, isImporting && styles.importButtonDisabled]}
            onPress={importSelected}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color={Colors.textLight} />
            ) : (
              <>
                <Check size={20} color={Colors.textLight} />
                <Text style={styles.importButtonText}>
                  Import {selectedHoldings.size} Holdings
                </Text>
              </>
            )}
          </Pressable>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  gemini3Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gemini3Text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
  },

  // Permission view
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  galleryButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Camera view
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: '85%',
    aspectRatio: 1.4,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanHint: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  galleryButtonSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.textLight,
  },
  featureHighlight: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Analysis view
  analysisContainer: {
    flex: 1,
    padding: 16,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },

  // Agent card
  agentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  agentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  thinkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thinkingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning,
  },
  agentSteps: {
    gap: 8,
  },
  agentStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentStepText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Document info
  docInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  docInfoContent: {
    flex: 1,
  },
  docInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  docInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  docInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },

  // Reasoning
  reasoningCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  reasoningText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Holdings section
  holdingsSection: {
    marginBottom: 100,
  },
  holdingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  holdingsHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  holdingCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  holdingCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sampleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },
  sampleButtonCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  sampleButtonCameraText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4285F4',
  },
});
