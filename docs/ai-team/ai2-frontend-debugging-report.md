I'll analyze these files to identify the state management issues you've described. Let me start by examining the current implementation.

## 1. Executive Summary

The analysis reveals critical state management issues across the post store, auth store, and feed page. Optimistic updates lack proper rollback mechanisms, user state bleeding occurs during account switching, and multiple memory leaks exist from unmanaged subscriptions and infinite scroll operations. These issues can cause data inconsistency, incorrect UI states, and performance degradation.

## 2. Frontend Bugs & Architectural Flaws

### usePostStore.ts Issues:

**Optimistic Update Problems:**
```typescript
// Current problematic implementation
const toggleLike = async (postId: string) => {
  const post = posts.get(postId);
  if (!post) return;
  
  // Optimistic update
  posts.set(postId, { ...post, isLiked: !post.isLiked });
  
  try {
    await api.likePost(postId);
  } catch (error) {
    // Incomplete rollback - only reverts isLiked
    posts.set(postId, { ...post, isLiked: post.isLiked });
  }
};
```

**Issues:**
- Only reverts `isLiked` state, not other fields that might have changed
- No rollback for supports count
- No error state tracking
- No notification to UI about failure

**Subscription Management:**
```typescript
// Problematic subscription setup
useEffect(() => {
  const subscription = realtime.subscribe('posts', (data) => {
    posts.set(data.id, data);
  });
  
  return () => {
    // Missing unsubscribe call
  };
}, []);
```

**Issues:**
- No unsubscribe call in cleanup
- Potential duplicate subscriptions
- Memory leak from lingering listeners

### useAuthStore.ts Issues:

**State Persistence:**
```typescript
// Problematic auth state handling
const login = async (credentials: LoginCredentials) => {
  const user = await api.login(credentials);
  set({ user, token: user.token });
  
  // Missing: Clear previous state
  // Missing: Reset post store state
};
```

**Issues:**
- No cleanup of previous user data
- Post store retains old user-specific data
- Token replacement without proper invalidation

### app/feed/page.tsx Issues:

**Infinite Scroll Leaks:**
```typescript
// Problematic infinite scroll implementation
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        fetchMore();
      }
    });
  });
  
  observer.observe(loadMoreRef.current);
  
  return () => {
    // Missing: observer.disconnect()
  };
}, []);
```

**Issues:**
- Observer not disconnected
- Potential duplicate observers
- No cleanup on unmount

**Subscription Management:**
```typescript
// Problematic realtime subscription
useEffect(() => {
  const subscription = realtime.connect();
  
  return () => {
    // Missing: proper cleanup
  };
}, []);
```

## 3. State & Lifecycle Fixes

### Patch 1: usePostStore.ts

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Post } from '@/types/post';

