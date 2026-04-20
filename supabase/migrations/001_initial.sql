-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  file_name text not null,
  file_type text not null,
  row_count integer not null default 0,
  column_count integer not null default 0,
  analytics_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Uploads table
create table public.uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  row_count integer not null default 0,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.uploads enable row level security;

create policy "Users can view own uploads"
  on public.uploads for select using (auth.uid() = user_id);

create policy "Users can insert own uploads"
  on public.uploads for insert with check (auth.uid() = user_id);

-- Usage logs table
create table public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null check (action in ('upload', 'export_pdf', 'export_excel', 'insight_view')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.usage_logs enable row level security;

create policy "Users can view own usage"
  on public.usage_logs for select using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on public.usage_logs for insert with check (auth.uid() = user_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_uploads_user_id on public.uploads(user_id);
create index idx_uploads_created_at on public.uploads(user_id, created_at);
create index idx_usage_logs_user_action on public.usage_logs(user_id, action, created_at);
