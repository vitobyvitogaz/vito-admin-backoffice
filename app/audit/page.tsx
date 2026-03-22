"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, Shield, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changes: Record<string, any> | null;
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

// Champs à exclure de l'affichage (trop verbeux ou inutiles)
const EXCLUDED_KEYS = ['id', 'created_at', 'updated_at', 'deleted_at', 'created_by_id', 'updated_by_id'];

// Formatage d'une valeur pour affichage lisible
function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Panneau de détails d'un log
function LogDetails({ log }: { log: AuditLog }) {
  if (log.action === 'CREATE' && log.new_data) {
    const entries = Object.entries(log.new_data).filter(([k]) => !EXCLUDED_KEYS.includes(k));
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Données créées :</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs">
              <span className="text-gray-500 font-medium min-w-[100px]">{key}</span>
              <span className="text-gray-800 truncate max-w-[200px]">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (log.action === 'UPDATE') {
    // Si old_data disponible, afficher les champs qui ont changé
    if (log.old_data && log.new_data) {
      const changedKeys = Object.keys(log.new_data).filter(
        (k) => !EXCLUDED_KEYS.includes(k) && JSON.stringify(log.old_data![k]) !== JSON.stringify(log.new_data![k])
      );
      if (changedKeys.length === 0) {
        // Afficher new_data si aucun changement détecté
        const entries = Object.entries(log.new_data).filter(([k]) => !EXCLUDED_KEYS.includes(k));
        if (entries.length === 0) return null;
        return (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700 mb-2">Données modifiées :</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {entries.map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-gray-500 font-medium min-w-[100px]">{key}</span>
                  <span className="text-gray-800 truncate max-w-[200px]">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-blue-700 mb-2">Champs modifiés :</p>
          <div className="space-y-2">
            {changedKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium min-w-[100px]">{key}</span>
                <span className="text-red-500 line-through truncate max-w-[160px]">{formatValue(log.old_data![key])}</span>
                <span className="text-gray-400">→</span>
                <span className="text-emerald-700 font-medium truncate max-w-[160px]">{formatValue(log.new_data![key])}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    // Seulement new_data disponible
    if (log.new_data) {
      const entries = Object.entries(log.new_data).filter(([k]) => !EXCLUDED_KEYS.includes(k));
      if (entries.length === 0) return null;
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-blue-700 mb-2">Données modifiées :</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-gray-500 font-medium min-w-[100px]">{key}</span>
                <span className="text-gray-800 truncate max-w-[200px]">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (log.action === 'DELETE') {
    return (
      <div className="text-xs text-red-600">
        <p className="font-semibold mb-1">Ressource supprimée :</p>
        <p>ID : <span className="font-mono">{log.resource_id || '—'}</span></p>
        {log.resource_name && <p>Nom : <span className="font-medium">{log.resource_name}</span></p>}
        {log.old_data && (
          <div className="mt-2 space-y-1">
            {Object.entries(log.old_data).filter(([k]) => !EXCLUDED_KEYS.includes(k)).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-gray-500 font-medium min-w-[100px]">{key}</span>
                <span className="text-gray-800 truncate max-w-[200px]">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const hasDetails = (log: AuditLog) =>
    (log.new_data && Object.keys(log.new_data).length > 0) ||
    (log.old_data && Object.keys(log.old_data).length > 0) ||
    log.action === 'DELETE';

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
                <TableHead className="w-6"></TableHead>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">Aucune entrée trouvée</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <>
                    <TableRow
                      key={log.id}
                      className={`hover:bg-gray-50 ${hasDetails(log) ? "cursor-pointer" : ""} ${expandedId === log.id ? "bg-gray-50" : ""}`}
                      onClick={() => hasDetails(log) && toggleExpand(log.id)}
                    >
                      {/* Chevron dépliable */}
                      <TableCell className="w-6 pr-0">
                        {hasDetails(log) ? (
                          expandedId === log.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : <span />}
                      </TableCell>
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

                    {/* Panneau dépliable avec les détails */}
                    {expandedId === log.id && hasDetails(log) && (
                      <TableRow key={`${log.id}-details`} className="bg-gray-50 border-b border-gray-100">
                        <TableCell colSpan={7} className="py-4 px-8">
                          <LogDetails log={log} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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