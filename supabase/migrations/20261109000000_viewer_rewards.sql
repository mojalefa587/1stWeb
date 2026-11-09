create table if not exists public.profiles (
  user_id text primary key,
  provider text not null check (provider in ('discord', 'kick')),
  display_name text not null,
  avatar_url text,
  solana_address text,
  points integer not null default 0 check (points >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_checkin date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  user_id text not null references public.profiles(user_id) on delete cascade,
  checkin_date date not null,
  streak integer not null check (streak > 0),
  points_awarded integer not null check (points_awarded >= 10),
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

create table if not exists public.raffles (
  id uuid primary key default gen_random_uuid(),
  raffle_month text not null unique check (raffle_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  starts_at timestamptz not null,
  closes_at timestamptz not null,
  drawn_at timestamptz,
  winner_entry_id bigint,
  winner_wallet text,
  created_at timestamptz not null default now(),
  check (closes_at > starts_at)
);

create table if not exists public.raffle_entries (
  entry_number bigint generated always as identity primary key,
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  user_id text not null references public.profiles(user_id) on delete cascade,
  wallet_snapshot text not null,
  points_spent integer not null default 40 check (points_spent = 40),
  created_at timestamptz not null default now()
);

alter table public.raffles
  drop constraint if exists raffles_winner_entry_id_fkey;
alter table public.raffles
  add constraint raffles_winner_entry_id_fkey
  foreign key (winner_entry_id) references public.raffle_entries(entry_number);

create index if not exists raffle_entries_raffle_id_idx
  on public.raffle_entries(raffle_id);
create index if not exists raffle_entries_user_id_idx
  on public.raffle_entries(user_id);

create table if not exists public.point_transactions (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(user_id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  raffle_id uuid references public.raffles(id),
  created_at timestamptz not null default now()
);

create index if not exists point_transactions_user_id_idx
  on public.point_transactions(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.raffles enable row level security;
alter table public.raffle_entries enable row level security;
alter table public.point_transactions enable row level security;

revoke all on public.profiles, public.checkins, public.raffles, public.raffle_entries
  from anon, authenticated;
grant all on public.profiles, public.checkins, public.raffles, public.raffle_entries
  to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.point_transactions from anon, authenticated;
grant all on public.point_transactions to service_role;

create or replace function public.claim_daily_checkin(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'UTC' + interval '90 minutes')::date;
  v_profile public.profiles%rowtype;
  v_streak integer;
  v_bonus integer := 0;
  v_award integer;
begin
  select * into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.last_checkin = v_today then
    return jsonb_build_object(
      'checkedIn', false,
      'pointsAwarded', 0,
      'points', v_profile.points,
      'streak', v_profile.current_streak
    );
  end if;

  if v_profile.last_checkin = v_today - 1 then
    v_streak := v_profile.current_streak + 1;
  else
    v_streak := 1;
  end if;

  if v_streak % 7 = 0 then
    v_bonus := 60;
  end if;
  v_award := 10 + v_bonus;

  update public.profiles
  set points = points + v_award,
      current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak),
      last_checkin = v_today,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_profile;

  insert into public.checkins (user_id, checkin_date, streak, points_awarded)
  values (p_user_id, v_today, v_streak, v_award);

  insert into public.point_transactions (user_id, amount, reason)
  values (p_user_id, 10, 'daily_checkin');
  if v_bonus > 0 then
    insert into public.point_transactions (user_id, amount, reason)
    values (p_user_id, v_bonus, 'seven_day_streak');
  end if;

  return jsonb_build_object(
    'checkedIn', true,
    'pointsAwarded', v_award,
    'points', v_profile.points,
    'streak', v_streak,
    'streakBonus', v_bonus
  );
end;
$$;

create or replace function public.enter_monthly_raffle(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_local timestamp := now() at time zone 'UTC' + interval '2 hours';
  v_month text := to_char(v_local, 'YYYY-MM');
  v_month_start timestamp := date_trunc('month', v_local);
  v_starts_at timestamptz;
  v_closes_at timestamptz;
  v_profile public.profiles%rowtype;
  v_raffle public.raffles%rowtype;
  v_entry_number bigint;
begin
  select * into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;
  if v_profile.solana_address is null then
    raise exception 'Save your Solana wallet before entering the raffle';
  end if;

  v_starts_at := (v_month_start - interval '2 hours') at time zone 'UTC';
  v_closes_at := (v_month_start + interval '1 month' - interval '2 hours') at time zone 'UTC';

  insert into public.raffles (raffle_month, starts_at, closes_at)
  values (v_month, v_starts_at, v_closes_at)
  on conflict (raffle_month) do nothing;

  select * into v_raffle
  from public.raffles
  where raffle_month = v_month
  for update;

  if v_now >= v_raffle.closes_at then
    raise exception 'This month''s raffle is closed';
  end if;
  if v_raffle.drawn_at is not null then
    raise exception 'This month''s raffle has already been drawn';
  end if;
  if v_profile.points < 40 then
    raise exception 'You need 40 points to enter';
  end if;

  update public.profiles
  set points = points - 40, updated_at = v_now
  where user_id = p_user_id
  returning * into v_profile;

  insert into public.raffle_entries (raffle_id, user_id, wallet_snapshot)
  values (v_raffle.id, p_user_id, v_profile.solana_address)
  returning entry_number into v_entry_number;

  insert into public.point_transactions (user_id, amount, reason, raffle_id)
  values (p_user_id, -40, 'raffle_entry', v_raffle.id);

  return jsonb_build_object(
    'entered', true,
    'entryNumber', v_entry_number,
    'points', v_profile.points
  );
end;
$$;

create or replace function public.draw_monthly_raffle(p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raffle public.raffles%rowtype;
  v_entry public.raffle_entries%rowtype;
  v_display_name text;
  v_wallet text;
begin
  select * into v_raffle
  from public.raffles
  where raffle_month = p_month
  for update;

  if not found then
    raise exception 'No entries exist for that month';
  end if;
  if now() < v_raffle.closes_at then
    raise exception 'The raffle can only be drawn after month-end';
  end if;
  if v_raffle.drawn_at is not null then
    raise exception 'This raffle has already been drawn';
  end if;

  select * into v_entry
  from public.raffle_entries
  where raffle_id = v_raffle.id
  order by gen_random_uuid()
  limit 1;

  if not found then
    raise exception 'This raffle has no entries';
  end if;

  select display_name, solana_address
  into v_display_name, v_wallet
  from public.profiles
  where user_id = v_entry.user_id;
  if v_wallet is null then
    raise exception 'The selected winner has no saved Solana wallet';
  end if;

  update public.raffles
  set drawn_at = now(),
      winner_entry_id = v_entry.entry_number,
      winner_wallet = v_wallet
  where id = v_raffle.id;

  return jsonb_build_object(
    'drawn', true,
    'month', p_month,
    'entryNumber', v_entry.entry_number,
    'winnerName', v_display_name,
    'wallet', v_wallet
  );
end;
$$;

revoke all on function public.claim_daily_checkin(text) from public, anon, authenticated;
revoke all on function public.enter_monthly_raffle(text) from public, anon, authenticated;
revoke all on function public.draw_monthly_raffle(text) from public, anon, authenticated;
grant execute on function public.claim_daily_checkin(text) to service_role;
grant execute on function public.enter_monthly_raffle(text) to service_role;
grant execute on function public.draw_monthly_raffle(text) to service_role;
