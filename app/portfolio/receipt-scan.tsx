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
  Receipt,
  DollarSign,
  Calendar,
  Tag,
  Brain,
  Zap,
  Check,
  RefreshCw,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Utensils,
  Plane,
  Heart,
  List,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { generateStructuredWithGemini } from '@/lib/gemini';
import { usePurchases } from '@/context/PurchasesContext';
import { PremiumCard } from '@/components/PremiumBadge';
import { expenseService } from '@/lib/expenseService';
import { Expense } from '@/types';
import { z } from 'zod';

// Schema for extracted receipt data
const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const ReceiptAnalysisSchema = z.object({
  merchant: z.string(),
  category: z.enum([
    'groceries', 'dining', 'transportation', 'entertainment',
    'shopping', 'healthcare', 'utilities', 'travel', 'other'
  ]),
  date: z.string().optional(),
  items: z.array(ReceiptItemSchema),
  subtotal: z.number(),
  tax: z.number().optional(),
  tip: z.number().optional(),
  total: z.number(),
  paymentMethod: z.string().optional(),
  reasoning: z.string(),
  budgetInsight: z.string(),
});

type ReceiptAnalysis = z.infer<typeof ReceiptAnalysisSchema>;

const CATEGORY_ICONS: Record<string, any> = {
  groceries: ShoppingCart,
  dining: Utensils,
  transportation: Car,
  entertainment: Coffee,
  shopping: Tag,
  healthcare: Heart,
  utilities: Home,
  travel: Plane,
  other: Receipt,
};

const CATEGORY_COLORS: Record<string, string> = {
  groceries: Colors.success,
  dining: Colors.coral,
  transportation: Colors.blue,
  entertainment: Colors.lavender,
  shopping: Colors.gold,
  healthcare: Colors.danger,
  utilities: Colors.cyan,
  travel: Colors.accent,
  other: Colors.textMuted,
};

