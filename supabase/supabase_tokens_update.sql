-- Run this in the Supabase SQL Editor to add the home_district column
ALTER TABLE public.push_tokens 
ADD COLUMN IF NOT EXISTS home_district text;
