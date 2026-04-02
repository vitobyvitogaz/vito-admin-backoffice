"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Gift, Check, X, RefreshCw, Clock, CheckCircle, XCircle, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";
const ITEMS_PER_PAGE = 20;

interface Exchange {
  id: string;
  phone: string;
  name: string | null;
  cin_number: string | null;
  points_requested: number;
  reward_description: string | null;
  status: "pending" | "validated" | "rejected";
  requested_at: string;
  validated_at: string | null;
}

type StatusFilter = "all" | "pending" | "validated" | "rejected";
type SortKey = "name" | "phone" | "cin_number" | "points_requested" | "reward_description" | "status" | "requested_at";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:   { label: "En attente", bg: "bg-amber-100",  text: "text-amber-700",  icon: Clock },
  validated: { label: "Validé",     bg: "bg-emerald-100",text: "text-emerald-700",icon: CheckCircle },
  rejected:  { label: "Rejeté",     bg: "bg-red-100",    text: "text-red-700",    icon: XCircle },
};

export default function PointsExchangePage() {
  const { canManageScans } = useCurrentUser();

  const [exchanges, setExchanges]   = useState<Exchange[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<StatusFilter>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "validate" | "reject"; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      // const data   = await apiGet<Exchange[]>(`/scan/admin/exchanges${params}`);
      const data = await apiGet<Exchange[]>(`/points-exchange${params}`);
      setExchanges(data || []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Chargement impossible", variant: "destructive" });
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleValidate = async (id: string) => {
    setProcessingId(id);
    setConfirmAction(null);
    try {
      await apiPatch(`/scan/admin/exchanges/${id}/validate`, {});
      toast({ title: "Échange validé !", description: "Les points ont été déduits du solde." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setConfirmAction(null);
    try {
      await apiPatch(`/scan/admin/exchanges/${id}/reject`, {});
      toast({ title: "Échange rejeté", description: "La demande a été refusée." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

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

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    }
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const sortedExchanges = [...exchanges].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "name":
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
        break;
      case "phone":
        aValue = a.phone;
        bValue = b.phone;
        break;
      case "cin_number":
        aValue = a.cin_number || "";
        bValue = b.cin_number || "";
        break;
      case "points_requested":
        aValue = a.points_requested;
        bValue = b.points_requested;
        break;
      case "reward_description":
        aValue = (a.reward_description || "").toLowerCase();
        bValue = (b.reward_description || "").toLowerCase();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "requested_at":
        aValue = new Date(a.requested_at).getTime();
        bValue = new Date(b.requested_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedExchanges.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedExchanges = sortedExchanges.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (exchanges.length === 0) { toast({ title: "Aucune donnée à exporter" }); return; }
    const headers = ["Participant", "Téléphone", "CIN", "Points", "Récompense", "Statut", "Date demande", "Date validation"];
    const rows = exchanges.map(ex => [
      ex.name || "",
      ex.phone,
      ex.cin_number || "",
      String(ex.points_requested),
      ex.reward_description || "",
      STATUS_CONFIG[ex.status]?.label || ex.status,
      new Date(ex.requested_at).toLocaleString("fr-FR"),
      ex.validated_at ? new Date(ex.validated_at).toLocaleString("fr-FR") : "",
    ]);
    const csv  = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `echanges-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${exchanges.length} échanges exportés` });
  };

  const fmt     = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const pending = exchanges.filter(e => e.status === "pending").length;

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Participant" },
    { key: "phone", label: "Téléphone" },
    { key: "cin_number", label: "CIN" },
    { key: "points_requested", label: "Points" },
    { key: "reward_description", label: "Récompense souhaitée" },
    { key: "status", label: "Statut" },
    { key: "requested_at", label: "Date demande" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="ÉCHANGES DE POINTS" />
      <Navigation />

      <main className="p-6">

        {/* Titre */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Échanges de points</h2>
              <p className="text-sm text-gray-500">
                {pending > 0
                  ? <span className="text-amber-600 font-semibold">{pending} demande{pending > 1 ? "s" : ""} en attente</span>
                  : "Aucune demande en attente"}
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

        {/* Filtres de statut */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "validated", "rejected"] as StatusFilter[]).map(s => {
            const cfg   = s === "all" ? null : STATUS_CONFIG[s];
            const count = s === "all" ? exchanges.length : exchanges.filter(e => e.status === s).length;
            return (
              <button key={s} onClick={() => { setFilter(s); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                  filter === s
                    ? "text-white border-transparent"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                }`}
                style={filter === s ? { backgroundColor: VITOGAZ_GREEN, borderColor: VITOGAZ_GREEN } : {}}>
                {cfg && <cfg.icon className="w-3.5 h-3.5" />}
                {s === "all" ? "Toutes" : cfg?.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? "bg-white/20" : "bg-gray-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dialogue de confirmation */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-bold mb-2">
                {confirmAction.action === "validate" ? "Valider cet échange ?" : "Rejeter cet échange ?"}
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                {confirmAction.action === "validate"
                  ? `Les points seront déduits du solde de ${confirmAction.name}. Cette action est irréversible.`
                  : `La demande de ${confirmAction.name} sera refusée.`}
              </p>
              <div className="flex gap-3">
                <Button onClick={() => confirmAction.action === "validate" ? handleValidate(confirmAction.id) : handleReject(confirmAction.id)}
                  className="flex-1 text-white gap-2"
                  style={{ backgroundColor: confirmAction.action === "validate" ? VITOGAZ_GREEN : "#ef4444" }}>
                  {confirmAction.action === "validate" ? <><Check className="w-4 h-4" /> Valider</> : <><X className="w-4 h-4" /> Rejeter</>}
                </Button>
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Annuler</Button>
              </div>
            </div>
          </div>
        )}

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
                      className={`cursor-pointer select-none transition-colors hover:bg-gray-50 ${col.key === "points_requested" ? "text-center" : ""}`}
                      style={isColActive ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </TableHead>
                  );
                })}
                {canManageScans && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={canManageScans ? 8 : 7} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Chargement...</span>
                  </div>
                </TableCell></TableRow>
              ) : paginatedExchanges.length === 0 ? (
                <TableRow><TableCell colSpan={canManageScans ? 8 : 7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Gift className="w-10 h-10 text-gray-200" strokeWidth={1} />
                    <p className="text-gray-400 text-sm">Aucun échange{filter !== "all" ? ` "${STATUS_CONFIG[filter]?.label.toLowerCase()}"` : ""}</p>
                  </div>
                </TableCell></TableRow>
              ) : paginatedExchanges.map(ex => {
                const cfg  = STATUS_CONFIG[ex.status];
                const Icon = cfg?.icon;
                return (
                  <TableRow key={ex.id} className={`hover:bg-gray-50 transition-colors ${ex.status === "pending" ? "bg-amber-50/30" : ""}`}>
                    <TableCell className="font-medium text-sm">{ex.name || "—"}</TableCell>
                    <TableCell>
                      <a href={`tel:${ex.phone}`} className="text-sm font-mono hover:text-teal-700 transition-colors">{ex.phone}</a>
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{ex.cin_number || "—"}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 font-bold text-sm" style={{ color: VITOGAZ_GREEN }}>
                        <Gift className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {ex.points_requested}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 max-w-[220px]">
                      <p className="truncate" title={ex.reward_description || ""}>{ex.reward_description || <span className="text-gray-300">—</span>}</p>
                    </TableCell>
                    <TableCell>
                      {cfg && Icon && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                          {cfg.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{fmt(ex.requested_at)}</TableCell>
                    {canManageScans && (
                      <TableCell className="text-right">
                        {/* {ex.status === "pending" ? ( */}
                        {ex.status?.toLowerCase() === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="gap-1.5 text-white"
                              style={{ backgroundColor: VITOGAZ_GREEN }}
                              disabled={processingId === ex.id}
                              onClick={() => setConfirmAction({ id: ex.id, action: "validate", name: ex.name || ex.phone })}>
                              <Check className="w-3.5 h-3.5" /> Valider
                            </Button>
                            <Button size="sm" variant="outline"
                              className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                              disabled={processingId === ex.id}
                              onClick={() => setConfirmAction({ id: ex.id, action: "reject", name: ex.name || ex.phone })}>
                              <X className="w-3.5 h-3.5" /> Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {ex.validated_at ? fmt(ex.validated_at) : "—"}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Footer avec pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <div className="flex items-center gap-4">
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {startIndex + 1}-{Math.min(endIndex, sortedExchanges.length)} sur {sortedExchanges.length} échange{sortedExchanges.length > 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}