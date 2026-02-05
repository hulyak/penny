import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  Bitcoin,
  Home,
  Gem,
  Banknote,
  Package,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AssetType } from '@/types';
import { useOnboarding } from '@/context/OnboardingContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ASSET_TYPE_OPTIONS: {
  type: AssetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: 'stock',
    label: 'Stocks',
    description: 'Track shares & ETFs',
    icon: <TrendingUp size={28} color={Colors.primary} />,
    color: Colors.primary,
  },
  {
    type: 'crypto',
    label: 'Crypto',
    description: 'BTC, ETH & altcoins',
    icon: <Bitcoin size={28} color="#F7931A" />,
    color: '#F7931A',
  },
  {
    type: 'real_estate',
    label: 'Real Estate',
    description: 'Property & REITs',
    icon: <Home size={28} color={Colors.purple} />,
    color: Colors.purple,
  },
  {
    type: 'gold',
    label: 'Commodities',
    description: 'Gold, silver & metals',
    icon: <Gem size={28} color={Colors.gold} />,
    color: Colors.gold,
  },
  {
    type: 'cash',
    label: 'Cash',
    description: 'Savings & bank accounts',
    icon: <Banknote size={28} color={Colors.success} />,
    color: Colors.success,
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Collectibles, art, watches',
    icon: <Package size={28} color={Colors.blue} />,
    color: Colors.blue,
  },
];

interface Props {
  onContinue: () => void;
  onSkip: () => void;
}

export function AssetTypeSelectionScreen({ onContinue, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedAssetTypes, toggleAssetType } = useOnboarding();

  const canContinue = selectedAssetTypes.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Select Asset Types</Text>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Asset Classes</Text>
        <Text style={styles.sectionCount}>
          {selectedAssetTypes.length} selected
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {ASSET_TYPE_OPTIONS.map((option) => {
            const isSelected = selectedAssetTypes.includes(option.type);
            return (
              <Pressable
                key={option.type}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isSelected && { borderColor: option.color },
                ]}
                onPress={() => toggleAssetType(option.type)}
              >
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                  {option.icon}
                </View>
                <Text style={[styles.cardLabel, isSelected && { color: option.color }]}>
                  {option.label}
                </Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.ctaButton,
            !canContinue && styles.ctaButtonDisabled,
          ]}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={[
            styles.ctaText,
            !canContinue && styles.ctaTextDisabled
          ]}>
            Continue
          </Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>{"I'll do this later"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1419',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 140,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#1C2333',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  cardSelected: {
    backgroundColor: 'rgba(0, 208, 156, 0.08)',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#1C2333',
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#1C2333',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  ctaTextDisabled: {
    color: Colors.textMuted,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
