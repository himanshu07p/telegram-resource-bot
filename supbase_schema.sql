-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create table for files
create table public.files (
  id uuid primary key default uuid_generate_v4(),
  telegram_file_id text not null,
  file_name text,
  title text,
  category text, -- 'Book', 'Personal Notes', 'PYQs/Exams', 'Other'
  subject text, -- Gets mapped from 'genre' as well
  year int,
  edition text,
  semester text,
  summary text,
  storage_path text not null, -- Path in Supabase Storage
  page_count int,
  file_size int,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security) - Optional but recommended
alter table public.files enable row level security;

-- Create policy to allow read access (adjust as needed, e.g., restrict to specific users)
create policy "Public Read Access" on public.files for select using (true);
create policy "Bot Write Access" on public.files for insert with check (true);

-- Create storage bucket 'documents' if it doesn't exist
-- Note: You usually do this in the Supabase Dashboard -> Storage
-- Make sure the bucket is public or you handle signed URLs correctly.

-- Create table for users
create table public.users (
  id bigint primary key, -- Telegram User ID
  username text,
  first_name text,
  last_name text,
  is_bot boolean default false,
  language_code text,
  is_authenticated boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for users
alter table public.users enable row level security;
create policy "Bot Full Access" on public.users for all using (true) with check (true);

-- Create table for user states (upload flow state machine)
create table public.user_states (
  user_id bigint primary key,
  state text default 'IDLE', -- 'IDLE', 'AWAITING_METADATA'
  pending_file_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for user_states
alter table public.user_states enable row level security;
create policy "Bot Full Access" on public.user_states for all using (true) with check (true);
