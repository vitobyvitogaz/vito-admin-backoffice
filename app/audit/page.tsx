"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { isAuthenticated } from "@/lib/auth";

const VITOGAZ_GREEN = "#008B7F";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vito-backend-supabase.onrender.com/api/v1';
const PAGE_SIZE = 20;

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  READ: "bg-gray-50 text-gray-500",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  READ: "Lecture",
};

export default function AuditPage() {
  const router = useRouter();
  const { canViewAudit, role } = useCurrentUser();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
  }, [router]);

  useEffect(() => {
    if (role !== null && !canViewAudit) router.push("/");
  }, [role, canViewAudit, router]);

  const fetchLogs = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vito_auth_token');
      const res = await fetch(`${API_URL}/audit?page=${currentPage}&limit=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement journal');
      const data: AuditResponse = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewAudit) fetchLogs(page);
  }, [canViewAudit, fetchLogs, page]);

  // Filtre local sur les résultats de la page courante
  const filteredLogs = logs.filter((l) => {
    const matchAction = actionFilter === "ALL" || l.action === actionFilter;
    const matchSearch = !searchQuery.trim() || [l.user_email, l.resource_type, l.resource_name, l.action]
      .some((v) => v && v.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchAction && matchSearch;
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchQuery("");
    setActionFilter("ALL");
  };

  if (role !== null && !canViewAudit) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Journal des activités" />
      <Navigation />

      <main className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Journal d'audit</h2>
              <p className="text-sm text-gray-500">{total} entrée(s) au total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
            <Shield className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700">SUPER_ADMIN uniquement</span>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Filtrer par email, ressource, action..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">Toutes les actions</option>
                <option value="CREATE">Créations</option>
                <option value="UPDATE">Modifications</option>
                <option value="DELETE">Suppressions</option>
                <option value="LOGIN">Connexions</option>
                <option value="LOGOUT">Déconnexions</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Ressource</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Aucune entrée trouvée</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{log.resource_type || "—"}</span>
                        {log.resource_name && <span className="text-xs text-gray-400">{log.resource_name}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{log.user_email || "—"}</TableCell>
                    <TableCell>
                      {log.user_role
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{log.user_role}</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-400">{log.ip_address || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination backend */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages} — {total} entrée(s) au total
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                // Après
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - Math.min(5, totalPages) + 1));
                  const pageNum = startPage + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 rounded-md text-sm font-medium transition-colors border"
                      style={pageNum === page
                        ? { backgroundColor: VITOGAZ_GREEN, color: "white", borderColor: VITOGAZ_GREEN }
                        : { borderColor: "#e5e7eb", color: "#374151" }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}