import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getAnalytics } from "../services/adminService";

// ─── palette matching the app's design tokens ───────────────────────────────
const ACCENT      = "#ffd166";
const ACCENT_STR  = "#ff7a59";
const TEAL        = "#5ce1e6";
const MUTED       = "rgba(255,255,255,0.38)";
const LINE        = "rgba(255,255,255,0.08)";

const PIE_COLORS = [
  "#ffd166", "#ff7a59", "#5ce1e6", "#a78bfa",
  "#34d399", "#f472b6", "#60a5fa", "#fb923c",
];

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000
    ? `₹${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₹${(n / 1_000).toFixed(1)}K`
    : `₹${n}`;

const statusColor = {
  approved: "#34d399",
  pending:  "#ffd166",
  rejected: "#ef4444",
};

const CustomTooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{fmt(payload[0].value)}</p>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value} bookings</p>
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.06) return null;
  const RAD = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = ACCENT }) {
  return (
    <div className="kpi-card panel fade-up">
      <div className="kpi-card__icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__label">{label}</span>
        <strong className="kpi-card__value" style={{ color }}>{value}</strong>
        {sub && <span className="kpi-card__sub">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getAnalytics()
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="analytics-loading panel fade-up">
        <div className="analytics-spinner" />
        <p style={{ color: MUTED, marginTop: "1rem" }}>Crunching your data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="empty-state panel fade-up">
        <h3>⚠️ Analytics Unavailable</h3>
        <p style={{ color: MUTED }}>{error || "No data returned."}</p>
      </div>
    );
  }

  const { stats, revenueByMonth, eventsByCategory, topEvents, bookingsByDay } = data;

  const kpis = [
    {
      icon: "🎪",
      label: "Total Events",
      value: stats.totalEvents,
      sub: `${stats.approvedEvents} approved · ${stats.pendingEvents} pending`,
      color: ACCENT,
    },
    {
      icon: "🎟️",
      label: "Total Bookings",
      value: stats.totalBookings,
      sub: "All time",
      color: TEAL,
    },
    {
      icon: "💰",
      label: "Total Revenue",
      value: fmt(stats.totalRevenue),
      sub: "From all bookings",
      color: ACCENT_STR,
    },
    {
      icon: "👥",
      label: "Registered Users",
      value: stats.totalUsers,
      sub: `Avg rating: ${stats.avgRating} ⭐`,
      color: "#a78bfa",
    },
  ];

  return (
    <div className="analytics-shell fade-up">

      {/* ── KPI Row ── */}
      <div className="analytics-kpi-row">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="analytics-charts-row">

        {/* Revenue Area Chart */}
        <div className="chart-panel panel" style={{ gridColumn: "span 2" }}>
          <div className="chart-panel__header">
            <div>
              <p className="eyebrow">Revenue Trend</p>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Monthly Revenue</h3>
            </div>
            <span className="results-pill">{fmt(stats.totalRevenue)}</span>
          </div>
          {revenueByMonth.length === 0 ? (
            <p style={{ color: MUTED, padding: "2rem 0", textAlign: "center" }}>No booking data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByMonth} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltipRevenue />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: ACCENT }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie */}
        <div className="chart-panel panel">
          <div className="chart-panel__header">
            <div>
              <p className="eyebrow">Breakdown</p>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Events by Category</h3>
            </div>
          </div>
          {eventsByCategory.length === 0 ? (
            <p style={{ color: MUTED, padding: "2rem 0", textAlign: "center" }}>No approved events yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={eventsByCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    labelLine={false}
                    label={<CustomPieLabel />}
                    strokeWidth={0}
                  >
                    {eventsByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ background: "rgba(18,12,20,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    itemStyle={{ color: "#fff6ef" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {eventsByCategory.map((c, i) => (
                  <div key={c.category} className="pie-legend__item">
                    <span className="pie-legend__dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-legend__name">{c.category}</span>
                    <span className="pie-legend__count">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bookings Bar Chart */}
        <div className="chart-panel panel">
          <div className="chart-panel__header">
            <div>
              <p className="eyebrow">Last 30 Days</p>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Bookings by Day</h3>
            </div>
            <span className="results-pill">{stats.totalBookings} total</span>
          </div>
          {bookingsByDay.length === 0 ? (
            <p style={{ color: MUTED, padding: "2rem 0", textAlign: "center" }}>No bookings in last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bookingsByDay} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => d.slice(0, 3)}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
                  {bookingsByDay.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? TEAL : `${TEAL}99`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── Mini Stats Row ── */}
      <div className="analytics-mini-row">
        <div className="mini-stat panel">
          <span className="mini-stat__icon" style={{ background: "#34d39922", color: "#34d399" }}>✅</span>
          <div>
            <strong style={{ color: "#34d399" }}>{stats.approvedEvents}</strong>
            <p>Approved Events</p>
          </div>
        </div>
        <div className="mini-stat panel">
          <span className="mini-stat__icon" style={{ background: "#ffd16622", color: ACCENT }}>⏳</span>
          <div>
            <strong style={{ color: ACCENT }}>{stats.pendingEvents}</strong>
            <p>Awaiting Review</p>
          </div>
        </div>
        <div className="mini-stat panel">
          <span className="mini-stat__icon" style={{ background: "#ef444422", color: "#ef4444" }}>❌</span>
          <div>
            <strong style={{ color: "#ef4444" }}>{stats.rejectedEvents}</strong>
            <p>Rejected Events</p>
          </div>
        </div>
        <div className="mini-stat panel">
          <span className="mini-stat__icon" style={{ background: "#a78bfa22", color: "#a78bfa" }}>⭐</span>
          <div>
            <strong style={{ color: "#a78bfa" }}>{stats.avgRating || "—"}</strong>
            <p>Avg. Review Rating</p>
          </div>
        </div>
      </div>

      {/* ── Top Events Table ── */}
      <div className="chart-panel panel top-events-panel">
        <div className="chart-panel__header">
          <div>
            <p className="eyebrow">Performance</p>
            <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Top 5 Events by Bookings</h3>
          </div>
        </div>

        {topEvents.length === 0 ? (
          <p style={{ color: MUTED, padding: "1.5rem 0", textAlign: "center" }}>No events with bookings yet.</p>
        ) : (
          <div className="top-events-scroll">
            <table className="top-events-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((ev, i) => (
                  <tr key={ev.id}>
                    <td className="rank-cell">{i + 1}</td>
                    <td className="title-cell">{ev.title}</td>
                    <td>
                      <span className="cat-chip">{ev.category}</span>
                    </td>
                    <td style={{ color: MUTED }}>{ev.dateLabel || "—"}</td>
                    <td>
                      <strong style={{ color: TEAL }}>{ev.bookings}</strong>
                    </td>
                    <td>
                      <strong style={{ color: ACCENT }}>{fmt(ev.revenue)}</strong>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: `${statusColor[ev.status] || "#888"}22`,
                          color: statusColor[ev.status] || "#888",
                          borderColor: `${statusColor[ev.status] || "#888"}44`,
                        }}
                      >
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
