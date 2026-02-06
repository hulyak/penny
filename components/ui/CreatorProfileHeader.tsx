import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Users, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import haptics from '@/lib/haptics';

interface CreatorProfileHeaderProps {
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: string;
  performance: string;
  verified: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
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
}: CreatorProfileHeaderProps) {
  const handleFollowToggle = () => {
    haptics.lightTap();
    onFollowToggle();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#5B5FEF', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Avatar and Name */}
          <View style={styles.topRow}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{name}</Text>
                {verified && <CheckCircle size={20} color={Colors.primary} fill={Colors.primary} />}
              </View>
              <Text style={styles.username}>@{username}</Text>
            </View>
            <Pressable
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>{bio}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Users size={18} color={Colors.text} />
              <Text style={styles.statValue}>{followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <TrendingUp size={18} color={Colors.success} />
              <Text style={[styles.statValue, { color: Colors.success }]}>{performance}</Text>
              <Text style={styles.statLabel}>Performance</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.text,
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  username: {
    fontSize: 15,
    color: Colors.text + 'CC',
    marginTop: 4,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.text,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.text,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.purple,
  },
  followingButtonText: {
    color: Colors.text,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text + 'EE',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.text + 'CC',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.text + '40',
  },
});
