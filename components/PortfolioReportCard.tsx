import React, { useRef } from 'react';
import { View, Text, StyleSheet, Share, Pressable, Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import { Share2, Shield, PieChart, Globe, Briefcase } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Holding, AssetClass, ASSET_CLASS_COLORS } from '@/types';

const PENNY_ICON = require('@/assets/images/bird-penny.png');

interface PortfolioReportCardProps {
  holdings: Holding[];
  diversificationScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  assetClassCount: number;
  sectorCount: number;
  countryCount: number;
  topStrength?: string;
  topConcern?: string;
  allocation: { assetClass: AssetClass; percent: number }[];
}

export function PortfolioReportCard({
  holdings,
  diversificationScore,
  riskLevel,
  assetClassCount,
  sectorCount,
  countryCount,
  topStrength,
  topConcern,
  allocation,
}: PortfolioReportCardProps) {
  const cardRef = useRef<View>(null);

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'low':
        return Colors.success;
      case 'moderate':
        return Colors.warning;
      case 'high':
        return Colors.coral;
      case 'very_high':
        return Colors.danger;
      default:
        return Colors.textMuted;
    }
  };

  const getScoreGrade = () => {
    if (diversificationScore >= 80) return 'A';
    if (diversificationScore >= 60) return 'B';
    if (diversificationScore >= 40) return 'C';
    if (diversificationScore >= 20) return 'D';
    return 'F';
  };

  const handleShare = async () => {
    try {
      if (cardRef.current) {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const filename = `portfolio-report-${Date.now()}.png`;
          const newPath = `${cacheDirectory}${filename}`;
          await copyAsync({ from: uri, to: newPath });
          await Sharing.shareAsync(newPath, {
            mimeType: 'image/png',
            dialogTitle: 'Share your portfolio report!',
          });
        } else {
          await Share.share({
            message: `My Portfolio Report Card\n\nDiversification Score: ${diversificationScore}/100 (${getScoreGrade()})\nRisk Level: ${riskLevel}\nHoldings: ${holdings.length}\nAsset Classes: ${assetClassCount}\nSectors: ${sectorCount}\nCountries: ${countryCount}\n\nTracked with Penny`,
          });
        }
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Report Card</Text>
          <View style={[styles.gradeBadge, { backgroundColor: getRiskColor() }]}>
            <Text style={styles.gradeText}>{getScoreGrade()}</Text>
          </View>
        </View>

        <View style={styles.scoreSection}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{diversificationScore}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <Text style={styles.scoreTitle}>Diversification Score</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <PieChart size={16} color={Colors.accent} />
            <Text style={styles.statValue}>{holdings.length}</Text>
            <Text style={styles.statLabel}>Holdings</Text>
          </View>
          <View style={styles.statItem}>
            <Shield size={16} color={Colors.lavender} />
            <Text style={styles.statValue}>{assetClassCount}</Text>
            <Text style={styles.statLabel}>Asset Classes</Text>
          </View>
          <View style={styles.statItem}>
            <Briefcase size={16} color={Colors.coral} />
            <Text style={styles.statValue}>{sectorCount}</Text>
            <Text style={styles.statLabel}>Sectors</Text>
          </View>
          <View style={styles.statItem}>
            <Globe size={16} color={Colors.success} />
            <Text style={styles.statValue}>{countryCount}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
        </View>

        {allocation.length > 0 && (
          <View style={styles.allocationBar}>
            {allocation.map((item, index) => (
              <View
                key={item.assetClass}
                style={[
                  styles.allocationSegment,
                  {
                    backgroundColor: ASSET_CLASS_COLORS[item.assetClass] || Colors.textMuted,
                    width: `${item.percent}%`,
                    borderTopLeftRadius: index === 0 ? 4 : 0,
                    borderBottomLeftRadius: index === 0 ? 4 : 0,
                    borderTopRightRadius: index === allocation.length - 1 ? 4 : 0,
                    borderBottomRightRadius: index === allocation.length - 1 ? 4 : 0,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {(topStrength || topConcern) && (
          <View style={styles.insightsSection}>
            {topStrength && (
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Strength</Text>
                <Text style={styles.insightText} numberOfLines={2}>{topStrength}</Text>
              </View>
            )}
            {topConcern && (
              <View style={styles.insightItem}>
                <Text style={[styles.insightLabel, { color: Colors.warning }]}>Improve</Text>
                <Text style={styles.insightText} numberOfLines={2}>{topConcern}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.branding}>
          <Image source={PENNY_ICON} style={styles.brandingIcon} />
          <Text style={styles.brandingText}>Generated with Penny</Text>
        </View>
      </View>

      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Share2 size={18} color={Colors.textLight} />
        <Text style={styles.shareButtonText}>Share Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textLight,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.accent,
  },
  scoreLabel: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  scoreTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allocationSegment: {
    height: '100%',
  },
  insightsSection: {
    gap: 8,
    marginBottom: 16,
  },
  insightItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  brandingIcon: {
    width: 20,
    height: 20,
  },
  brandingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
