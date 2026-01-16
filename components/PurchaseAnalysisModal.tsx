import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingDown,
  Wallet,
  Volume2,
} from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import * as Speech from 'expo-speech';

const MASCOT_URL = 'https://r2-pub.rork.dev/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export function PurchaseAnalysisModal() {
  const { showPurchaseModal, setShowPurchaseModal, currentAnalysis } = useCoach();

  if (!currentAnalysis) return null;

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

  const speakAnalysis = () => {
    const text = `${config.label}. ${currentAnalysis.reasoning}. ${currentAnalysis.adjustedPlan || ''}`;
    Speech.speak(text, { language: 'en', rate: 0.9 });
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
                <Pressable style={styles.speakButton} onPress={speakAnalysis}>
                  <Volume2 size={14} color={Colors.accent} />
                  <Text style={styles.speakButtonText}>Listen</Text>
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
                <Text style={styles.planTitle}>Suggested Approach</Text>
                <Text style={styles.planText}>{currentAnalysis.adjustedPlan}</Text>
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
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 6,
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
});
