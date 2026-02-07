import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Users, TrendingUp, Youtube, Play, ExternalLink } from 'lucide-react-native';
import Colors from '@/constants/colors';
import haptics from '@/lib/haptics';

interface CreatorProfileHeaderProps {
  name: string;
  username: string;
  avatar: any; // Can be string URL or require() for local images
  bio: string;
  followers: string;
  performance: string;
  verified: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
  youtubeChannel?: string; // YouTube channel URL or handle
  totalVideos?: string;
}

export default function CreatorProfileHeader({
  name,
  username,
  avatar,
  bio,
  followers,
  performance,
  verified,
  isFollowing,
  onFollowToggle,
  youtubeChannel,
  totalVideos,
}: CreatorProfileHeaderProps) {
  const handleFollowToggle = () => {
    haptics.lightTap();
    onFollowToggle();
  };

  const openYouTubeChannel = () => {
    haptics.lightTap();
    if (youtubeChannel) {
      Linking.openURL(youtubeChannel);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Avatar and Name */}
          <View style={styles.topRow}>
            <View style={styles.avatarContainer}>
              <Image source={typeof avatar === 'string' ? { uri: avatar } : avatar} style={styles.avatar} />
              <View style={styles.youtubeBadge}>
                <Youtube size={12} color="#FFFFFF" fill="#FF0000" />
              </View>
            </View>
            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{name}</Text>
                {verified && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={16} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{username}</Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>{bio}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Users size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{followers}</Text>
              <Text style={styles.statLabel}>Subscribers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Play size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{totalVideos || '500+'}</Text>
              <Text style={styles.statLabel}>Videos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <TrendingUp size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{performance}</Text>
              <Text style={styles.statLabel}>Returns</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            {youtubeChannel && (
              <Pressable style={styles.youtubeButton} onPress={openYouTubeChannel}>
                <Youtube size={18} color="#FFFFFF" />
                <Text style={styles.youtubeButtonText}>Subscribe on YouTube</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  gradient: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  youtubeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 14,
    color: '#FFFFFF99',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFFCC',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#FFFFFF99',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  followButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  followingButtonText: {
    color: '#FFFFFF',
  },
  youtubeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FF0000',
  },
  youtubeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
