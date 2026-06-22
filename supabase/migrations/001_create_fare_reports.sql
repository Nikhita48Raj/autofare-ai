-- ============================================================
-- AutoFare — Migration 001: Create fare_reports table
-- ============================================================
-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com → your project → SQL Editor → New query
-- ============================================================

-- Enable the pgcrypto extension for UUID generation (already enabled on most Supabase projects).
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: fare_reports
-- ============================================================
create table if not exists public.fare_reports (
  -- Primary key: UUID used as the shareable dispute page slug (/dispute/<id>)
  id                uuid        primary key default gen_random_uuid(),

  -- Location names from Google Places autocomplete
  pickup_name       text        not null check (char_length(pickup_name) between 1 and 250),
  drop_name         text        not null check (char_length(drop_name) between 1 and 250),

  -- Coordinates (WGS-84 decimal degrees)
  pickup_lat        double precision not null,
  pickup_lng        double precision not null,
  drop_lat          double precision not null,
  drop_lng          double precision not null,

  -- Route distance from Google Distance Matrix (or Haversine fallback)
  distance_km       numeric(8, 2) not null check (distance_km > 0),

  -- Fare breakdown
  official_fare     numeric(10, 2) not null check (official_fare >= 0),
  street_fare       numeric(10, 2) not null check (street_fare >= 0),

  -- Optional: actual fare demanded by the driver (null = estimation-only)
  actual_fare       numeric(10, 2)           check (actual_fare is null or actual_fare > 0),

  -- Surcharges
  night_surcharge   boolean       not null default false,
  special_charges   numeric(10, 2) not null default 0 check (special_charges >= 0),

  -- Optional driver behaviour notes (max 500 chars)
  notes             text                     check (notes is null or char_length(notes) <= 500),

  -- Audit timestamp — auto-set on insert, immutable after that
  created_at        timestamptz not null default now()
);

-- ============================================================
-- INDEXES — for dashboard queries and dispute page lookups
-- ============================================================

-- Fast lookup by UUID for the dispute page
create index if not exists fare_reports_id_idx
  on public.fare_reports (id);

-- Dashboard: filter reports with actual_fare reported (overcharge disputes)
create index if not exists fare_reports_actual_fare_idx
  on public.fare_reports (actual_fare)
  where actual_fare is not null;

-- Dashboard: time-series trend queries (last 30 days)
create index if not exists fare_reports_created_at_idx
  on public.fare_reports (created_at desc);

-- Dashboard: night-trip filtering
create index if not exists fare_reports_night_surcharge_idx
  on public.fare_reports (night_surcharge);

-- Geospatial: pickup location clustering (for heatmap phase)
create index if not exists fare_reports_pickup_coords_idx
  on public.fare_reports (pickup_lat, pickup_lng);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on the table
alter table public.fare_reports enable row level security;

-- Public read: anyone can view dispute reports (used by the dispute page and dashboard)
create policy "Public read fare_reports"
  on public.fare_reports
  for select
  using (true);

-- Anonymous insert: anyone can submit a fare report (rate-limiting is enforced in the API layer)
create policy "Anon insert fare_reports"
  on public.fare_reports
  for insert
  with check (true);

-- No public update or delete (disputes are immutable once submitted)

-- ============================================================
-- COMMENTS — for Supabase Studio display
-- ============================================================
comment on table public.fare_reports is
  'Crowdsourced auto-rickshaw fare reports submitted by users via the AutoFare calculator.';

comment on column public.fare_reports.id is
  'UUID primary key. Also used as the shareable dispute page URL slug.';

comment on column public.fare_reports.actual_fare is
  'Fare demanded by the driver. NULL means the user only estimated the fare and did not report an overcharge.';

comment on column public.fare_reports.street_fare is
  'Expected bargaining price (official + 15% buffer or +₹10, whichever is higher).';

comment on column public.fare_reports.night_surcharge is
  'True when the 20% night surcharge (after 10 PM) was applied.';
