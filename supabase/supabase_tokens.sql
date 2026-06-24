-- Run this in the Supabase SQL Editor

CREATE TABLE public.push_tokens (
    token text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own tokens (and anonymous users too, since token is primary key we just use upsert)
CREATE POLICY "Anyone can insert or update a token" ON public.push_tokens
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view and update their own token" ON public.push_tokens
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL);
