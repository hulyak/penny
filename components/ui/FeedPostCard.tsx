import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Heart, MessageCircle, Share2, Play } from 'lucide-react-native';
import Colors from '@/constants/colors';
import haptics from '@/lib/haptics';

export interface FeedPost {
  id: string;
  creator: {
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
  };
  type: 'text' | 'video' | 'image';
  content: string;
  mediaUrl?: string;
  thumbnail?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked?: boolean;
}

interface FeedPostCardProps {
  post: FeedPost;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onPress?: () => void;
}

export default function FeedPostCard({
  post,
  onLike,
  onComment,
  onShare,
  onPress,
}: FeedPostCardProps) {
  const handleLike = () => {
    haptics.lightTap();
    onLike?.();
  };

  const handleComment = () => {
    haptics.lightTap();
    onComment?.();
  };

  const handleShare = () => {
    haptics.lightTap();
    onShare?.();
  };

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      android_ripple={{ color: Colors.primary + '20' }}
    >
      {/* Creator Header */}
      <View style={styles.header}>
        <Image source={{ uri: post.creator.avatar }} style={styles.avatar} />
        <View style={styles.creatorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.creatorName}>{post.creator.name}</Text>
            {post.creator.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{post.creator.username}</Text>
        </View>
        <Text style={styles.timestamp}>{post.timestamp}</Text>
      </View>

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Media (Video/Image) */}
      {post.type === 'video' && post.thumbnail && (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: post.thumbnail }} style={styles.mediaThumbnail} />
          <View style={styles.playButton}>
            <Play size={32} color={Colors.text} fill={Colors.text} />
          </View>
        </View>
      )}

      {post.type === 'image' && post.mediaUrl && (
        <Image source={{ uri: post.mediaUrl }} style={styles.mediaImage} />
      )}

      {/* Engagement Bar */}
      <View style={styles.engagementBar}>
        <Pressable style={styles.engagementButton} onPress={handleLike}>
          <Heart
            size={20}
            color={post.isLiked ? Colors.danger : Colors.textSecondary}
            fill={post.isLiked ? Colors.danger : 'none'}
          />
          <Text
            style={[
              styles.engagementText,
              post.isLiked && { color: Colors.danger },
            ]}
          >
            {post.likes}
          </Text>
        </Pressable>

        <Pressable style={styles.engagementButton} onPress={handleComment}>
          <MessageCircle size={20} color={Colors.textSecondary} />
          <Text style={styles.engagementText}>{post.comments}</Text>
        </Pressable>

        <Pressable style={styles.engagementButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.textSecondary} />
          <Text style={styles.engagementText}>{post.shares}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  creatorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  username: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    marginBottom: 12,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: Colors.border,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.border,
  },
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
