import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Filter } from 'lucide-react-native';
import Colors from '@/constants/colors';
import FeedPostCard, { FeedPost } from '@/components/ui/FeedPostCard';
import CreatorProfileHeader from '@/components/ui/CreatorProfileHeader';
import haptics from '@/lib/haptics';

const LIKED_POSTS_KEY = 'penny_liked_posts';

// Real VisualPolitik EN YouTube channel data
const MOCK_CREATOR = {
  name: 'VisualPolitik EN',
  username: 'VisualPolitikEN',
  avatar: require('@/assets/images/visualpolitik-logo.jpg'),
  bio: 'The channel that explains the most fascinating stories of geopolitics, economy and finance! Complex topics made simple.',
  followers: '2.8M',
  performance: '+32.5%',
  verified: true,
  youtubeChannel: 'https://www.youtube.com/@VisualPolitikEN',
  totalVideos: '850+',
};

// Real VisualEconomik EN YouTube videos with actual video IDs
const MOCK_POSTS: FeedPost[] = [
  {
    id: '1',
    creator: {
      name: 'VisualPolitik EN',
      username: 'VisualPolitikEN',
      avatar: require('@/assets/images/visualpolitik-logo.jpg'),
      verified: true,
    },
    type: 'video',
    content: 'Why the World\'s Biggest Economy is in BIG Trouble',
    youtubeId: 'PHe0bXAIuk0',
    thumbnail: require('@/assets/images/video-thumb-argentina.png'),
    duration: '15:23',
    views: '2.1M',
    likes: 52000,
    comments: 3245,
    shares: 890,
    timestamp: '2d ago',
    isLiked: false,
  },
  {
    id: '2',
    creator: {
      name: 'VisualPolitik EN',
      username: 'VisualPolitikEN',
      avatar: require('@/assets/images/visualpolitik-logo.jpg'),
      verified: true,
    },
    type: 'video',
    content: 'Why China\'s Economy is Failing',
    youtubeId: 'vTJGHwLmv9Q',
    thumbnail: require('@/assets/images/video-thumb-china.png'),
    duration: '18:45',
    views: '3.5M',
    likes: 89000,
    comments: 5432,
    shares: 1560,
    timestamp: '1w ago',
    isLiked: true,
  },
  {
    id: '3',
    creator: {
      name: 'VisualPolitik EN',
      username: 'VisualPolitikEN',
      avatar: require('@/assets/images/visualpolitik-logo.jpg'),
      verified: true,
    },
    type: 'video',
    content: 'How Europe is Shooting Itself in the Foot',
    youtubeId: 'bDH7BFeJ0qM',
    thumbnail: require('@/assets/images/video-thumb-europe.png'),
    duration: '21:12',
    views: '4.2M',
    likes: 112000,
    comments: 6567,
    shares: 2340,
    timestamp: '2w ago',
    isLiked: false,
  },
  {
    id: '4',
    creator: {
      name: 'VisualPolitik EN',
      username: 'VisualPolitikEN',
      avatar: require('@/assets/images/visualpolitik-logo.jpg'),
      verified: true,
    },
    type: 'video',
    content: 'Why Germany\'s Economy Is Failing',
    youtubeId: 'SfsCniN7Nsc',
    thumbnail: require('@/assets/images/video-thumb-germany.png'),
    duration: '17:34',
    views: '5.1M',
    likes: 145000,
    comments: 8900,
    shares: 4450,
    timestamp: '3w ago',
    isLiked: false,
  },
  {
    id: '5',
    creator: {
      name: 'VisualPolitik EN',
      username: 'VisualPolitikEN',
      avatar: require('@/assets/images/visualpolitik-logo.jpg'),
      verified: true,
    },
    type: 'video',
    content: 'AI in Trouble: Is the Electricity Running Out?',
    youtubeId: 'vg-WOmV8J40',
    thumbnail: require('@/assets/images/video-thumb-ai.png'),
    duration: '19:56',
    views: '6.8M',
    likes: 182000,
    comments: 12430,
    shares: 5670,
    timestamp: '1mo ago',
    isLiked: false,
  },
];

export default function CreatorHubScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);

  // Load persisted likes on mount
  useEffect(() => {
    loadLikedPosts();
  }, []);

  const loadLikedPosts = async () => {
    try {
      const stored = await AsyncStorage.getItem(LIKED_POSTS_KEY);
      if (stored) {
        const likedIds: string[] = JSON.parse(stored);
        setPosts((prev) =>
          prev.map((post) => ({
            ...post,
            isLiked: likedIds.includes(post.id),
          }))
        );
      }
    } catch (err) {
      // Ignore
    }
  };

  const saveLikedPosts = async (updatedPosts: FeedPost[]) => {
    try {
      const likedIds = updatedPosts.filter((p) => p.isLiked).map((p) => p.id);
      await AsyncStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(likedIds));
    } catch (err) {
      // Ignore
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLikedPosts();
    setRefreshing(false);
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    haptics.lightTap();
  };

  const handleLike = (postId: string) => {
    const updatedPosts = posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          }
        : post
    );
    setPosts(updatedPosts);
    saveLikedPosts(updatedPosts);
  };

  const handleComment = (postId: string) => {
    // Open the YouTube video so user can comment there
    const post = posts.find((p) => p.id === postId);
    if (post?.youtubeId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${post.youtubeId}`);
    }
  };

  const handleShare = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const url = post.youtubeId
      ? `https://www.youtube.com/watch?v=${post.youtubeId}`
      : `https://www.youtube.com/@VisualPolitikEN`;

    try {
      await Share.share({
        message: `Check out "${post.content}" by ${post.creator.name} ${url}`,
        url,
      });
    } catch (err) {
      // User cancelled or share failed
    }
  };

  const handlePostPress = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post?.youtubeId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${post.youtubeId}`);
    }
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
          youtubeChannel={MOCK_CREATOR.youtubeChannel}
          totalVideos={MOCK_CREATOR.totalVideos}
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
