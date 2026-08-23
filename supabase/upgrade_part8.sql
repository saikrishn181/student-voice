-- Migration: Part 8 - NSFW strikes & user ban suspension columns
-- Run in Supabase SQL editor if database was created prior to Part 8.

alter table public.profiles
  add column if not exists strike_count integer not null default 0,
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason text;
