"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { AlertTriangle, TrendingUp, Moon, Smile } from "lucide-react";

export interface DashboardStats {
  totalReports: number;
  avgOverchargeAmount: number;
  avgOverchargePercent: number;
  nightTripRatio: number;
  fairRideRatio: number;
}

export interface RouteLeaderboardItem {
  pickup: string;
  dropoff: string;
  disputesCount: number;
  avgOfficial: number;
  avgActual: number;
  maxActual: number;
}

export interface DailyTrendItem {
  date: string;
  avgOverchargePercent: number;
  reportsCount: number;
}

export interface SurchargeStatsItem {
  name: string; // "Day Trip" | "Night Trip"
  avgOvercharge: number;
}

interface AnalyticsDashboardProps {
  stats: DashboardStats;
  leaderboard: RouteLeaderboardItem[];
  trend: DailyTrendItem[];
  surcharges: SurchargeStatsItem[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: unknown;
  }>;
  label?: string;
}

export function AnalyticsDashboard({
  stats,
  leaderboard,
  trend,
  surcharges,
}: AnalyticsDashboardProps) {
  // Custom Recharts Tooltip Styling
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const overchargeVal = payload[0]?.value;
      const countVal = payload[1]?.value;
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg text-sm text-slate-800">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-blue-600">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Avg Overcharge:{" "}
            {typeof overchargeVal === "number"
              ? `${overchargeVal.toFixed(1)}%`
              : overchargeVal}
          </p>
          {payload[1] && (
            <p className="mt-1 flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Reports: {countVal}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const SurchargeTooltip = ({
    active,
    payload,
    label,
  }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const overchargeVal = payload[0]?.value;
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg text-sm text-slate-800">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Avg Overcharge: ₹
            {typeof overchargeVal === "number"
              ? overchargeVal.toFixed(2)
              : overchargeVal}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Dashboard Title Header */}
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
          Analytics Dashboard
        </p>
        <h2 className="text-3xl font-semibold text-slate-950">
          Community Overcharge Metrics
        </h2>
        <p className="max-w-2xl text-slate-600">
          Real-time insights compiled from crowdsourced fare dispute submissions
          across major Indian cities.
        </p>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Disputes
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {stats.totalReports}
          </p>
          {/* BUG-13 FIX: text-2xs does not exist in Tailwind — replaced with text-xs */}
          <p className="mt-1.5 text-xs text-slate-500">
            Reports submitted by passengers
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Avg Overcharge
            </span>
            <TrendingUp className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">
              ₹{stats.avgOverchargeAmount.toFixed(0)}
            </span>
            <span className="text-xs font-semibold text-red-500">
              ({stats.avgOverchargePercent.toFixed(0)}%)
            </span>
          </div>
          {/* BUG-13 FIX */}
          <p className="mt-1.5 text-xs text-slate-500">
            Average amount paid above meter
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Night Trip Ratio
            </span>
            <Moon className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {(stats.nightTripRatio * 100).toFixed(0)}%
          </p>
          {/* BUG-13 FIX */}
          <p className="mt-1.5 text-xs text-slate-500">
            Trips reported after 10 PM
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fair Ride Ratio
            </span>
            <Smile className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {(stats.fairRideRatio * 100).toFixed(0)}%
          </p>
          {/* BUG-13 FIX */}
          <p className="mt-1.5 text-xs text-slate-500">
            Rides conforming to local meter
          </p>
        </div>
      </div>

      {/* Charts Grid Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Trend Area Chart */}
        <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Overcharge Trend
            </h3>
            <p className="text-xs text-slate-500">
              Average daily overcharge percentage (past 30 days)
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorOvercharge"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${val}%`}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="avgOverchargePercent"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOvercharge)"
                />
                <Area
                  type="monotone"
                  dataKey="reportsCount"
                  stroke="transparent"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day vs Night Bar Chart */}
        <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Day vs. Night Surcharges
            </h3>
            <p className="text-xs text-slate-500">
              Average overcharge amount in Rs. by trip timing
            </p>
          </div>
          <div className="flex h-[300px] w-full items-center">
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={surcharges}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val}`}
                  tickLine={false}
                />
                <Tooltip
                  content={<SurchargeTooltip />}
                  cursor={{ fill: "rgba(226, 232, 240, 0.2)" }}
                />
                <Bar dataKey="avgOvercharge" radius={[12, 12, 0, 0]} maxBarSize={60}>
                  {surcharges.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === "Night Trip" ? "#6366f1" : "#f59e0b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Hotspot Dispute Leaderboard
          </h3>
          <p className="text-xs text-slate-500">
            Routes with the highest overcharge volume and rates
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-4">Route Details</th>
                <th className="px-4 py-4 text-center">Disputes</th>
                <th className="px-4 py-4">Official Rate</th>
                <th className="px-4 py-4">Avg Demanded</th>
                <th className="px-4 py-4">Max Demanded</th>
                <th className="px-4 py-4 text-center">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaderboard.map((item, index) => {
                const routeOverchargeAmount =
                  item.avgActual - item.avgOfficial;
                const routeOverchargePercent =
                  (routeOverchargeAmount / item.avgOfficial) * 100;
                const isSevere = routeOverchargePercent > 25;
                const isModerate = routeOverchargePercent > 10;

                return (
                  <tr
                    key={index}
                    className="transition hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {/* BUG-13 FIX: text-2xs → text-xs */}
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-blue-600">
                          {index + 1}
                        </span>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-xs font-semibold text-slate-950">
                            <span className="text-xs font-bold text-blue-500">
                              P
                            </span>{" "}
                            {item.pickup.split(",")[0]}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <span className="text-xs font-bold text-green-500">
                              D
                            </span>{" "}
                            {item.dropoff.split(",")[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-900">
                      {item.disputesCount}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-600">
                      ₹{item.avgOfficial.toFixed(0)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-red-600">
                      ₹{item.avgActual.toFixed(0)}
                      {/* BUG-13 FIX: text-2xs → text-xs */}
                      <span className="ml-1 text-xs font-medium text-red-400">
                        (+{routeOverchargePercent.toFixed(0)}%)
                      </span>
                    </td>
                    <td className="px-4 py-4 font-extrabold text-slate-800">
                      ₹{item.maxActual.toFixed(0)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isSevere ? (
                        // BUG-13 FIX: text-2xs → text-xs
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                          Critical
                        </span>
                      ) : isModerate ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          High
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700">
                          Moderate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
