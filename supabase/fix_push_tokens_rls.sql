-- Run this in the Supabase SQL Editor to fix push_tokens RLS policies
-- The current policies block upsert operations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can insert or update a token" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can view and update their own token" ON public.push_tokens;

-- Create permissive policies that allow the app and the daily weather script to work
-- Allow anyone to INSERT a push token (app registers tokens)
CREATE POLICY "Allow insert push tokens" ON public.push_tokens
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to UPDATE push tokens (app upserts tokens)
CREATE POLICY "Allow update push tokens" ON public.push_tokens
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow anyone to SELECT push tokens (needed for the daily weather script via service key)
CREATE POLICY "Allow select push tokens" ON public.push_tokens
    FOR SELECT
    USING (true);

-- Verify: check that RLS is enabled and policies exist
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'push_tokens';