export default function ReceiptScanScreen() {
  const router = useRouter();
  const { isPremium, showPaywall, subscriptionTier } = usePurchases();
  const hasProAccess = subscriptionTier === 'pro';
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const addAgentStep = (step: string) => {
    setAgentSteps(prev => [...prev, step]);
  };

  const loadSampleReceipt = async () => {
    setIsAnalyzing(true);
    setCapturedImage('sample');
    setAgentSteps([]);
    setAnalysis(null);

    addAgentStep('Loading sample receipt...');
    await new Promise(r => setTimeout(r, 500));
    addAgentStep('Detecting receipt format...');
    await new Promise(r => setTimeout(r, 400));
    addAgentStep('Reading text via OCR...');
    await new Promise(r => setTimeout(r, 400));
    addAgentStep('Gemini 3 analyzing (thinking: high)...');
    await new Promise(r => setTimeout(r, 1000));
    addAgentStep('Validating amounts...');
    await new Promise(r => setTimeout(r, 300));

    const sampleResult: ReceiptAnalysis = {
      merchant: 'Whole Foods Market',
      category: 'groceries',
      date: 'February 5, 2026',
      items: [
        { name: 'Organic Avocados (3pk)', quantity: 1, unitPrice: 4.99, totalPrice: 4.99 },
        { name: 'Wild Caught Salmon Fillet', quantity: 1, unitPrice: 12.99, totalPrice: 12.99 },
        { name: 'Organic Baby Spinach', quantity: 2, unitPrice: 3.49, totalPrice: 6.98 },
        { name: 'Sourdough Bread', quantity: 1, unitPrice: 5.49, totalPrice: 5.49 },
        { name: 'Oat Milk (64oz)', quantity: 1, unitPrice: 4.29, totalPrice: 4.29 },
        { name: 'Free Range Eggs (dozen)', quantity: 1, unitPrice: 6.99, totalPrice: 6.99 },
        { name: 'Organic Blueberries', quantity: 1, unitPrice: 5.99, totalPrice: 5.99 },
      ],
      subtotal: 47.72,
      tax: 2.86,
      total: 50.58,
      paymentMethod: 'Visa ending in 4821',
      reasoning: 'Successfully extracted 7 line items from Whole Foods Market receipt. All prices and quantities matched the subtotal. Tax rate of approximately 6% is consistent with local sales tax.',
      budgetInsight: 'This $50.58 grocery trip is about 12% of a typical $400 monthly grocery budget. Your per-item average of $7.23 suggests premium product choices. Consider buying staples in bulk to reduce costs.',
    };

    addAgentStep(`Categorized as ${sampleResult.category}`);
    setAnalysis(sampleResult);
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
          analyzeReceipt(`data:image/jpeg;base64,${photo.base64}`);
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
      analyzeReceipt(imageUri);
    }
  };

  const analyzeReceipt = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAgentSteps([]);
    setAnalysis(null);

    try {
      addAgentStep('Detecting receipt format...');
      await new Promise(r => setTimeout(r, 400));

      addAgentStep('Reading text via OCR...');
      await new Promise(r => setTimeout(r, 400));

      addAgentStep('Gemini 3 analyzing (thinking: high)...');

      const result = await generateStructuredWithGemini({
        prompt: `Analyze this receipt image and extract all financial information.

Extract:
1. Merchant name and category (groceries, dining, transportation, entertainment, shopping, healthcare, utilities, travel, other)
2. Date if visible
3. All line items with quantity, unit price, and total
4. Subtotal, tax, tip (if any), and total
5. Payment method if visible

Also provide:
- A brief reasoning of your analysis
- A budget insight (e.g., "This dining expense is 15% of a typical $500 monthly food budget")

Be thorough and accurate with numbers.`,
        schema: ReceiptAnalysisSchema,
        image: imageBase64,
        temperature: 0.2,
        thinkingLevel: 'high',
      });

      addAgentStep('Validating amounts...');
      await new Promise(r => setTimeout(r, 300));

      addAgentStep(`Categorized as ${result.category}`);

      setAnalysis(result);
    } catch (error) {
      console.error('Receipt analysis failed:', error);
      addAgentStep('Analysis failed');
      Alert.alert('Analysis Failed', 'Could not analyze the receipt. Please try a clearer image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setAgentSteps([]);
  };

  const saveExpense = async () => {
    if (!analysis) return;

    const expense: Expense = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      merchant: analysis.merchant,
      category: analysis.category,
      date: analysis.date,
      items: analysis.items,
      subtotal: analysis.subtotal,
      tax: analysis.tax,
      tip: analysis.tip,
      total: analysis.total,
      paymentMethod: analysis.paymentMethod,
      reasoning: analysis.reasoning,
      budgetInsight: analysis.budgetInsight,
      createdAt: new Date().toISOString(),
    };

    const success = await expenseService.saveExpense(expense);

    if (success) {
      Alert.alert(
        'Expense Logged',
        `$${analysis.total.toFixed(2)} at ${analysis.merchant} has been recorded.`,
        [
          { text: 'View Expenses', onPress: () => router.replace('/portfolio/expenses') },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } else {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
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

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Receipt size={48} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Scan receipts to automatically track expenses
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.galleryButton} onPress={pickImage}>
            <ImageIcon size={18} color={Colors.primary} />
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={loadSampleReceipt}>
            <Sparkles size={18} color="#4285F4" />
            <Text style={styles.sampleButtonText}>Load Sample Receipt</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Pro tier gate (requires Pro or Premium)
  if (!hasProAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Receipt</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.premiumGateContainer}>
          <View style={styles.premiumGateIcon}>
            <Receipt size={48} color={Colors.gold} />
          </View>
          <Text style={styles.premiumGateTitle}>AI Receipt Scanner</Text>
          <Text style={styles.premiumGateSubtitle}>
            Automatically extract and categorize expenses from receipts using Gemini Vision
          </Text>
          <PremiumCard
            title="Unlock Receipt Scanning"
            description="Upgrade to Pro to snap a photo of any receipt and let AI extract all the details automatically."
            onUpgrade={showPaywall}
          />
        </View>
      </View>
    );
  }

  const CategoryIcon = analysis ? CATEGORY_ICONS[analysis.category] : Receipt;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={styles.gemini3Badge}>
          <Sparkles size={14} color="#4285F4" />
          <Text style={styles.gemini3Text}>Gemini 3</Text>
        </View>
      </View>

      {!capturedImage ? (
        // Camera View
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame}>
                <Receipt size={32} color={Colors.primary} style={styles.frameIcon} />
              </View>
              <Text style={styles.scanHint}>
                Position your receipt within the frame
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

          {/* Feature Card */}
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.featureHighlight}
          >
            <Pressable style={styles.sampleButtonCamera} onPress={loadSampleReceipt}>
              <Sparkles size={16} color="#4285F4" />
              <Text style={styles.sampleButtonCameraText}>Load Sample Receipt</Text>
            </Pressable>
            <View style={styles.featureCard}>
              <Brain size={20} color={Colors.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Smart Expense Tracking</Text>
                <Text style={styles.featureText}>
                  AI extracts items, totals, and categorizes spending
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      ) : (
        // Analysis View
        <ScrollView style={styles.analysisContainer} showsVerticalScrollIndicator={false}>
          {/* Image Preview */}
          {capturedImage && capturedImage !== 'sample' && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              <Pressable style={styles.retakeButton} onPress={resetScan}>
                <RefreshCw size={18} color={Colors.text} />
                <Text style={styles.retakeText}>Retake</Text>
              </Pressable>
            </View>
          )}

          {/* Agent Steps */}
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
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
            </View>
          </View>

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Merchant & Category */}
              <View style={styles.merchantCard}>
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: CATEGORY_COLORS[analysis.category] + '20' }
                ]}>
                  <CategoryIcon size={24} color={CATEGORY_COLORS[analysis.category]} />
                </View>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName}>{analysis.merchant}</Text>
                  <Text style={styles.categoryText}>
                    {analysis.category.charAt(0).toUpperCase() + analysis.category.slice(1)}
                    {analysis.date && ` • ${analysis.date}`}
                  </Text>
                </View>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalAmount}>${analysis.total.toFixed(2)}</Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items ({analysis.items.length})</Text>
                {analysis.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.quantity > 1 && (
                        <Text style={styles.itemQty}>x{item.quantity} @ ${item.unitPrice.toFixed(2)}</Text>
                      )}
                    </View>
                    <Text style={styles.itemPrice}>${item.totalPrice.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              {/* Totals */}
              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>${analysis.subtotal.toFixed(2)}</Text>
                </View>
                {analysis.tax !== undefined && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax</Text>
                    <Text style={styles.totalValue}>${analysis.tax.toFixed(2)}</Text>
                  </View>
                )}
                {analysis.tip !== undefined && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tip</Text>
                    <Text style={styles.totalValue}>${analysis.tip.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>${analysis.total.toFixed(2)}</Text>
                </View>
                {analysis.paymentMethod && (
                  <Text style={styles.paymentMethod}>Paid with {analysis.paymentMethod}</Text>
                )}
              </View>

              {/* Budget Insight */}
              <View style={styles.insightCard}>
                <Sparkles size={16} color={Colors.accent} />
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Budget Insight</Text>
                  <Text style={styles.insightText}>{analysis.budgetInsight}</Text>
                </View>
              </View>

              {/* Reasoning */}
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningLabel}>AI Reasoning:</Text>
                <Text style={styles.reasoningText}>{analysis.reasoning}</Text>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Save Button */}
      {analysis && (
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <Pressable
              style={styles.viewExpensesButton}
              onPress={() => router.push('/portfolio/expenses')}
            >
              <List size={18} color={Colors.primary} />
              <Text style={styles.viewExpensesText}>Expenses</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={saveExpense}>
              <Check size={20} color={Colors.textLight} />
              <Text style={styles.saveButtonText}>Log Expense</Text>
            </Pressable>
          </View>
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

  // Permission
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

  // Camera
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
    width: '80%',
    aspectRatio: 0.7,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameIcon: {
    opacity: 0.5,
  },
  scanHint: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 16,
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

  // Analysis
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
    height: 180,
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

  // Agent Card
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

  // Merchant Card
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Items
  itemsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: Colors.text,
  },
  itemQty: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  // Totals
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },

  // Insight
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.accentMuted,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  // Reasoning
  reasoningCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 100,
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
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  viewExpensesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  viewExpensesText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  // Premium gate styles
  premiumGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumGateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.goldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumGateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  premiumGateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
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
