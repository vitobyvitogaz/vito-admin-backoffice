"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  QrCode, Search, Download, RefreshCw, Users, Star, Filter, X, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";

interface Participation {
  id: string;
  promo_code: string;
  name: string;
  phone: string;
  email: string | null;
  points_earned: number;
  scanned_at: string;
  ip_address: string | null;
  promotions: { title: string } | null;
  cin_number: string | null;
}

interface Promo { id: string; title: string; promo_code: string | null }

type SortKey = "name" | "phone" | "email" | "cin_number" | "promo_code" | "promotion" | "points_earned" | "scanned_at";

const PAGE_SIZE = 50;

export default function ScansAdminPage() {
  const { canManageScans } = useCurrentUser();

  const [participations, setParticipations] = useState<Participation[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [promos, setPromos]   = useState<Promo[]>([]);
  const [promoFilter, setPromoFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");

  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search)      params.set("search", search);
      if (promoFilter) params.set("promo_id", promoFilter);

      const data = await apiGet<{ data: Participation[]; total: number }>(
        `/scan/admin/participations?${params.toString()}`
      );
      setParticipations(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Chargement impossible", variant: "destructive" });
    } finally { setLoading(false); }
  }, [page, search, promoFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    apiGet<Promo[]>("/promotions")
      .then(d => setPromos((d || []).filter(p => p.promo_code)))
      .catch(() => {});
  }, []);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const handleReset  = () => { setSearchInput(""); setSearch(""); setPromoFilter(""); setPeriodFilter("all"); setPage(1); };

  const handleSort = (col: SortKey) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const uniquePhones = new Set(participations.map(p => p.phone)).size;

  // Filtre période
  const filteredByPeriod = periodFilter === "all" ? participations : participations.filter(p => {
    const scanDate = new Date(p.scanned_at);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - parseInt(periodFilter));
    return scanDate >= limitDate;
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    }
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const sortedParticipations = [...filteredByPeriod].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "phone":
        aValue = a.phone;
        bValue = b.phone;
        break;
      case "email":
        aValue = (a.email || "").toLowerCase();
        bValue = (b.email || "").toLowerCase();
        break;
      case "cin_number":
        aValue = (a.cin_number || "").toLowerCase();
        bValue = (b.cin_number || "").toLowerCase();
        break;
      case "promo_code":
        aValue = a.promo_code.toLowerCase();
        bValue = b.promo_code.toLowerCase();
        break;
      case "promotion":
        aValue = (a.promotions?.title || "").toLowerCase();
        bValue = (b.promotions?.title || "").toLowerCase();
        break;
      case "points_earned":
        aValue = a.points_earned;
        bValue = b.points_earned;
        break;
      case "scanned_at":
        aValue = new Date(a.scanned_at).getTime();
        bValue = new Date(b.scanned_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExport = () => {
    if (participations.length === 0) { toast({ title: "Aucune donnée à exporter" }); return; }
    const headers = ["Nom", "Téléphone", "Email", "CIN", "Code promo", "Promotion", "Points", "Date scan"];
    const rows = participations.map(p => [
      p.name,
      p.phone,
      p.email || "",
      p.cin_number || "",
      p.promo_code,
      p.promotions?.title || "",
      String(p.points_earned),
      new Date(p.scanned_at).toLocaleString("fr-FR"),
    ]);
    const csv  = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `participants-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${participations.length} participants exportés` });
  };

  const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalPointsDistributed = participations.reduce((s, p) => s + p.points_earned, 0);

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Nom" },
    { key: "phone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "cin_number", label: "CIN" },
    { key: "promotion", label: "Promotion" },
    { key: "promo_code", label: "Code" },
    { key: "points_earned", label: "Points" },
    { key: "scanned_at", label: "Date" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="PARTICIPANTS — SCANS QR" />
      <Navigation />

      <main className="p-6">

        {/* Titre + actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <QrCode className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Participants</h2>
              <p className="text-sm text-gray-500">
                {total} participation{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </Button>
            {canManageScans && (
              <Button onClick={handleExport} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                <Download className="w-4 h-4" /> Exporter CSV
              </Button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom ou téléphone..."
                  className="pl-10"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value)}
              >
                <option value="all">Toute période</option>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="365">1 an</option>
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
                value={promoFilter}
                onChange={e => { setPromoFilter(e.target.value); setPage(1); }}
              >
                <option value="">Toutes les promotions</option>
                {promos.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.promo_code})</option>
                ))}
              </select>
              <Button onClick={handleSearch} style={{ backgroundColor: VITOGAZ_GREEN }} className="text-white gap-2">
                <Filter className="w-4 h-4" /> Filtrer
              </Button>
              {(search || promoFilter || periodFilter !== "all") && (
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <X className="w-4 h-4" /> Réinitialiser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total participations", value: total.toLocaleString(), icon: Users, color: "text-teal-700", bg: "bg-teal-50" },
            { label: "Total participants", value: uniquePhones.toLocaleString(), icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Avec points", value: participations.filter(p => p.points_earned > 0).length.toLocaleString(), icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Total points distribués", value: totalPointsDistributed.toLocaleString(), icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border border-gray-100">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tableau */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {sortableCols.map((col) => {
                  const isColActive = sortColumn === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`cursor-pointer select-none transition-colors hover:bg-gray-50 ${col.key === "points_earned" ? "text-center" : ""}`}
                      style={isColActive ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Chargement...</span>
                  </div>
                </TableCell></TableRow>
              ) : sortedParticipations.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  Aucun participant trouvé
                </TableCell></TableRow>
              ) : sortedParticipations.map(p => (
                <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell>
                    <a href={`tel:${p.phone}`} className="text-sm font-mono hover:text-teal-700 transition-colors">{p.phone}</a>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{p.email || <span className="text-gray-300">—</span>}</TableCell>
                  <TableCell><code className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{p.cin_number || "—"}</code></TableCell>
                  <TableCell className="text-sm">{p.promotions?.title || <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell>
                    <code className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{p.promo_code}</code>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.points_earned > 0 ? (
                      <span className="flex items-center justify-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold w-fit mx-auto">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        +{p.points_earned}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{fmt(p.scanned_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} / {totalPages || 1} — {total} résultat{total > 1 ? "s" : ""}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                  if (p > totalPages) return null;
                  return (
                    <Button key={p} size="sm" onClick={() => setPage(p)}
                      className="w-8" variant={p === page ? "default" : "outline"}
                      style={p === page ? { backgroundColor: VITOGAZ_GREEN } : {}}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}