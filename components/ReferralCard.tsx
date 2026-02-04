import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import {
  Gift,
  Users,
  Copy,
  Share2,
  ChevronRight,
  Award,
  Crown,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getReferralData,
  initializeReferralData,
  getCurrentTier,
  getNextTier,
  getReferralsToNextTier,
  getShareMessage,
  ReferralData,
  REFERRAL_TIERS,
} from '@/lib/referralSystem';

interface ReferralCardProps {
  userId: string;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function ReferralCard({ userId, onViewDetails, compact = false }: ReferralCardProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      let data = await getReferralData();
      if (!data) {
        data = await initializeReferralData(userId);
      }
      setReferralData(data);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (referralData?.code) {
      Clipboard.setString(referralData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralData) return;

    const tier = getCurrentTier(referralData.successfulReferrals);
    const message = getShareMessage(referralData.code, tier);

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  }

  if (!referralData) return null;

  const currentTier = getCurrentTier(referralData.successfulReferrals);
  const nextTier = getNextTier(referralData.successfulReferrals);
  const referralsToNext = getReferralsToNextTier(referralData.successfulReferrals);
  const progressToNext = nextTier
    ? ((referralData.successfulReferrals - currentTier.minReferrals) /
        (nextTier.minReferrals - currentTier.minReferrals)) *
      100
    : 100;

  if (compact) {
    return (
      <Pressable style={[styles.card, styles.cardCompact]} onPress={onViewDetails}>
        <View style={styles.compactRow}>
          <View style={styles.compactLeft}>
            <View style={styles.giftIcon}>
              <Gift size={20} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.compactTitle}>Invite Friends</Text>
              <Text style={styles.compactSubtitle}>
                Get {currentTier.premiumDaysPerReferral} days PRO each
              </Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierEmoji}>{currentTier.badge}</Text>
              <Text style={styles.tierCount}>{referralData.successfulReferrals}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Gift size={24} color={Colors.accent} />
          <View>
            <Text style={styles.title}>Invite Friends</Text>
            <Text style={styles.subtitle}>
              You both get {currentTier.premiumDaysPerReferral} days of PRO
            </Text>
          </View>
        </View>
        <View style={styles.tierDisplay}>
          <Text style={styles.tierEmoji}>{currentTier.badge}</Text>
          <Text style={styles.tierName}>{currentTier.name}</Text>
        </View>
      </View>

      {/* Referral Code */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Your referral code</Text>
        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referralData.code}</Text>
          </View>
          <Pressable
            style={[styles.copyButton, copied && styles.copyButtonActive]}
            onPress={handleCopyCode}
          >
            <Copy size={18} color={copied ? Colors.success : Colors.text} />
            <Text style={[styles.copyText, copied && styles.copyTextActive]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Users size={18} color={Colors.lavender} />
          <Text style={styles.statValue}>{referralData.successfulReferrals}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Crown size={18} color={Colors.warning} />
          <Text style={styles.statValue}>{referralData.totalRewardDays}</Text>
          <Text style={styles.statLabel}>Days Earned</Text>
        </View>
      </View>

      {/* Progress to Next Tier */}
      {nextTier && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {referralsToNext} more to {nextTier.badge} {nextTier.name}
            </Text>
            <Text style={styles.progressValue}>
              {nextTier.premiumDaysPerReferral} days/referral
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${Math.min(progressToNext, 100)}%` }]}
            />
          </View>
        </View>
      )}

      {/* Share Button */}
      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Share2 size={20} color={Colors.textLight} />
        <Text style={styles.shareButtonText}>Share Invite Link</Text>
      </Pressable>

      {/* Perks */}
      <View style={styles.perksSection}>
        <Text style={styles.perksTitle}>Your {currentTier.name} Perks</Text>
        <View style={styles.perksList}>
          {currentTier.perks.map((perk, index) => (
            <View key={index} style={styles.perkItem}>
              <Sparkles size={12} color={Colors.accent} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* View Details Link */}
      {onViewDetails && (
        <Pressable style={styles.detailsLink} onPress={onViewDetails}>
          <Award size={16} color={Colors.accent} />
          <Text style={styles.detailsLinkText}>View Rewards & Leaderboard</Text>
          <ChevronRight size={16} color={Colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompact: {
    padding: 16,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  compactSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tierDisplay: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tierEmoji: {
    fontSize: 24,
  },
  tierName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tierCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  codeSection: {
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyButtonActive: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success,
  },
  copyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  copyTextActive: {
    color: Colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  perksSection: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  perksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perksList: {
    gap: 8,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 13,
    color: Colors.text,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  detailsLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
});
