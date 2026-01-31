import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingDown,
  Wallet,
  Volume2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import { WhatWouldChange } from '@/components/WhatWouldChange';
import Colors from '@/constants/colors';
import { playTextToSpeech } from '@/lib/elevenLabs';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export function PurchaseAnalysisModal() {
  const { showPurchaseModal, setShowPurchaseModal, currentAnalysis } = useCoach();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showPurchaseModal) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [showPurchaseModal, scaleAnim, opacityAnim]);

  if (!currentAnalysis) return null;

  const getWhatWouldChangeItems = () => {
    const items: string[] = [];
    if (currentAnalysis.recommendation === 'delay') {
      items.push('Saving for 2-3 more weeks before purchasing');
      items.push('Finding a less expensive alternative');
      items.push('Waiting for a sale or discount');
    } else if (currentAnalysis.recommendation === 'reconsider') {
      items.push('Reducing the purchase amount by 20-30%');
      items.push('Spreading the cost over multiple weeks');
      items.push('Offsetting with reduced spending elsewhere');
    } else {
      items.push('Buying now vs. waiting for better deals');
      items.push('Using cash back or rewards');
    }
    return items;
  };

  const getRecommendationConfig = (recommendation: string) => {
    switch (recommendation) {
      case 'proceed':
        return {
          icon: CheckCircle,
          color: Colors.success,
          bgColor: Colors.successMuted,
          label: 'Looks Good!',
        };
      case 'reconsider':
        return {
          icon: AlertTriangle,
          color: Colors.warning,
          bgColor: Colors.warningMuted,
          label: 'Think It Over',
        };
      case 'delay':
        return {
          icon: XCircle,
          color: Colors.danger,
          bgColor: Colors.dangerMuted,
          label: 'Maybe Wait',
        };
      default:
        return {
          icon: AlertTriangle,
          color: Colors.warning,
          bgColor: Colors.warningMuted,
          label: 'Review',
        };
    }
  };

  const config = getRecommendationConfig(currentAnalysis.recommendation);
  const Icon = config.icon;

  const speakAnalysis = async () => {
    if (isSpeaking) return;
    const text = `${config.label}. ${currentAnalysis.reasoning}. ${currentAnalysis.adjustedPlan || ''}`;
    
    try {
      setIsSpeaking(true);
      await playTextToSpeech(text);
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <Modal
      visible={showPurchaseModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowPurchaseModal(false)}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.backdrop} 
          onPress={() => setShowPurchaseModal(false)} 
        />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Purchase Analysis</Text>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowPurchaseModal(false)}
            >
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{currentAnalysis.itemName}</Text>
              <Text style={styles.itemCost}>
                ${currentAnalysis.cost.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.recommendationCard, { backgroundColor: config.bgColor }]}>
              <Icon size={28} color={config.color} />
              <Text style={[styles.recommendationLabel, { color: config.color }]}>
                {config.label}
              </Text>
            </View>

            <View style={styles.mascotSection}>
              <Image source={{ uri: MASCOT_URL }} style={styles.mascot} />
              <View style={styles.mascotBubble}>
                <Text style={styles.reasoningText}>{currentAnalysis.reasoning}</Text>
                <Pressable 
                  style={[styles.speakButton, isSpeaking && styles.speakButtonDisabled]} 
                  onPress={speakAnalysis}
                  disabled={isSpeaking}
                >
                  <Volume2 size={14} color={isSpeaking ? Colors.textMuted : Colors.accent} />
                  <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextDisabled]}>
                    {isSpeaking ? 'Playing...' : 'Listen'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Wallet size={18} color={Colors.accent} />
                <Text style={styles.metricValue}>
                  {currentAnalysis.bufferImpact.toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>of savings</Text>
              </View>
              <View style={styles.metricCard}>
                <TrendingDown size={18} color={Colors.warning} />
                <Text style={styles.metricValue}>
                  {currentAnalysis.runwayImpact.toFixed(1)}mo
                </Text>
                <Text style={styles.metricLabel}>runway impact</Text>
              </View>
            </View>

            {currentAnalysis.adjustedPlan && (
              <View style={styles.planSection}>
                <View style={styles.planHeader}>
                  <Lightbulb size={16} color={Colors.accent} />
                  <Text style={styles.planTitle}>Suggested Approach</Text>
                </View>
                <Text style={styles.planText}>{currentAnalysis.adjustedPlan}</Text>
              </View>
            )}

            {/* What Would Change This */}
            <WhatWouldChange items={getWhatWouldChangeItems()} />

            {/* Quick alternatives */}
            <Pressable 
              style={styles.alternativesToggle}
              onPress={() => setShowAlternatives(!showAlternatives)}
            >
              <Text style={styles.alternativesLabel}>Quick alternatives</Text>
              {showAlternatives ? (
                <ChevronUp size={18} color={Colors.textMuted} />
              ) : (
                <ChevronDown size={18} color={Colors.textMuted} />
              )}
            </Pressable>

            {showAlternatives && (
              <View style={styles.alternativesList}>
                <View style={styles.alternativeItem}>
                  <Clock size={16} color={Colors.warning} />
                  <View style={styles.alternativeContent}>
                    <Text style={styles.alternativeTitle}>Wait & Save</Text>
                    <Text style={styles.alternativeDesc}>
                      Save ${Math.ceil(currentAnalysis.cost / 4)}/week for 4 weeks
                    </Text>
                  </View>
                </View>
                <View style={styles.alternativeItem}>
                  <TrendingDown size={16} color={Colors.success} />
                  <View style={styles.alternativeContent}>
                    <Text style={styles.alternativeTitle}>Find Cheaper</Text>
                    <Text style={styles.alternativeDesc}>
                      Look for options under ${Math.floor(currentAnalysis.cost * 0.7)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable 
              style={styles.dismissButton}
              onPress={() => setShowPurchaseModal(false)}
            >
              <Text style={styles.dismissButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  itemInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemCost: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.accent,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  recommendationLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  mascotSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  mascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  mascotBubble: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.accentMuted,
    borderRadius: 12,
    gap: 4,
  },
  speakButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
  },
  speakButtonDisabled: {
    opacity: 0.7,
    backgroundColor: Colors.border,
  },
  speakButtonTextDisabled: {
    color: Colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  planSection: {
    backgroundColor: Colors.accentMuted,
    padding: 16,
    borderRadius: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  planText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dismissButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  alternativesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  alternativesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  alternativesList: {
    gap: 10,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  alternativeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
