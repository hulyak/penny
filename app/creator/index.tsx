import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Filter } from 'lucide-react-native';
import Colors from '@/constants/colors';
import FeedPostCard, { FeedPost } from '@/components/ui/FeedPostCard';
import CreatorProfileHeader from '@/components/ui/CreatorProfileHeader';
import haptics from '@/lib/haptics';

// Mock data - replace with real API calls
const MOCK_CREATOR = {
  name: 'VisualEconomik',
  username: 'visualeconomik',
  avatar: 'https://via.placeholder.com/150',
  bio: 'Financial educator helping you build wealth through smart investing. 📈 Market analysis, portfolio strategies, and investment insights.',
  followers: '125K',
  performance: '+32.5%',
  verified: true,
};

const MOCK_POSTS: FeedPost[] = [
  {
    id: '1',
    creator: {
      name: 'VisualEconomik',
      username: 'visualeconomik',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
    type: 'video',
    content: 'Why I\'m buying more tech stocks this week 📈 The market is showing strong signals for a recovery. Here\'s my analysis...',
    thumbnail: 'https://via.placeholder.com/400x250',
    likes: 1243,
    comments: 87,
    shares: 34,
    timestamp: '2h ago',
    isLiked: false,
  },
  {
    id: '2',
    creator: {
      name: 'VisualEconomik',
      username: 'visualeconomik',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
    type: 'text',
    content: '🚨 Market Update: Fed decision coming tomorrow. Here\'s what I\'m watching:\n\n• Interest rate decision\n• Powell\'s press conference\n• Market reaction\n\nStay tuned for my live analysis!',
    likes: 892,
    comments: 56,
    shares: 28,
    timestamp: '5h ago',
    isLiked: true,
  },
  {
    id: '3',
    creator: {
      name: 'VisualEconomik',
      username: 'visualeconomik',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
    type: 'video',
    content: 'Portfolio Review: How I\'m positioned for Q2 2026. Sharing my complete strategy and top picks 💼',
    thumbnail: 'https://via.placeholder.com/400x250',
    likes: 2156,
    comments: 143,
    shares: 67,
    timestamp: '1d ago',
    isLiked: false,
  },
  {
    id: '4',
    creator: {
      name: 'VisualEconomik',
      username: 'visualeconomik',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
    type: 'text',
    content: 'Quick tip: Don\'t panic sell during market dips. That\'s when the real opportunities appear. 💎🙌\n\nI\'ve been through 3 major corrections and this is what I learned...',
    likes: 1567,
    comments: 98,
    shares: 45,
    timestamp: '2d ago',
    isLiked: false,
  },
];

export default function CreatorHubScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  const handleLike = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleComment = (postId: string) => {
    // Navigate to comment screen or open modal
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId: string) => {
    // Open share sheet
    console.log('Share post:', postId);
  };

  const handlePostPress = (postId: string) => {
    // Navigate to post detail
    console.log('View post:', postId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            haptics.lightTap();
            router.back();
          }}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Creator Hub</Text>
        <Pressable
          style={styles.filterButton}
          onPress={() => {
            haptics.lightTap();
          }}
        >
          <Filter size={24} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Creator Profile */}
        <CreatorProfileHeader
          name={MOCK_CREATOR.name}
          username={MOCK_CREATOR.username}
          avatar={MOCK_CREATOR.avatar}
          bio={MOCK_CREATOR.bio}
          followers={MOCK_CREATOR.followers}
          performance={MOCK_CREATOR.performance}
          verified={MOCK_CREATOR.verified}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
        />

        {/* Feed Title */}
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Latest Posts</Text>
          <Text style={styles.feedSubtitle}>{posts.length} posts</Text>
        </View>

        {/* Feed Posts */}
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            onLike={() => handleLike(post.id)}
            onComment={() => handleComment(post.id)}
            onShare={() => handleShare(post.id)}
            onPress={() => handlePostPress(post.id)}
          />
        ))}

        {/* Load More */}
        <Pressable style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More Posts</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  feedSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadMoreButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
