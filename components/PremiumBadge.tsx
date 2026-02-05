import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Crown, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
}

export function PremiumBadge({ size = 'medium', showLabel = true, onPress }: PremiumBadgeProps) {
  const sizeConfig = {
    small: { iconSize: 12, fontSize: 10, padding: 4, gap: 3 },
    medium: { iconSize: 14, fontSize: 12, padding: 6, gap: 4 },
    large: { iconSize: 18, fontSize: 14, padding: 8, gap: 6 },
  };

  const config = sizeConfig[size];

  const content = (
    <View style={[styles.badge, { paddingHorizontal: config.padding * 1.5, paddingVertical: config.padding, gap: config.gap }]}>
      <Crown size={config.iconSize} color={Colors.warning} fill={Colors.warning} />
      {showLabel && (
        <Text style={[styles.badgeText, { fontSize: config.fontSize }]}>PRO</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

interface PremiumLockedOverlayProps {
  title?: string;
  description?: string;
  onUpgrade?: () => void;
}

export function PremiumLockedOverlay({
  title = 'Premium Feature',
  description = 'Upgrade to unlock this feature and get access to advanced portfolio analysis.',
  onUpgrade,
}: PremiumLockedOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.lockedCard}>
        <View style={styles.lockedIconWrapper}>
          <Lock size={32} color={Colors.warning} />
        </View>
        <Text style={styles.lockedTitle}>{title}</Text>
        <Text style={styles.lockedDescription}>{description}</Text>
        {onUpgrade && (
          <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
            <Crown size={16} color={Colors.textLight} />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface PremiumCardProps {
  title: string;
  description: string;
  onUpgrade?: () => void;
}

export function PremiumCard({ title, description, onUpgrade }: PremiumCardProps) {
  return (
    <View style={styles.premiumCard}>
      <View style={styles.premiumHeader}>
        <View style={styles.premiumIconWrapper}>
          <Crown size={20} color={Colors.warning} fill={Colors.warning} />
        </View>
        <PremiumBadge size="small" />
      </View>
      <Text style={styles.premiumTitle}>{title}</Text>
      <Text style={styles.premiumDescription}>{description}</Text>
      {onUpgrade && (
        <Pressable style={styles.premiumUpgradeButton} onPress={onUpgrade}>
          <Text style={styles.premiumUpgradeText}>Upgrade to Unlock</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningMuted,
    borderRadius: 12,
  },
  badgeText: {
    fontWeight: '700',
    color: Colors.warning,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  lockedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
  },
  lockedIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.warningMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  premiumCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.warningMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  premiumUpgradeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumUpgradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
