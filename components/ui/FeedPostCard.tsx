import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { Heart, MessageCircle, Share2, Play, ExternalLink, Video } from 'lucide-react-native';
import Colors from '@/constants/colors';
import haptics from '@/lib/haptics';

export interface FeedPost {
  id: string;
  creator: {
    name: string;
    username: string;
    avatar: any; // Can be string URL or require() for local images
    verified: boolean;
  };
  type: 'text' | 'video' | 'image';
  content: string;
  mediaUrl?: string;
  thumbnail?: any; // Can be string URL or require() for local images
  youtubeId?: string; // YouTube video ID for direct linking
  duration?: string; // Video duration display
  views?: string; // View count
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
  const [thumbnailError, setThumbnailError] = useState(false);

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

  const handleVideoPress = () => {
    haptics.lightTap();
    if (post.youtubeId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${post.youtubeId}`);
    } else {
      onPress?.();
    }
  };

  // Generate YouTube thumbnail URL from video ID (use hqdefault for better compatibility)
  const thumbnailUrl = post.youtubeId
    ? `https://img.youtube.com/vi/${post.youtubeId}/hqdefault.jpg`
    : null;

  return (
    <View style={styles.card}>
      {/* Creator Header */}
      <View style={styles.header}>
        <Image source={typeof post.creator.avatar === 'string' ? { uri: post.creator.avatar } : post.creator.avatar} style={styles.avatar} />
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

      {/* Video Thumbnail - YouTube Style */}
      {post.type === 'video' && (
        <Pressable onPress={handleVideoPress} style={styles.videoContainer}>
          {post.thumbnail ? (
            <Image
              source={typeof post.thumbnail === 'string' ? { uri: post.thumbnail } : post.thumbnail}
              style={styles.mediaThumbnail}
              resizeMode="cover"
            />
          ) : !thumbnailError && thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Video size={48} color={Colors.textSecondary} />
              <Text style={styles.fallbackText}>Tap to watch on YouTube</Text>
            </View>
          )}
          <View style={styles.videoOverlay}>
            <View style={styles.playButton}>
              <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
          {post.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{post.duration}</Text>
            </View>
          )}
          {post.youtubeId && (
            <View style={styles.youtubeBadge}>
              <ExternalLink size={12} color="#FFFFFF" />
              <Text style={styles.youtubeText}>YouTube</Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Video Title */}
      <Pressable onPress={handleVideoPress}>
        <Text style={styles.videoTitle} numberOfLines={2}>{post.content}</Text>
      </Pressable>

      {/* Video Stats */}
      {post.views && (
        <Text style={styles.videoStats}>{post.views} views</Text>
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
            {formatNumber(post.likes)}
          </Text>
        </Pressable>

        <Pressable style={styles.engagementButton} onPress={handleComment}>
          <MessageCircle size={20} color={Colors.textSecondary} />
          <Text style={styles.engagementText}>{formatNumber(post.comments)}</Text>
        </Pressable>

        <Pressable style={styles.engagementButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.textSecondary} />
          <Text style={styles.engagementText}>{formatNumber(post.shares)}</Text>
        </Pressable>

        {post.youtubeId && (
          <Pressable style={styles.watchButton} onPress={handleVideoPress}>
            <Text style={styles.watchButtonText}>Watch</Text>
            <ExternalLink size={14} color={Colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  creatorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },
  username: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: Colors.border,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  youtubeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  youtubeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    color: Colors.text,
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    marginBottom: 12,
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
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  engagementText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  watchButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  watchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
