-- ============================================================
-- KRANTIND 100% FAIL-SAFE CLEAN PURGE SCRIPT
-- Safely wipes all users, posts, chats, and notifications
-- even if some optional tables do not exist in your schema.
-- ============================================================

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'public.chat_typing',
        'public.messages',
        'public.conversation_participants',
        'public.conversations',
        'public.poll_votes',
        'public.post_rsvps',
        'public.post_saves',
        'public.post_supports',
        'public.comments',
        'public.reports',
        'public.blocks',
        'public.notifications',
        'public.notification_preferences',
        'public.follow_requests',
        'public.follows',
        'public.user_strikes',
        'public.college_verifications',
        'public.posts',
        'public.profiles'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        IF to_regclass(t) IS NOT NULL THEN
            EXECUTE 'TRUNCATE TABLE ' || t || ' CASCADE;';
        END IF;
    END LOOP;
END $$;

-- Delete all authentication users & identities
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.users;

-- Verification check: shows remaining count (0)
SELECT 'profiles' AS "Table", count(*) AS "Remaining Rows" FROM public.profiles
UNION ALL SELECT 'posts', count(*) FROM public.posts
UNION ALL SELECT 'comments', count(*) FROM public.comments
UNION ALL SELECT 'auth_users', count(*) FROM auth.users;