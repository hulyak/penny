import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Youtube,
  Twitter,
  Bell,
  BellOff,
  ChevronRight,
  PieChart,
  MessageSquare,
  FileText,
  Users,
  CheckCircle,
  ExternalLink,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getCreatorData,
  Creator,
  ModelPortfolio,
  MarketCommentary,
  Question,
  formatFollowers,
  getTimeAgo,
} from '@/lib/creatorHub';

export default function CreatorHubScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Creator | null>(null);
  const [portfolio, setPortfolio] = useState<ModelPortfolio | null>(null);
  const [commentary, setCommentary] = useState<MarketCommentary[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getCreatorData();
    setProfile(data.profile);
    setPortfolio(data.portfolio);
    setCommentary(data.commentary);
    setQuestions(data.questions);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const unreadCommentaryCount = commentary.filter((c) => !c.isRead).length;
  const pendingQuestionsCount = questions.filter((q) => q.status === 'pending').length;
  const answeredQuestionsCount = questions.filter((q) => q.status === 'answered' || q.status === 'featured').length;

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Creator Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Creator Profile Card */}
      <View style={styles.profileCardWrapper}>
        <LinearGradient
          colors={['#5B5FEF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileGradient}
        >
          <View style={styles.profileDecor1} />
          <View style={styles.profileDecor2} />

          <View style={styles.profileHeader}>
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                {profile.verified && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.profileHandle}>{profile.handle}</Text>
            </View>
          </View>

          <View style={styles.followersRow}>
            <Users size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.followersText}>
              {formatFollowers(profile.followers)} followers
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.profileContent}>
          <Text style={styles.profileBio}>{profile.bio}</Text>

          {/* Social Links */}
          <View style={styles.socialRow}>
            {profile.socialLinks.youtube && (
              <Pressable
                style={styles.socialButton}
                onPress={() => Linking.openURL(profile.socialLinks.youtube!)}
              >
                <Youtube size={18} color="#FF0000" />
                <Text style={styles.socialText}>YouTube</Text>
              </Pressable>
            )}
            {profile.socialLinks.twitter && (
              <Pressable
                style={styles.socialButton}
                onPress={() => Linking.openURL(profile.socialLinks.twitter!)}
              >
                <Twitter size={18} color="#1DA1F2" />
                <Text style={styles.socialText}>Twitter</Text>
              </Pressable>
            )}
          </View>

          {/* Follow Button */}
          <Pressable
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? (
              <>
                <Bell size={18} color={Colors.accent} />
                <Text style={styles.followingText}>Following</Text>
              </>
            ) : (
              <>
                <Bell size={18} color={Colors.textLight} />
                <Text style={styles.followText}>Follow for Updates</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: Colors.accentMuted }]}>
            <PieChart size={16} color={Colors.accent} />
          </View>
          <Text style={styles.statValue}>{portfolio?.holdings.length || 0}</Text>
          <Text style={styles.statLabel}>Holdings</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: Colors.successMuted }]}>
            <TrendingUp size={16} color={Colors.success} />
          </View>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            +{portfolio?.ytdPerformance?.toFixed(1) || 0}%
          </Text>
          <Text style={styles.statLabel}>YTD Return</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: Colors.purpleMuted }]}>
            <MessageSquare size={16} color={Colors.purple} />
          </View>
          <Text style={styles.statValue}>{answeredQuestionsCount}</Text>
          <Text style={styles.statLabel}>Q&As</Text>
        </View>
      </View>

      {/* Navigation Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore</Text>

        {/* Model Portfolio */}
        <Pressable
          style={styles.navCard}
          onPress={() => router.push('/creator/portfolio' as any)}
        >
          <View style={[styles.navIconWrapper, { backgroundColor: Colors.accentMuted }]}>
            <PieChart size={24} color={Colors.accent} />
          </View>
          <View style={styles.navContent}>
            <Text style={styles.navTitle}>Josh's Model Portfolio</Text>
            <Text style={styles.navSubtitle}>
              {portfolio?.holdings.length} holdings · {portfolio?.riskLevel} risk
            </Text>
          </View>
          <View style={styles.navBadge}>
            <Text style={styles.navBadgeText}>View-Only</Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>

        {/* Market Commentary */}
        <Pressable
          style={styles.navCard}
          onPress={() => router.push('/creator/commentary' as any)}
        >
          <View style={[styles.navIconWrapper, { backgroundColor: Colors.lavenderMuted }]}>
            <FileText size={24} color={Colors.lavender} />
          </View>
          <View style={styles.navContent}>
            <Text style={styles.navTitle}>Market Commentary</Text>
            <Text style={styles.navSubtitle}>
              {commentary.length} posts · Weekly insights
            </Text>
          </View>
          {unreadCommentaryCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCommentaryCount}</Text>
            </View>
          )}
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>

        {/* Ask Josh */}
        <Pressable
          style={styles.navCard}
          onPress={() => router.push('/creator/ask' as any)}
        >
          <View style={[styles.navIconWrapper, { backgroundColor: Colors.successMuted }]}>
            <MessageSquare size={24} color={Colors.success} />
          </View>
          <View style={styles.navContent}>
            <Text style={styles.navTitle}>Ask Josh</Text>
            <Text style={styles.navSubtitle}>
              Community Q&A · {pendingQuestionsCount} pending
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Latest Commentary Preview */}
      {commentary.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest from Josh</Text>
            <Pressable onPress={() => router.push('/creator/commentary' as any)}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.commentaryPreview}
            onPress={() => router.push('/creator/commentary' as any)}
          >
            {commentary[0].isPinned && (
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedText}>📌 Pinned</Text>
              </View>
            )}
            <Text style={styles.commentaryTitle}>{commentary[0].title}</Text>
            <Text style={styles.commentarySummary} numberOfLines={2}>
              {commentary[0].summary}
            </Text>
            <View style={styles.commentaryMeta}>
              <View
                style={[
                  styles.sentimentBadge,
                  {
                    backgroundColor:
                      commentary[0].sentiment === 'bullish'
                        ? Colors.successMuted
                        : commentary[0].sentiment === 'bearish'
                        ? Colors.dangerMuted
                        : Colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sentimentText,
                    {
                      color:
                        commentary[0].sentiment === 'bullish'
                          ? Colors.success
                          : commentary[0].sentiment === 'bearish'
                          ? Colors.danger
                          : Colors.textSecondary,
                    },
                  ]}
                >
                  {commentary[0].sentiment}
                </Text>
              </View>
              <Text style={styles.commentaryTime}>
                {getTimeAgo(commentary[0].publishedAt)} · {commentary[0].readTime} min read
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ Educational content only. Not financial advice. Always do your own research.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },

  // Profile Card
  profileCardWrapper: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileGradient: {
    padding: 20,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  profileDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileContent: {
    backgroundColor: Colors.surface,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHandle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  followersText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  profileBio: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  socialText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  followingButton: {
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  followText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  followingText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  navIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  navSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  unreadBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textLight,
  },
  commentaryPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  pinnedBadge: {
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  commentaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  commentarySummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  commentaryTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  disclaimer: {
    marginHorizontal: 16,
    backgroundColor: Colors.warningMuted,
    borderRadius: 12,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    lineHeight: 18,
  },
});
