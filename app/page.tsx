"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Truck,
  FileText,
  Tag,
  QrCode,
  MapPin,
  Activity,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const VITOGAZ_GREEN = "#008B7F";
const QR_PAGE_SIZE = 10;

// Icône bouteille de gaz custom
const GasBottleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2h4" />
    <path d="M12 2v2" />
    <path d="M8 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <path d="M8 10h8" />
    <path d="M8 14h8" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  resellers: number;
  deliveryCompanies: number;
  promotions: number;
  qrScans: number;
}

interface EvolutionPoint {
  date: string;
  count: number;
}

interface QrScan {
  id: string;
  scanned_at: string;
  country: string;
  city: string;
  os: string;
  browser: string;
  device_type: string;
  ip_address: string;
}

type PeriodKey = "7" | "30" | "90" | "365";
type EntityKey = "resellers" | "delivery-companies" | "promotions" | "qr-scans";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: PeriodKey }[] = [
  { label: "7 jours", value: "7" },
  { label: "30 jours", value: "30" },
  { label: "90 jours", value: "90" },
  { label: "1 an", value: "365" },
];

const CHART_COLORS = {
  resellers: VITOGAZ_GREEN,
  "delivery-companies": "#10B981",
  promotions: "#F59E0B",
  "qr-scans": "#8B5CF6",
};

const OS_COLORS = [VITOGAZ_GREEN, "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  if (days <= 30) return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  if (days <= 90) return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function aggregateByWeek(data: EvolutionPoint[]): EvolutionPoint[] {
  const weeks: Record<string, number> = {};
  data.forEach(({ date, count }) => {
    const d = new Date(date);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toISOString().split("T")[0];
    weeks[key] = (weeks[key] || 0) + count;
  });
  return Object.entries(weeks).map(([date, count]) => ({ date, count }));
}

