-- Apply after the existing account_approval and feature migrations.
begin;
create table if not exists public.stream_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 media_type text not null check(media_type in ('movie','tv','anime')),
 media_id bigint not null check(media_id > 0), title text not null check(length(title) between 1 and 200),
 provider text not null check(length(provider) between 1 and 50),
 season integer not null default 0 check(season >= 0), episode integer not null default 0 check(episode >= 0),
 reason text not null check(reason in ('not_playing','wrong_episode','no_audio','subtitles','buffering')),
 status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now(),
 report_day date not null default (now() at time zone 'UTC')::date,
 unique(user_id,media_type,media_id,provider,season,episode,reason,report_day)
);
alter table public.stream_reports enable row level security;
drop policy if exists reports_insert on public.stream_reports;
create policy reports_insert on public.stream_reports for insert to authenticated with check(auth.uid()=user_id and status='open' and report_day=(now() at time zone 'UTC')::date);
drop policy if exists reports_read on public.stream_reports;
create policy reports_read on public.stream_reports for select to authenticated using(auth.uid()=user_id or public.is_admin(auth.uid()));
drop policy if exists reports_admin_update on public.stream_reports;
create policy reports_admin_update on public.stream_reports for update to authenticated using(public.is_admin(auth.uid())) with check(public.is_admin(auth.uid()));
create index if not exists stream_reports_recent on public.stream_reports(created_at desc);

create table if not exists public.episode_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 media_type text not null check(media_type in ('tv','anime')), media_id bigint not null check(media_id>0),
 title text not null, last_episode_key text, created_at timestamptz not null default now(),
 unique(user_id,media_type,media_id)
);
alter table public.episode_subscriptions enable row level security;
drop policy if exists subscriptions_read on public.episode_subscriptions;
create policy subscriptions_read on public.episode_subscriptions for select to authenticated using(auth.uid()=user_id);
drop policy if exists subscriptions_delete on public.episode_subscriptions;
create policy subscriptions_delete on public.episode_subscriptions for delete to authenticated using(auth.uid()=user_id);
-- Inserts/baseline changes are server-only so clients cannot fabricate release alerts.

create table if not exists public.episode_alerts (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.episode_subscriptions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 episode_key text not null, title text not null, link text not null,
 read boolean not null default false, created_at timestamptz not null default now(),
 unique(subscription_id,episode_key)
);
alter table public.episode_alerts enable row level security;
drop policy if exists alerts_read on public.episode_alerts;
create policy alerts_read on public.episode_alerts for select to authenticated using(auth.uid()=user_id);
drop policy if exists alerts_update on public.episode_alerts;
create policy alerts_update on public.episode_alerts for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
revoke update on public.episode_alerts from authenticated;
grant update(read) on public.episode_alerts to authenticated;
grant select,insert on public.stream_reports to authenticated;
grant update(status) on public.stream_reports to authenticated;
grant select,delete on public.episode_subscriptions to authenticated;
grant select on public.episode_alerts to authenticated;
grant all on public.stream_reports,public.episode_subscriptions,public.episode_alerts to service_role;
commit;