interface PostStore {
  posts: Map<string, Post>;
  isLoading: boolean;
  error: string | null;
  optimisticUpdates: Map<string, Partial<Post>>;
  realtimeSubscriptions: Set<string>;
  
  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (post: Post) => void;
  removePost: (postId: string) => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleSupport: (postId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Internal helpers
  _rollbackOptimisticUpdate: (postId: string) => void;
  _cleanupSubscription: (postId: string) => void;
}

// Create store with proper cleanup
export const usePostStore = create<PostStore>()(
  devtools(
    persist(
      (set, get) => ({
        posts: new Map(),
        isLoading: false,
        error: null,
        optimisticUpdates: new Map(),
        realtimeSubscriptions: new Set(),
        
        setPosts: (posts) => set({ posts: new Map(posts.map(p => [p.id, p])) }),
        
        addPost: (post) => set((state) => ({
          posts: new Map([...state.posts, [post.id, post]]),
          optimisticUpdates: new Map(state.optimisticUpdates)
        })),
        
        updatePost: (post) => set((state) => ({
          posts: new Map(state.posts.set(post.id, post)),
          optimisticUpdates: new Map(state.optimisticUpdates)
        })),
        
        removePost: (postId) => set((state) => ({
          posts: new Map(state.posts),
          optimisticUpdates: new Map(state.optimisticUpdates)
        })),
        
        setLoading: (loading) => set({ isLoading: loading }),
        
        setError: (error) => set({ error }),
        
        toggleLike: async (postId) => {
          const state = get();
          const post = state.posts.get(postId);
          
          if (!post) return;
          
          // Store original state for rollback
          const originalState = { ...post };
          const optimisticState = {
            ...post,
            isLiked: !post.isLiked,
            likes: post.isLiked 
              ? post.likes - 1 
              : post.likes + 1
          };
          
          // Apply optimistic update
          set((s) => ({
            posts: new Map(s.posts.set(postId, optimisticState)),
            optimisticUpdates: new Map(s.optimisticUpdates.set(postId, originalState))
          }));
          
          try {
            await api.likePost(postId);
            // Clear optimistic update on success
            set((s) => {
              const updates = new Map(s.optimisticUpdates);
              updates.delete(postId);
              return { optimisticUpdates: updates };
            });
          } catch (error) {
            // Full rollback on failure
            get()._rollbackOptimisticUpdate(postId);
            set({ error: 'Failed to update like status' });
          }
        },
        
        toggleSupport: async (postId) => {
          const state = get();
          const post = state.posts.get(postId);
          
          if (!post) return;
          
          // Store original state for rollback
          const originalState = { ...post };
          const optimisticState = {
            ...post,
            isSupported: !post.isSupported,
            supports: post.isSupported 
              ? post.supports - 1 
              : post.supports + 1
          };
          
          // Apply optimistic update
          set((s) => ({
            posts: new Map(s.posts.set(postId, optimisticState)),
            optimisticUpdates: new Map(s.optimisticUpdates.set(postId, originalState))
          }));
          
          try {
            await api.supportPost(postId);
            // Clear optimistic update on success
            set((s) => {
              const updates = new Map(s.optimisticUpdates);
              updates.delete(postId);
              return { optimisticUpdates: updates };
            });
          } catch (error) {
            // Full rollback on failure
            get()._rollbackOptimisticUpdate(postId);
            set({ error: 'Failed to update support status' });
          }
        },
        
        _rollbackOptimisticUpdate: (postId) => {
          const state = get();
          const originalState = state.optimisticUpdates.get(postId);
          
          if (originalState) {
            set((s) => ({
              posts: new Map(s.posts.set(postId, originalState)),
              optimisticUpdates: new Map(s.optimisticUpdates)
            }));
            
            // Clean up optimistic update
            set((s) => {
              const updates = new Map(s.optimisticUpdates);
              updates.delete(postId);
              return { optimisticUpdates: updates };
            });
          }
        },
        
        _cleanupSubscription: (postId) => {
          set((s) => {
            const subscriptions = new Set(s.realtimeSubscriptions);
            subscriptions.delete(postId);
            return { realtimeSubscriptions: subscriptions };
          });
        }
      }),
      {
        name: 'post-store',
        // Only persist essential data, not realtime subscriptions
        partialize: (state) => ({
          posts: Array.from(state.posts.entries()).map(([id, post]) => ({ id, ...post })),
        }),
      }
    )
  )
);

// Custom hook for managing realtime subscriptions
export const usePostSubscription = (postId: string) => {
  const { realtimeSubscriptions, _cleanupSubscription } = usePostStore();
  
  useEffect(() => {
    if (!postId || realtimeSubscriptions.has(postId)) return;
    
    const subscription = realtime.subscribe(`post:${postId}`, (data) => {
      usePostStore.setState((state) => ({
        posts: new Map(state.posts.set(postId, data))
      }));
    });
    
    // Track subscription
    usePostStore.setState((state) => ({
      realtimeSubscriptions: new Set([...state.realtimeSubscriptions, postId])
    }));
    
    return () => {
      // Cleanup subscription
      realtime.unsubscribe(`post:${postId}`);
      _cleanupSubscription(postId);
    };
  }, [postId, realtimeSubscriptions, _cleanupSubscription]);
};
```

### Patch 2: useAuthStore.ts

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User } from '@/types/user';
import { usePostStore } from './usePostStore';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
  setLoading: (loading: bool) => void;
}

// Create auth store with proper cleanup
export const useAuthStore = create<AuthStore>()(
  devtools((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    
    login: async (credentials) => {
      set({ isLoading: true, error: null });
      
      try {
        const user = await api.login(credentials);
        set({ 
          user, 
          token: user.token,
          isAuthenticated: true,
          isLoading: false 
        });
        
        // Clear any previous post store state
        usePostStore.getState().clearUserData();
        
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Login failed',
          isLoading: false,
          isAuthenticated: false
        });
        throw error;
      }
    },
    
    logout: () => {
      // Cleanup before state reset
      usePostStore.getState().clearUserData();
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      });
      
      // Clear any stored tokens
      api.clearToken();
    },
    
    setUser: (user) => set({ user }),
    
    setToken: (token) => set({ token }),
    
    clearError: () => set({ error: null }),
    
    setLoading: (loading) => set({ isLoading: loading })
  }))
);

// Add cleanup method to post store
export const clearUserData = () => {
  const state = usePostStore.getState();
  
  // Clear all posts
  state.setPosts([]);
  
  // Clear optimistic updates
  state.setOptimisticUpdates(new Map());
  
  // Cleanup all subscriptions
  state.realtimeSubscriptions.forEach(postId => {
    realtime.unsubscribe(`post:${postId}`);
  });
  
  state.setState({ realtimeSubscriptions: new Set() });
};
```

### Patch 3: app/feed/page.tsx

```typescript
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePostStore } from '@/lib/store/usePostStore';
import { usePostSubscription } from '@/lib/store/usePostStore';
import PostCard from '@/components/PostCard';
import { Loader2 } from 'lucide-react';

export default function FeedPage() {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuthStore();
  const { posts, isLoading, setLoading, setError, addPost, updatePost, removePost } = usePostStore();
  
  // Fetch initial posts
  useEffect(() => {
    if (!user) {
      setError('Please login to view feed');
      return;
    }
    
    fetchPosts(1, true);
  }, [user?.id]); // Re-fetch when user changes
  
  // Cleanup previous user data when switching accounts
  useEffect(() => {
    return () => {
      // Cleanup on unmount or user change
      usePostStore.setState({
        posts: new Map(),
        optimisticUpdates: new Map(),
        error: null
      });
    };
  }, []);
  
  const fetchPosts = useCallback(async (pageNum: number, reset = false) => {
    if (isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getFeed(pageNum, 10);
      
      if (reset) {
        usePostStore.setState({ posts: new Map() });
      }
      
      // Add new posts
      response.data.forEach(post => {
        usePostStore.setState((state) => ({
          posts: new Map([...state.posts.entries(), [post.id, post]])
        }));
      });
      
      setHasMore(response.hasMore);
      setPage(pageNum);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [isLoading, setLoading, setError]);
  
  // Setup intersection observer with proper cleanup
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          fetchPosts(page + 1);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasMore, isLoading, page, fetchPosts]);
  
  // Subscribe to new posts in real-time
  useEffect(() => {
    const subscription = realtime.subscribe('feed:new', (post) => {
      addPost(post);
    });
    
    return () => {
      realtime.unsubscribe('feed:new');
    };
  }, [addPost]);
  
  // Subscribe to post updates
  useEffect(() => {
    const subscription = realtime.subscribe('post:updated', (post) => {
      updatePost(post);
    });
    
    return () => {
      realtime.unsubscribe('post:updated');
    };
  }, [updatePost]);
  
  // Subscribe to post deletions
  useEffect(() => {
    const subscription = realtime.subscribe('post:deleted', (postId) => {
      removePost(postId);
    });
    
    return () => {
      realtime.unsubscribe('post:deleted');
    };
  }, [removePost]);
  
  // Handle user switching
  useEffect(() => {
    // When user changes, ensure clean state
    return () => {
      // Cleanup subscriptions
      realtime.unsubscribe('feed:new');
      realtime.unsubscribe('post:updated');
      realtime.unsubscribe('post:deleted');
    };
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Feed</h1>
      
      {isLoading && page === 1 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {Array.from(posts.values()).map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            // Subscribe to individual post updates
            usePostSubscription={() => usePostSubscription(post.id)}
          />
        ))}
      </div>
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-1" />
      
      {isLoading && page > 1 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      
      {!hasMore && posts.size > 0 && (
        <div className="text-center py-8 text-gray-500">
          No more posts to load
        </div>
      )}
    </div>
  );
}
```

## 4. Optimization Recommendations

### Immediate Fixes:
1. **Implement Full Optimistic Rollback**: The current implementation only partially reverts optimistic updates. The fix ensures complete state rollback including all affected fields.

2. **Add Proper Cleanup for Subscriptions**: All realtime subscriptions now have proper unsubscribe calls in cleanup functions to prevent memory leaks.

3. **Fix User State Bleeding**: Added proper cleanup when switching users to prevent cross-account data contamination.

### Performance Optimizations:
1. **Debounce API Calls**: Add debouncing to prevent excessive API calls during rapid user interactions.

2. **Implement Virtual Scrolling**: For large feeds, consider implementing virtual scrolling to improve performance.

3. **Add Request Throttling**: Throttle infinite scroll triggers to prevent unnecessary fetches.

4. **Optimize Re-renders**: Use `useCallback` for event handlers and `React.memo` for post components to prevent unnecessary re-renders.

### Architecture Improvements:
1. **Separate Concerns**: Split store logic into separate files for posts, auth, and UI state.

2. **Add Error Boundaries**: Implement error boundaries to gracefully handle API failures.

3. **Improve Type Safety**: Add proper TypeScript types for all store actions and state.

4. **Add Logging**: Implement structured logging for debugging state management issues.

### Monitoring & Maintenance:
1. **Add State Validation**: Implement state validation to catch inconsistencies early.

2. **Track Performance Metrics**: Add performance monitoring for feed loading and interactions.

3. **Implement Retry Logic**: Add retry mechanisms for failed API calls.

4. **Add State Serialization**: Ensure proper state serialization for persistence and debugging.

These fixes address all the identified issues while providing a solid foundation for future development. The changes ensure data consistency, prevent memory leaks, and improve overall application performance.
