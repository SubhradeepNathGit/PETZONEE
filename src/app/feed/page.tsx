'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/sidebar';
import { toast } from 'react-toastify';

type Role = 'admin' | 'vet' | 'user' | 'none' | 'loading';
type Activity = {
  id: number;
  actor_id: string;
  verb: string;
  subject_type: string;
  subject_id: string;
  summary: string;
  diff: Record<string, unknown>;
  photo_url: string | null;
  visibility: 'owner_only' | 'public';
  owner_id: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
  user_name?: string | null;
  actor_profiles?: { first_name: string | null; avatar_url: string | null } | null;
};
type ActivityComment = {
  id: number;
  activity_id: number;
  user_id: string;
  body: string;
  created_at: string;
  parent_id?: number | null;
  user_profiles?: { first_name: string | null; avatar_url: string | null };
};
type SidebarItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  icon?: React.ReactNode;
};

const PAGE = 20;

function FeedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('loading');
  const [firstName, setFirstName] = useState('');
  const [vetName, setVetName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [vetAvatar, setVetAvatar] = useState<string | null>(null);
  const [notiCount, setNotiCount] = useState(0);
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openThreads, setOpenThreads] = useState<Record<number, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Like & Comment states
  const [likes, setLikes] = useState<Record<number, number>>({});
  const [userLiked, setUserLiked] = useState<Record<number, boolean>>({});
  const [comments, setComments] = useState<Record<number, ActivityComment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});

  const loadMyPets = useCallback(() => router.push('/pets'), [router]);

  const getSidebarItems = useCallback(
    (r: Role, count: number): SidebarItem[] => {
      const baseItems = {
        vet: [
          { label: 'Dashboard', href: '/dashboard', icon: <IconHome /> },
          { label: 'Appointments', href: '/appointments', icon: <IconCalendar /> },
          { label: 'Patients', href: '/patients', icon: <IconUsers /> },
          { label: 'Profile', href: '/settings/profile', icon: <IconUser /> },
          { label: 'Notifications', href: '/notifications', badge: count, icon: <IconBell /> },
        ],
        admin: [
          { label: 'Dashboard', href: '/admin', icon: <IconHome /> },
          { label: 'Analytics', href: '/admin/analytics', icon: <IconChart /> },
          { label: 'KYC Review', href: '/admin/kyc', icon: <IconShield /> },
          { label: 'Products', href: '/admin/products', icon: <IconPackage /> },
          { label: 'Orders', href: '/admin/orders', icon: <IconShoppingBag /> },
          { label: 'Profile', href: '/settings/profile', icon: <IconUser /> },
        ],
        user: [
          { label: 'Home', href: '/feed', icon: <IconHome /> },
          { label: 'Discover', href: '/discover', icon: <IconCompass /> },
          { label: 'Create', href: '/create', icon: <IconPlus /> },
          { label: 'My Pets', onClick: loadMyPets, icon: <IconHeart /> },
          { label: 'Profile', href: '/settings/profile', icon: <IconUser /> },
          { label: 'Cart', href: '/cart', icon: <IconShoppingBag /> },
          { label: 'Orders', href: '/orders', icon: <IconPackage /> },
        ],
      } as const;
      return r === 'vet' ? baseItems.vet.slice() : r === 'admin' ? baseItems.admin.slice() : baseItems.user.slice();
    },
    [loadMyPets]
  );

  const initializeUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setRole('none');
        return;
      }
      setMeId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setRole('user');
        return;
      }

      if (profile) {
        const userRole = (profile.role as Role) || 'user';
        setRole(userRole);
        setFirstName(profile.first_name ?? '');
        setProfileAvatar(profile.avatar_url ?? null);

        if (userRole === 'vet') {
          const { data: vetProfile } = await supabase
            .from('vets')
            .select('name, avatar_url, unread_notifications')
            .eq('id', user.id)
            .maybeSingle();
          if (vetProfile) {
            setVetName(vetProfile.name ?? '');
            setVetAvatar(vetProfile.avatar_url ?? null);
            setNotiCount(vetProfile.unread_notifications ?? 0);
          }
        } else {
          const { data: userNotifications } = await supabase
            .from('users')
            .select('unread_notifications')
            .eq('id', user.id)
            .maybeSingle();
          if (userNotifications) setNotiCount(userNotifications.unread_notifications ?? 0);
        }
      } else setRole('user');
    } catch (error) {
      console.error('Initialize user error:', error);
      setRole('user');
    }
  }, []);

  // Load likes for all activities
  useEffect(() => {
    async function fetchLikes() {
      const { data, error } = await supabase.from('activity_likes').select('*');
      if (!error && data) {
        const counts: Record<number, number> = {};
        const liked: Record<number, boolean> = {};
        data.forEach((like) => {
          counts[like.activity_id] = (counts[like.activity_id] || 0) + 1;
          if (like.user_id === meId) liked[like.activity_id] = true;
        });
        setLikes(counts);
        setUserLiked(liked);
      }
    }
    if (meId) fetchLikes();
  }, [meId]);

  // Load comments
  useEffect(() => {
    async function fetchComments() {
      const { data, error } = await supabase.from('activity_comments').select('*');
      if (!error && data) {
        const rawComments = data as ActivityComment[];
        const userIds = [...new Set(rawComments.map((c) => c.user_id))];

        const { data: profiles } = await supabase
          .from('users')
          .select('id, first_name, avatar_url')
          .in('id', userIds);

        const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

        const grouped: Record<number, ActivityComment[]> = {};
        rawComments.forEach((c) => {
          if (!grouped[c.activity_id]) grouped[c.activity_id] = [];
          grouped[c.activity_id].push({
            ...c,
            user_profiles: profileMap[c.user_id],
          });
        });
        setComments(grouped);
      }
    }
    fetchComments();
  }, []);

  // Toggle Like
  const handleLike = async (activityId: number) => {
    if (!meId) { toast.warning('Please sign in first'); return; }

    if (userLiked[activityId]) {
      // Unlike
      await supabase
        .from('activity_likes')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', meId);
      setUserLiked({ ...userLiked, [activityId]: false });
      setLikes({ ...likes, [activityId]: (likes[activityId] || 1) - 1 });
    } else {
      // Like
      await supabase.from('activity_likes').insert([
        { activity_id: activityId, user_id: meId },
      ]);
      setUserLiked({ ...userLiked, [activityId]: true });
      setLikes({ ...likes, [activityId]: (likes[activityId] || 0) + 1 });
    }
  };

  // Add new comment
  const handleAddComment = async (activityId: number, parentId: number | null = null) => {
    if (!meId) { toast.warning('Please sign in first'); return; }
    const text = newComment[activityId]?.trim();
    if (!text) return;

    const { data, error } = await supabase
      .from('activity_comments')
      .insert([{
        activity_id: activityId,
        user_id: meId,
        body: text,
        parent_id: parentId
      }])
      .select();

    if (error) {
      console.error('Add comment error:', error);
      toast.error(`Error: ${error.message || 'Failed to add comment'}. Did you run the SQL command?`);
      return;
    }

    if (data) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, avatar_url')
        .eq('id', meId)
        .maybeSingle();

      const commentWithProfile = {
        ...(data[0] as ActivityComment),
        user_profiles: userProfile,
      };

      setComments({
        ...comments,
        [activityId]: [...(comments[activityId] || []), commentWithProfile] as ActivityComment[],
      });
      setNewComment({ ...newComment, [activityId]: '' });
      toast.success('Comment added');
    }
  };

  const handleEditComment = async (activityId: number, commentId: number, newBody: string) => {
    if (!meId) return;
    const { error } = await supabase
      .from('activity_comments')
      .update({ body: newBody })
      .eq('id', commentId)
      .eq('user_id', meId);

    if (error) {
      toast.error('Failed to update comment');
      return;
    }

    setComments(prev => ({
      ...prev,
      [activityId]: prev[activityId].map(c => c.id === commentId ? { ...c, body: newBody } : c)
    }));
    toast.success('Comment updated');
  };

  const handleDeleteComment = async (activityId: number, commentId: number) => {
    if (!meId) return;
    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', meId);

    if (error) {
      toast.error('Failed to delete comment');
      return;
    }

    setComments(prev => ({
      ...prev,
      [activityId]: prev[activityId].filter(c => c.id !== commentId)
    }));
    toast.success('Comment deleted');
  };

  const loadMore = useCallback(
    async (reset = false, currentUserId: string | null = null) => {
      if (moreLoading) return;
      setMoreLoading(true);
      const from = reset ? 0 : items.length;
      const to = from + PAGE - 1;
      const userId = currentUserId || meId;

      let rows: Activity[] = [];

      // If reset and we have a highlight ID, fetch that post first
      if (reset && highlightId) {
        const { data: highlightPost } = await supabase
          .from('activities')
          .select('*')
          .eq('id', highlightId)
          .maybeSingle();
        if (highlightPost) rows.push(highlightPost as Activity);
      }

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('feed load error:', JSON.stringify(error, null, 2));
        setLoading(false);
        setMoreLoading(false);
        return;
      }

      if (data) {
        const fetchedRows = data as Activity[];
        // Filter out the highlight post if it was already fetched to avoid duplicates
        const filtered = fetchedRows.filter(r => r.id !== Number(highlightId));
        rows = [...rows, ...filtered];
      }

      if (rows.length > 0) {
        const actorIds = [...new Set(rows.map((r) => r.actor_id))];
        const { data: profiles } = await supabase
          .from('users')
          .select('id, first_name, avatar_url')
          .in('id', actorIds);

        const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

        rows = rows.map((r) => ({
          ...r,
          actor_profiles: profileMap[r.actor_id],
        }));

        const ids = rows.map((r) => r.id);

        const { data: likesData } = await supabase
          .from('activity_likes')
          .select('activity_id')
          .in('activity_id', ids);

        const { data: commentsData } = await supabase
          .from('activity_comments')
          .select('activity_id')
          .in('activity_id', ids);

        const likeCounts: Record<number, number> = {};
        (likesData ?? []).forEach((like) => {
          likeCounts[like.activity_id] = (likeCounts[like.activity_id] || 0) + 1;
        });

        const commentCounts: Record<number, number> = {};
        (commentsData ?? []).forEach((comment) => {
          commentCounts[comment.activity_id] = (commentCounts[comment.activity_id] || 0) + 1;
        });

        rows = rows.map((r) => ({
          ...r,
          likes_count: likeCounts[r.id] || 0,
          comments_count: commentCounts[r.id] || 0,
        }));

        if (userId) {
          const { data: myLikes } = await supabase
            .from('activity_likes')
            .select('activity_id')
            .eq('user_id', userId)
            .in('activity_id', ids);
          if (myLikes) {
            const liked = new Set(myLikes.map((l) => l.activity_id));
            rows = rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) }));
          }
        }
      }

      rows = rows.map(withSafeCounters);
      setItems(reset ? rows : [...items, ...rows]);
      setHasMore(rows.length === PAGE);
      setLoading(false);
      setMoreLoading(false);

      // If we have a highlight, try scrolling to it after a short delay
      if (reset && highlightId) {
        setTimeout(() => {
          const el = document.getElementById(`post-${highlightId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-gray-900');
            setTimeout(() => el.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-gray-900'), 3000);
          }
        }, 800);
      }
    },
    [moreLoading, items, meId, highlightId]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initializeUser();
    })();
    return () => {
      mounted = false;
    };
  }, [initializeUser]);

  useEffect(() => {
    if (!meId) return;
    let mounted = true;
    (async () => {
      if (mounted) await loadMore(true, meId);

      const chActivities = supabase
        .channel('rt_activities')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, async (payload) => {
          const row = payload.new as Activity;
          if (row.visibility === 'public' || row.owner_id === meId) {
            const { data: likesCount } = await supabase
              .from('activity_likes')
              .select('activity_id')
              .eq('activity_id', row.id);

            const { data: commentsCount } = await supabase
              .from('activity_comments')
              .select('activity_id')
              .eq('activity_id', row.id);

            const { data: actorProfile } = await supabase
              .from('users')
              .select('first_name, avatar_url')
              .eq('id', row.actor_id)
              .maybeSingle();

            const activityWithCounts = {
              ...row,
              actor_profiles: actorProfile,
              likes_count: likesCount?.length ?? 0,
              comments_count: commentsCount?.length ?? 0,
              liked_by_me: false,
            };

            setItems((prev: Activity[]) => (prev.some((p) => p.id === row.id) ? prev : [withSafeCounters(activityWithCounts), ...prev]));
          }
        })
        .subscribe();

      const chLikes = supabase
        .channel('rt_activity_likes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_likes' }, (payload) => {
          const r = (payload.new ?? payload.old) as { activity_id?: number; user_id?: string };
          const aId = r?.activity_id;
          if (!aId) return;

          if (payload.eventType === 'INSERT') {
            setLikes((prev) => ({ ...prev, [aId]: (prev[aId] || 0) + 1 }));
            if (r.user_id === meId) {
              setUserLiked((prev) => ({ ...prev, [aId]: true }));
            }
          } else if (payload.eventType === 'DELETE') {
            setLikes((prev) => ({ ...prev, [aId]: Math.max(0, (prev[aId] || 0) - 1) }));
            if (r.user_id === meId) {
              setUserLiked((prev) => ({ ...prev, [aId]: false }));
            }
          }
        })
        .subscribe();

      const chComments = supabase
        .channel('rt_activity_comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_comments' }, async (payload) => {
          const r = (payload.new ?? payload.old) as ActivityComment;
          const aId = r?.activity_id;
          if (!aId) return;

          if (payload.eventType === 'INSERT') {
            const { data: userProfile } = await supabase
              .from('users')
              .select('first_name, avatar_url')
              .eq('id', r.user_id)
              .maybeSingle();

            setComments((prev) => ({
              ...prev,
              [aId]: [...(prev[aId] || []), { ...r, user_profiles: userProfile } as ActivityComment],
            }));
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => ({
              ...prev,
              [aId]: (prev[aId] || []).filter((c) => c.id !== r.id),
            }));
          }
        })
        .subscribe();

      return () => {
        mounted = false;
        supabase.removeChannel(chActivities);
        supabase.removeChannel(chLikes);
        supabase.removeChannel(chComments);
      };
    })();
  }, [meId, loadMore]);

  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !moreLoading) loadMore(false);
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, moreLoading, loadMore]);

  const toggleThread = (aid: number) => setOpenThreads((prev) => ({ ...prev, [aid]: !prev[aid] }));

  const sidebar = (
    <Sidebar
      role={role === 'loading' || role === 'none' ? 'user' : role}
      name={role === 'vet' ? (vetName ? `Dr. ${vetName}` : 'Doctor') : firstName || 'User'}
      avatarUrl={(role === 'vet' ? vetAvatar : profileAvatar) || undefined}
    />
  );

  return (
    <div className="min-h-[100dvh] text-gray-100 bg-black/90">
      <div className="flex">
        <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 xl:w-72 bg-black/80 backdrop-blur-xl border-r border-gray-800 z-30">
          {sidebar}
        </aside>
        <main className="flex-1 flex flex-col min-h-screen lg:ml-64 xl:ml-72">
          <div className="relative w-full h-24 sm:h-32 md:h-40 mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-black/800 flex flex-col justify-center items-center text-center px-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Daily News Feed</h1>
              <p className="text-xs sm:text-sm text-gray-200 mt-3">Home / Profile / Feed</p>
            </div>
          </div>
          <div className="mx-auto max-w-xl w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-24">
            {loading ? (
              <SkeletonList />
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/70 backdrop-blur-sm p-6 sm:p-8 text-center shadow-sm">
                <IconHeart className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-100 mb-2">No posts yet</p>
                <p className="text-sm sm:text-base text-gray-400">Start following friends to see their posts here</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {items.map((a: Activity) => (
                  <FeedItem
                    key={a.id}
                    a={a}
                    meId={meId}
                    open={!!openThreads[a.id]}
                    likes={likes[a.id] || 0}
                    userLiked={userLiked[a.id] || false}
                    comments={comments[a.id] || []}
                    newComment={newComment[a.id] || ''}
                    onToggleLike={() => handleLike(a.id)}
                    onToggleComments={() => toggleThread(a.id)}
                    onCommentChange={(text) => setNewComment({ ...newComment, [a.id]: text })}
                    onAddComment={(pid) => handleAddComment(a.id, pid || null)}
                    onEditComment={(cid, text) => handleEditComment(a.id, cid, text)}
                    onDeleteComment={(cid) => handleDeleteComment(a.id, cid)}
                  />
                ))}
              </div>
            )}
            <div ref={loadMoreRef} className="h-12" />
            {hasMore && (
              <div className="flex justify-center py-4 sm:py-6">
                <Spinner show={moreLoading || loading} label={moreLoading ? 'Loading more…' : 'Loading…'} />
              </div>
            )}
          </div>
        </main>
      </div>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="backdrop-blur-xl bg-black/80 shadow-lg border-t border-gray-800 px-2 sm:px-4 py-2">
          <div className="flex justify-around">
            {getSidebarItems(role, notiCount)
              .slice(0, 5)
              .map((item, i) =>
                item.href ? (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex flex-col items-center py-2 px-2 sm:px-3 text-[10px] sm:text-[11px] font-medium text-gray-300 hover:text-white transition-colors relative"
                  >
                    {item.icon}
                    <span className="mt-1 truncate max-w-10 sm:max-w-12">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gray-700 text-white text-[9px] sm:text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-semibold">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="flex flex-col items-center py-2 px-2 sm:px-3 text-[10px] sm:text-[11px] font-medium text-gray-300 hover:text-white transition-colors relative"
                  >
                    {item.icon}
                    <span className="mt-1 truncate max-w-10 sm:max-w-12">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gray-700 text-white text-[9px] sm:text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-semibold">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                )
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

const withSafeCounters = (a: Activity): Activity => ({
  ...a,
  likes_count: a.likes_count ?? 0,
  comments_count: a.comments_count ?? 0,
  liked_by_me: a.liked_by_me ?? false,
});

const isPhotoVerb = (verb: string) =>
  verb === 'pet.media_added' ||
  verb === 'pet.cover_updated' ||
  verb === 'pet.avatar_updated' ||
  verb === 'pet.photo_updated' ||
  verb === 'user.avatar_updated';

const humanizeVerb = (a: Activity) => {
  if (a.summary) return a.summary;
  const map: Record<string, string> = {
    'pet.created': '🐾 Added a new furry friend',
    'pet.name_updated': '✏️ Gave their pet a new name',
    'pet.photo_updated': "📸 Updated their pet's photo",
    'pet.media_added': '📷 Shared a new photo',
    'pet.cover_updated': "🖼️ Updated their pet's cover photo",
    'pet.avatar_updated': "👤 Updated their pet's profile picture",
    'user.name_updated': '✨ Updated their name',
    'user.avatar_updated': '📸 Updated their profile picture',
  };
  return map[a.verb] ?? '📝 Made an update';
};

const shorten = (v: unknown, max = 40) => {
  if (!v) return '—';
  const s = String(v);
  if (s.startsWith('http')) return s.length > max ? s.slice(0, max) : s;
  return s.length > max ? s.slice(0, max) + '...' : s;
};

const timeAgo = (iso: string) => {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString();
};

function MiniImage({ url, label }: { url: string | null; label: string }) {
  const isImg = !!url && /(\.png|jpe?g|webp|gif|avif)$/i.test(url);
  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/70 p-2 shadow-sm">
      <p className="mb-2 text-xs font-semibold text-gray-200">{label}</p>
      <div className="relative h-32 w-full overflow-hidden rounded-md bg-gray-800">
        {isImg ? (
          <Image src={url as string} alt={label} fill sizes="200px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 p-2 text-center">
            {shorten(url)}
          </div>
        )}
      </div>
    </div>
  );
}

const DiffLabel = ({ field }: { field: string }) => (
  <p className="text-sm font-semibold text-gray-100 mb-2">
    Updated <span className="rounded-full bg-gray-700 text-white px-2 py-1 text-xs font-medium">{field}</span>
  </p>
);

const Spinner = ({ show, label }: { show: boolean; label?: string }) => {
  if (!show) return null;
  return (
    <div className="flex items-center gap-3 text-sm text-gray-300">
      <div className="h-6 w-6 rounded-full border-2 border-gray-700 border-t-gray-400 animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
};

function SkeletonList() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gray-800/70 rounded-xl border border-gray-700/50 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 sm:h-4 w-1/3 rounded bg-gray-700" />
              <div className="h-2.5 sm:h-3 w-1/4 rounded bg-gray-700" />
            </div>
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-700" />
          </div>
          <div className="px-3 sm:px-4 pb-3">
            <div className="h-3 sm:h-4 w-3/4 rounded bg-gray-700" />
          </div>
          <div className="aspect-square bg-gray-700" />
          <div className="p-3 sm:p-4 space-y-3">
            <div className="flex space-x-4 sm:space-x-6">
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-gray-700" />
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-gray-700" />
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-gray-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const IconArrow = ({ className = '' }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14m-6-6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    <circle cx="12" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const IconShare = ({ className = '' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconBookmark = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 8a6 6 0 1 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9Zm6 13a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.6" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 22a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 15l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconPackage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M3.27 6.96 12 12l8.73-5.04" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 22V12" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconWhatsApp = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const IconFacebook = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const IconInstagram = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const IconTwitter = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconLink = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconShoppingBag = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M6 2h12l2 7H4l2-7Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 9h18l-1 11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 9Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 13a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconCompass = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
    <path d="M16 8l-2.5 6.5L7 17l2.5-6.5L16 8Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconHeart = ({ className = '' }: { className?: string }) => (
  <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  </svg>
);

const IconHeartSolid = ({ className = '' }: { className?: string }) => (
  <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  </svg>
);

const IconChat = ({ className = '' }: { className?: string }) => (
  <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

function FeedItem({
  a,
  meId,
  open,
  likes,
  userLiked,
  comments,
  newComment,
  onToggleLike,
  onToggleComments,
  onCommentChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: {
  a: Activity;
  meId: string | null;
  open: boolean;
  likes: number;
  userLiked: boolean;
  comments: ActivityComment[];
  newComment: string;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (text: string) => void;
  onAddComment: (parentId?: number) => void;
  onEditComment: (commentId: number, text: string) => void;
  onDeleteComment: (commentId: number) => void;
}) {
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleShare = async (platform?: 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'copy') => {
    // Force production origin if available, otherwise fallback
    const origin = window.location.origin.includes('localhost') ? 'https://petzonee.vercel.app' : window.location.origin;
    const shareUrl = `${origin}/feed?id=${a.id}`;
    const shareText = `Check out this post on Petzonee: ${a.summary || 'Interesting activity!'}`;

    if (!platform && navigator.share) {
      try {
        await navigator.share({ title: 'Petzonee', text: shareText, url: shareUrl });
        return;
      } catch (err) { console.log('Native share failed:', err); }
    }

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'instagram') {
      navigator.clipboard.writeText(shareUrl);
      toast.info('Link copied! Open Instagram to share.');
      window.open('https://www.instagram.com/', '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
    setShowShareMenu(false);
  };

  const handleReply = (commentId: number, userName: string) => {
    setReplyingToId(commentId);
    onCommentChange(`@${userName} `);
    // Focus the input after state update
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const title = humanizeVerb(a);
  const isBeforeAfter =
    a.diff?.field === 'cover_url' ||
    a.diff?.field === 'avatar_url' ||
    a.verb === 'pet.photo_updated' ||
    a.verb === 'user.avatar_updated';

  const actorName = a.actor_profiles?.first_name || a.user_name || 'User';
  const rawName = a.actor_id === meId ? 'You' : actorName;
  const avatarUrl = a.actor_profiles?.avatar_url;
  const safeInitials = (actorName || 'U').slice(0, 1).toUpperCase();

  const handleLikeWithAnimation = () => {
    if (!userLiked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    onToggleLike();
  };

  return (
    <article id={`post-${a.id}`} className="bg-gray-800/70 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-gray-800/40 transition-shadow duration-300 overflow-hidden">
      <header className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-gray-700 p-0.5 flex-shrink-0">
            <div className="h-full w-full rounded-full overflow-hidden bg-gray-800">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-700 text-white text-xs sm:text-sm font-semibold">
                  {safeInitials}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-100 text-sm sm:text-base truncate">{rawName}</h3>
            <p className="text-xs sm:text-sm text-gray-400">{timeAgo(a.created_at)}</p>
          </div>
        </div>
        <button className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-full transition-colors text-gray-300 flex-shrink-0">
          <IconMore />
        </button>
      </header>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-gray-100 text-sm sm:text-base leading-relaxed">{title}</p>
      </div>
      {isBeforeAfter && a.diff ? (
        <div className="relative w-full">
          <div className="bg-gray-800/70 ">
            <div className="grid gap-3">
              <div className="relative w-full h-70 aspect-square ">
                <Image src={(a.diff.new as string) || "/placeholder.png"} alt="" fill className="object-cover" />
                {showHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <IconHeartSolid className="w-24 h-24 text-orange-500 animate-[pulse_1s_ease-in-out]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isPhotoVerb(a.verb) && a.photo_url ? (
        <div className="relative w-full aspect-square">
          <Image src={a.photo_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 600px" priority />
          {showHeartAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <IconHeartSolid className="w-24 h-24 text-orange-500 animate-[pulse_1s_ease-in-out]" />
            </div>
          )}
        </div>
      ) : a.diff?.field ? (
        <div className="mx-3 sm:mx-4 mb-3 rounded-lg bg-gray-800/70 p-3 border border-gray-700/50">
          <DiffLabel field={String(a.diff.field)} />
          <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm">
            <span className="truncate rounded-md bg-gray-900 px-2 py-1 text-gray-100 shadow-sm border border-gray-700/50">
              {shorten(a.diff.old)}
            </span>
            <IconArrow className="text-gray-400 flex-shrink-0" />
            <span className="truncate rounded-md bg-gray-900 px-2 py-1 text-gray-100 shadow-sm border border-gray-700/50">
              {shorten(a.diff.new)}
            </span>
          </div>
        </div>
      ) : null}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <button onClick={handleLikeWithAnimation} className="flex items-center space-x-1 sm:space-x-1.5 transition-all duration-200 active:scale-90">
              {userLiked ? (
                <IconHeartSolid className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500 animate-[heartbeat_0.3s_ease-in-out]" />
              ) : (
                <IconHeart className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-orange-400 transition-colors duration-200" />
              )}
              <span className="text-xs sm:text-sm font-medium text-gray-300 transition-all duration-200">{likes}</span>
            </button>
            <button
              onClick={onToggleComments}
              className="flex items-center space-x-1 sm:space-x-1.5 transition-transform active:scale-95"
            >
              <IconChat className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-gray-200" />
              <span className="text-xs sm:text-sm font-medium text-gray-300">{comments.length}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center space-x-1 transition-transform active:scale-95"
              >
                <IconShare className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-gray-200" />
              </button>

              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <IconWhatsApp className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <IconFacebook className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span>Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare('instagram')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <IconInstagram className="h-4 w-4 text-pink-500 group-hover:scale-110 transition-transform" />
                        <span>Instagram</span>
                      </button>
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <IconTwitter className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                        <span>Twitter (X)</span>
                      </button>
                      <div className="h-px bg-gray-800 my-1 mx-2" />
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <IconLink className="h-4 w-4 text-gray-400 group-hover:scale-110 transition-transform" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {a.subject_type === 'pet' && (
            <button className="transition-transform active:scale-95">
              <IconBookmark className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-gray-200" />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-700/30 bg-gray-900/10">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-xs sm:text-sm text-center py-4">No comments yet</p>
          ) : (
            <div className="space-y-4 py-2">
              {comments.filter(c => !c.parent_id).map((c) => {
                const isMyComment = c.user_id === meId;
                const cName = c.user_profiles?.first_name || 'User';
                const cAvatar = c.user_profiles?.avatar_url;
                const cInitials = cName.slice(0, 1).toUpperCase();
                const isEditing = editingCommentId === c.id;

                // Get replies for this comment
                const replies = comments.filter(r => r.parent_id === c.id);

                return (
                  <div key={c.id} className="space-y-3">
                    <div className="group flex items-start space-x-3">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-0.5">
                        {cAvatar ? (
                          <Image src={cAvatar} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-orange-500/20 text-[10px] font-bold text-orange-400">
                            {cInitials}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-white hover:text-gray-300 cursor-pointer">{cName}</span>
                          <span className="text-[10px] text-gray-500">{timeAgo(c.created_at)}</span>
                        </div>

                        {isEditing ? (
                          <div className="mt-1 flex flex-col space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-orange-500"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => { onEditComment(c.id, editText); setEditingCommentId(null); }}
                                className="text-[10px] font-bold text-blue-400"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="text-[10px] font-bold text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-200 mt-0.5 leading-snug">{c.body}</p>
                        )}

                        <div className="flex items-center space-x-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleReply(c.id, cName)}
                            className="text-[10px] font-bold text-gray-500 hover:text-gray-300"
                          >
                            Reply
                          </button>
                          {isMyComment && !isEditing && (
                            <>
                              <button
                                onClick={() => { setEditingCommentId(c.id); setEditText(c.body); }}
                                className="text-[10px] font-bold text-blue-500/80 hover:text-blue-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDeleteComment(c.id)}
                                className="text-[10px] font-bold text-red-500/80 hover:text-red-400"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Render Replies */}
                    {replies.length > 0 && (
                      <div className="ml-11 border-l border-gray-800 pl-4 space-y-4 pt-1">
                        {replies.map((r) => {
                          const isMyReply = r.user_id === meId;
                          const rName = r.user_profiles?.first_name || 'User';
                          const rAvatar = r.user_profiles?.avatar_url;
                          const rInitials = rName.slice(0, 1).toUpperCase();
                          const isEditingReply = editingCommentId === r.id;

                          return (
                            <div key={r.id} className="group flex items-start space-x-3">
                              <div className="relative h-6 w-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-0.5">
                                {rAvatar ? (
                                  <Image src={rAvatar} alt="" fill className="object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-orange-500/20 text-[8px] font-bold text-orange-400">
                                    {rInitials}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline space-x-2">
                                  <span className="text-xs font-bold text-white hover:text-gray-300 cursor-pointer">{rName}</span>
                                  <span className="text-[10px] text-gray-500">{timeAgo(r.created_at)}</span>
                                </div>

                                {isEditingReply ? (
                                  <div className="mt-1 flex flex-col space-y-2">
                                    <textarea
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-orange-500"
                                      rows={2}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => { onEditComment(r.id, editText); setEditingCommentId(null); }}
                                        className="text-[10px] font-bold text-blue-400"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingCommentId(null)}
                                        className="text-[10px] font-bold text-gray-400"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-200 mt-0.5 leading-snug">{r.body}</p>
                                )}

                                <div className="flex items-center space-x-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleReply(c.id, rName)}
                                    className="text-[10px] font-bold text-gray-500 hover:text-gray-300"
                                  >
                                    Reply
                                  </button>
                                  {isMyReply && !isEditingReply && (
                                    <>
                                      <button
                                        onClick={() => { setEditingCommentId(r.id); setEditText(r.body); }}
                                        className="text-[10px] font-bold text-blue-500/80 hover:text-blue-400"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => onDeleteComment(r.id)}
                                        className="text-[10px] font-bold text-red-500/80 hover:text-red-400"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {replyingToId && (
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] text-gray-500">
                Replying to <span className="text-orange-400 font-semibold">@{comments.find(c => c.id === replyingToId)?.user_profiles?.first_name || 'User'}</span>
              </span>
              <button
                onClick={() => setReplyingToId(null)}
                className="text-[10px] text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-3 border-t border-gray-700/30">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={replyingToId ? "Reply..." : "Add a comment..."}
                className="w-full bg-transparent text-xs sm:text-sm text-white focus:outline-none py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newComment.trim()) {
                    onAddComment(replyingToId || undefined);
                    setReplyingToId(null);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                onAddComment(replyingToId || undefined);
                setReplyingToId(null);
              }}
              disabled={!newComment.trim()}
              className="text-xs sm:text-sm font-bold text-blue-500 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      )}
      {a.subject_type === 'pet' && (
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-700/50">
          <Link
            href={`/pets/${a.subject_id}`}
            className="inline-flex items-center space-x-1 text-sm sm:text-base font-medium text-gray-400 hover:text-white transition-colors"
          >
            <span>View pet profile</span>
            <IconArrow className="h-3 w-3 sm:h-4 sm:w-4" />
          </Link>
        </div>
      )}
    </article>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-medium">Loading PETZONEE Feed...</div>}>
      <FeedPageContent />
    </Suspense>
  );
}