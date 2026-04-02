"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trophy, RefreshCw, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";

const VITOGAZ_GREEN = "#008B7F";
const ITEMS_PER_PAGE = 20;

interface LeaderboardEntry {
  phone: string;
  name: string | null;
  total_points: number;
  used_points: number;
  participations_count: number;
}

type RankCriterion = "total_points" | "participations_count" | "used_points";
type SortKey = "rank" | "name" | "phone" | "total_points" | "used_points" | "participations_count";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankCriterion, setRankCriterion] = useState<RankCriterion>("total_points");
  const [currentPage, setCurrentPage] = useState(1);

  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<LeaderboardEntry[]>("/scan/leaderboard");
      setEntries(data || []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Chargement impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Tri avec rang calculé
  const rankedEntries = [...entries]
    .sort((a, b) => b[rankCriterion] - a[rankCriterion])
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const sortedEntries = [...rankedEntries].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "rank":
        aValue = a.rank;
        bValue = b.rank;
        break;
      case "name":
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
        break;
      case "phone":
        aValue = a.phone;
        bValue = b.phone;
        break;
      case "total_points":
        aValue = a.total_points;
        bValue = b.total_points;
        break;
      case "used_points":
        aValue = a.used_points;
        bValue = b.used_points;
        break;
      case "participations_count":
        aValue = a.participations_count;
        bValue = b.participations_count;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (entries.length === 0) {
      toast({ title: "Aucune donnée à exporter" });
      return;
    }
    const headers = ["Rang", "Nom", "Téléphone", "Points distribués", "Points échangés", "Participations"];
    const rows = rankedEntries.map((entry) => [
      String(entry.rank),
      entry.name || "",
      entry.phone,
      String(entry.total_points),
      String(entry.used_points),
      String(entry.participations_count),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palmares-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${entries.length} participants exportés` });
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const criterionLabels: Record<RankCriterion, string> = {
    total_points: "Points gagnés",
    participations_count: "Participations",
    used_points: "Points échangés",
  };

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "rank", label: "Rang" },
    { key: "name", label: "Nom" },
    { key: "phone", label: "Téléphone" },
    { key: "total_points", label: "Points distribués" },
    { key: "used_points", label: "Points échangés" },
    { key: "participations_count", label: "Nb participations" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="PALMARÈS DES PARTICIPANTS" />
      <Navigation />

      <main className="p-6">
        {/* Titre + actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Palmarès</h2>
              <p className="text-sm text-gray-500">
                {entries.length} participant{entries.length > 1 ? "s" : ""} classé{entries.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </Button>
            <Button onClick={handleExport} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
              <Download className="w-4 h-4" /> Exporter CSV
            </Button>
          </div>
        </div>

        {/* Critères de classement */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-700">Classement par :</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(criterionLabels) as RankCriterion[]).map((criterion) => (
                  <button
                    key={criterion}
                    onClick={() => {
                      setRankCriterion(criterion);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      rankCriterion === criterion
                        ? "text-white border-transparent"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                    style={
                      rankCriterion === criterion
                        ? { backgroundColor: VITOGAZ_GREEN, borderColor: VITOGAZ_GREEN }
                        : {}
                    }
                  >
                    {criterionLabels[criterion]}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
                      className={`cursor-pointer select-none transition-colors hover:bg-gray-50 ${
                        ["rank", "total_points", "used_points", "participations_count"].includes(col.key)
                          ? "text-center"
                          : ""
                      }`}
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
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm">Chargement...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    Aucun participant
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntries.map((entry) => {
                  const medal = getMedal(entry.rank);
                  return (
                    <TableRow key={entry.phone} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {medal && <span className="text-2xl">{medal}</span>}
                          <span className={`font-bold ${entry.rank <= 3 ? "text-lg" : "text-sm"}`}>
                            {entry.rank}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{entry.name || "—"}</TableCell>
                      <TableCell>
                        <a
                          href={`tel:${entry.phone}`}
                          className="text-sm font-mono hover:text-teal-700 transition-colors"
                        >
                          {entry.phone}
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: rankCriterion === "total_points" ? VITOGAZ_GREEN : undefined }}
                        >
                          {entry.total_points.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: rankCriterion === "used_points" ? VITOGAZ_GREEN : undefined }}
                        >
                          {entry.used_points.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: rankCriterion === "participations_count" ? VITOGAZ_GREEN : undefined }}
                        >
                          {entry.participations_count.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
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
              {startIndex + 1}-{Math.min(endIndex, sortedEntries.length)} sur {sortedEntries.length} participant
              {sortedEntries.length > 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}