function computeTrend(data: EvolutionPoint[]): { value: number; positive: boolean | null } {
  if (data.length < 2) return { value: 0, positive: null };
  const half = Math.floor(data.length / 2);
  const first = data.slice(0, half).reduce((s, d) => s + d.count, 0);
  const second = data.slice(half).reduce((s, d) => s + d.count, 0);
  if (first === 0) return { value: 0, positive: null };
  const pct = Math.round(((second - first) / first) * 100);
  return { value: Math.abs(pct), positive: pct >= 0 };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: { value: number; positive: boolean | null } }) {
  if (trend.positive === null) return <span className="text-xs text-gray-400">—</span>;
  if (trend.positive) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" /> +{trend.value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" /> -{trend.value}%
    </span>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
}) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
            value === p.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function EvolutionCard({
  title,
  entity,
  color,
  period,
  onPeriodChange,
  data,
  loading,
}: {
  title: string;
  entity: EntityKey;
  color: string;
  period: PeriodKey;
  onPeriodChange: (v: PeriodKey) => void;
  data: EvolutionPoint[];
  loading: boolean;
}) {
  const displayData = parseInt(period) >= 90 ? aggregateByWeek(data) : data;
  const trend = computeTrend(data);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{total}</span>
              <TrendBadge trend={trend} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">sur la période sélectionnée</p>
          </div>
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: VITOGAZ_GREEN }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${entity}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(v, parseInt(period))}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                formatter={(v: number) => [v, "Nouveaux"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${entity})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Summary
  const [summary, setSummary] = useState<Summary>({ resellers: 0, deliveryCompanies: 0, promotions: 0, qrScans: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Evolution data
  const [evolutionData, setEvolutionData] = useState<Record<EntityKey, EvolutionPoint[]>>({
    resellers: [],
    "delivery-companies": [],
    promotions: [],
    "qr-scans": [],
  });
  const [evolutionLoading, setEvolutionLoading] = useState<Record<EntityKey, boolean>>({
    resellers: true,
    "delivery-companies": true,
    promotions: true,
    "qr-scans": true,
  });
  const [periods, setPeriods] = useState<Record<EntityKey, PeriodKey>>({
    resellers: "30",
    "delivery-companies": "30",
    promotions: "30",
    "qr-scans": "30",
  });

  // QR details
  const [qrScans, setQrScans] = useState<QrScan[]>([]);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrPage, setQrPage] = useState(1);

  // Stats cards
  const [stats, setStats] = useState({ resellers: 0, deliveryCompanies: 0, documents: 0, promotions: 0, products: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Fetch helpers ────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/stats/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  }, [apiUrl]);

  const fetchEvolution = useCallback(async (entity: EntityKey, days: PeriodKey) => {
    setEvolutionLoading((prev) => ({ ...prev, [entity]: true }));
    try {
      const res = await fetch(`${apiUrl}/stats/evolution?entity=${entity}&days=${days}`);
      const data = await res.json();
      setEvolutionData((prev) => ({ ...prev, [entity]: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setEvolutionLoading((prev) => ({ ...prev, [entity]: false }));
    }
  }, [apiUrl]);

  const fetchQrScans = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/qr/stats`);
      const data = await res.json();
      setQrScans(data.scans || []);
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  }, [apiUrl]);

  const fetchStats = useCallback(async () => {
    try {
      const [resellers, delivery, docs, promos, products] = await Promise.all([
        fetch(`${apiUrl}/resellers`).then((r) => r.json()),
        fetch(`${apiUrl}/delivery-companies`).then((r) => r.json()),
        fetch(`${apiUrl}/documents`).then((r) => r.json()),
        fetch(`${apiUrl}/promotions/active`).then((r) => r.json()),
        fetch(`${apiUrl}/products`).then((r) => r.json()),
      ]);
      setStats({
        resellers: resellers.length || 0,
        deliveryCompanies: delivery.length || 0,
        documents: docs.length || 0,
        promotions: promos.length || 0,
        products: products.length || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, [apiUrl]);

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    fetchSummary();
    fetchQrScans();
    fetchStats();
    (["resellers", "delivery-companies", "promotions", "qr-scans"] as EntityKey[]).forEach(
      (e) => fetchEvolution(e, "30")
    );
  }, [router, fetchSummary, fetchQrScans, fetchStats, fetchEvolution]);

  const handlePeriodChange = (entity: EntityKey, days: PeriodKey) => {
    setPeriods((prev) => ({ ...prev, [entity]: days }));
    fetchEvolution(entity, days);
  };

  // ── QR OS breakdown ──────────────────────────────────────────────────────────

  const osCounts = qrScans.reduce<Record<string, number>>((acc, s) => {
    const os = s.os || "Unknown";
    acc[os] = (acc[os] || 0) + 1;
    return acc;
  }, {});
  const osData = Object.entries(osCounts).map(([name, value]) => ({ name, value }));

  const deviceCounts = qrScans.reduce<Record<string, number>>((acc, s) => {
    const d = s.device_type || "Unknown";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));

  // ── QR pagination ─────────────────────────────────────────────────────────────
  const qrTotalPages = Math.ceil(qrScans.length / QR_PAGE_SIZE);
  const paginatedQrScans = qrScans.slice(
    (qrPage - 1) * QR_PAGE_SIZE,
    qrPage * QR_PAGE_SIZE
  );

  // ── Stat cards config ────────────────────────────────────────────────────────

  const statCards = [
    { title: "Revendeurs", value: stats.resellers, icon: Building2, href: "/resellers", color: "text-teal-700", bgColor: "bg-teal-50" },
    {
      title: "Produits", value: stats.products, icon: GasBottleIcon, href: "/products",
      color: "text-teal-700", bgColor: "bg-teal-50",
    },
    { title: "Sociétés de Livraison", value: stats.deliveryCompanies, icon: Truck, href: "/delivery-companies", color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { title: "Documents", value: stats.documents, icon: FileText, href: "/documents", color: "text-purple-600", bgColor: "bg-purple-50" },
    { title: "Promotions Actives", value: stats.promotions, icon: Tag, href: "/promotions", color: "text-orange-600", bgColor: "bg-orange-50" },
    { title: "Scans QR Code", value: summary.qrScans, icon: QrCode, href: "#qr-stats", color: "text-violet-600", bgColor: "bg-violet-50" },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Back-office Vitogaz Madagascar" />
      <Navigation />

      <main className="p-6 space-y-8 max-w-screen-2xl mx-auto">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const loading = card.title === "Scans QR Code" ? summaryLoading : statsLoading;
            return (
              <Link key={card.title} href={card.href}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border border-gray-100">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-gray-500 leading-tight">{card.title}</CardTitle>
                    <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-3xl font-bold text-gray-900">
                      {loading ? <span className="text-gray-300">—</span> : card.value}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Total</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* ── Évolutions ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Évolutions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EvolutionCard
              title="Revendeurs"
              entity="resellers"
              color={CHART_COLORS.resellers}
              period={periods.resellers}
              onPeriodChange={(v) => handlePeriodChange("resellers", v)}
              data={evolutionData.resellers}
              loading={evolutionLoading.resellers}
            />
            <EvolutionCard
              title="Sociétés de Livraison"
              entity="delivery-companies"
              color={CHART_COLORS["delivery-companies"]}
              period={periods["delivery-companies"]}
              onPeriodChange={(v) => handlePeriodChange("delivery-companies", v)}
              data={evolutionData["delivery-companies"]}
              loading={evolutionLoading["delivery-companies"]}
            />
            <EvolutionCard
              title="Promotions"
              entity="promotions"
              color={CHART_COLORS.promotions}
              period={periods.promotions}
              onPeriodChange={(v) => handlePeriodChange("promotions", v)}
              data={evolutionData.promotions}
              loading={evolutionLoading.promotions}
            />
            <EvolutionCard
              title="Scans QR Code"
              entity="qr-scans"
              color={CHART_COLORS["qr-scans"]}
              period={periods["qr-scans"]}
              onPeriodChange={(v) => handlePeriodChange("qr-scans", v)}
              data={evolutionData["qr-scans"]}
              loading={evolutionLoading["qr-scans"]}
            />
          </div>
        </div>

        {/* ── QR Code Stats Detail ── */}
        <div id="qr-stats">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Analyse des Scans QR</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* OS Breakdown */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-violet-500" />
                  Systèmes d'exploitation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qrLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: VITOGAZ_GREEN }} />
                  </div>
                ) : osData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={osData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {osData.map((_, i) => (
                          <Cell key={i} fill={OS_COLORS[i % OS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "scans"]} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Device Type */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  Type d'appareil
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qrLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: VITOGAZ_GREEN }} />
                  </div>
                ) : deviceData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={deviceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} formatter={(v: number) => [v, "scans"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {deviceData.map((_, i) => (
                          <Cell key={i} fill={OS_COLORS[i % OS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Geo */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-violet-500" />
                  Localisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qrLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: VITOGAZ_GREEN }} />
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {Object.entries(
                      qrScans.reduce<Record<string, number>>((acc, s) => {
                        const key = s.city && s.city !== "Unknown" ? `${s.city}, ${s.country}` : s.country || "Unknown";
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([location, count], i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-700">{location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(count / qrScans.length) * 100}%`,
                                  backgroundColor: VITOGAZ_GREEN,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-4 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Derniers scans — avec pagination */}
          <Card className="border border-gray-100 shadow-sm mt-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  Derniers scans
                </CardTitle>
                {qrScans.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {qrScans.length} scan{qrScans.length > 1 ? "s" : ""} au total
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {qrLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: VITOGAZ_GREEN }} />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
                          <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Localisation</th>
                          <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">OS</th>
                          <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Navigateur</th>
                          <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Appareil</th>
                          <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedQrScans.map((scan) => (
                          <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                              {new Date(scan.scanned_at).toLocaleString("fr-FR", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {scan.city && scan.city !== "Unknown" ? `${scan.city}, ${scan.country}` : scan.country || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                                {scan.os || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{scan.browser || "—"}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                                {scan.device_type || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{scan.ip_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination QR scans */}
                  {qrTotalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Page {qrPage} sur {qrTotalPages} — {qrScans.length} scan{qrScans.length > 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQrPage((p) => Math.max(1, p - 1))}
                          disabled={qrPage === 1}
                          className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: qrTotalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setQrPage(page)}
                            className="w-8 h-8 rounded-md text-sm font-medium transition-colors border"
                            style={
                              page === qrPage
                                ? { backgroundColor: VITOGAZ_GREEN, color: "white", borderColor: VITOGAZ_GREEN }
                                : { borderColor: "#e5e7eb", color: "#374151" }
                            }
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setQrPage((p) => Math.min(qrTotalPages, p + 1))}
                          disabled={qrPage === qrTotalPages}
                          className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actions Rapides */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" />
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/resellers", bg: "bg-teal-50 hover:bg-teal-100", title: "text-teal-900", sub: "text-teal-700", label: "Ajouter un Revendeur", desc: "Créer une nouvelle fiche revendeur" },
                { href: "/products", bg: "bg-teal-50 hover:bg-teal-100", title: "text-teal-900", sub: "text-teal-700", label: "Ajouter un Produit", desc: "Créer un nouveau produit avec image" },
                { href: "/promotions", bg: "bg-orange-50 hover:bg-orange-100", title: "text-orange-900", sub: "text-orange-700", label: "Nouvelle Promotion", desc: "Lancer une campagne promotionnelle" },
                { href: "/documents", bg: "bg-purple-50 hover:bg-purple-100", title: "text-purple-900", sub: "text-purple-700", label: "Uploader un Document", desc: "Ajouter PAMF, guides, procédures" },
                { href: "/zones", bg: "bg-cyan-50 hover:bg-cyan-100", title: "text-cyan-900", sub: "text-cyan-700", label: "Gérer les Zones", desc: "Villes et provinces de Madagascar" },
                { href: "/admin/settings", bg: "bg-indigo-50 hover:bg-indigo-100", title: "text-indigo-900", sub: "text-indigo-700", label: "⚙️ Paramètres", desc: "Bannière, textes et statistiques homepage" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className={`block p-3 ${a.bg} rounded-lg transition-colors`}>
                  <div className={`font-semibold text-sm ${a.title}`}>{a.label}</div>
                  <div className={`text-xs ${a.sub} mt-0.5`}>{a.desc}</div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Aperçu Système */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" />
                Aperçu Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Backend API", value: "✓ Opérationnel", valueClass: "text-green-600" },
                { label: "Base Supabase", value: "✓ Connectée", valueClass: "text-green-600" },
                { label: "Endpoints REST", value: "42 actifs", valueClass: "" },
                { label: "RLS Policies", value: "32 sécurisées", valueClass: "" },
                { label: "Modules CRUD", value: "✅ 7/7 complets", valueClass: "text-green-600" },
                { label: "Authentification", value: "✅ JWT Active", valueClass: "text-green-600" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.valueClass}`}>{row.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t">
                <a
                  href="https://vito-backend-supabase.onrender.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: VITOGAZ_GREEN }}
                >
                  → Voir Documentation Swagger
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}