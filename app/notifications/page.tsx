"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell, BellOff, Send, Users, MapPin, Megaphone,
  Loader2, Tag, Building2, Truck, CheckCircle,
  XCircle, RefreshCw, Edit2, Save, X, ChevronLeft,
  ChevronRight, Info,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";
const HISTORY_KEY = "notif-history";
const HISTORY_PAGE_SIZE = 5;

// ── Types ────────────────────────────────────────────────────────────────────
interface NotificationStats {
  total:  number;
  active: number;
  byZone: Record<string, number>;
}

interface Template {
  id:         string;
  type:       string;
  title:      string;
  body:       string;
  is_active:  boolean;
  updated_at: string;
}

interface SendResult {
  sent:   number;
  failed: number;
}

interface HistoryEntry {
  id:     string;
  title:  string;
  body:   string;
  sent:   number;
  failed: number;
  zones:  string[];
  sentAt: string;
}

// ── Helpers historique ───────────────────────────────────────────────────────
const loadHistory = (): HistoryEntry[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
};
const saveHistory = (entry: HistoryEntry) => {
  const updated = [entry, ...loadHistory()].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

// ── Config des templates ─────────────────────────────────────────────────────
const TEMPLATE_CONFIG: Record<string, { icon: React.ReactNode; label: string; vars: string[] }> = {
  PROMOTIONS: {
    icon:  <Tag className="w-4 h-4 text-amber-500" />,
    label: "Nouvelles promotions",
    vars:  ["{title}", "{discount}"],
  },
  RESELLERS: {
    icon:  <Building2 className="w-4 h-4 text-emerald-600" />,
    label: "Nouveaux revendeurs",
    vars:  ["{name}", "{city}"],
  },
  DELIVERY: {
    icon:  <Truck className="w-4 h-4 text-blue-500" />,
    label: "Nouvelles sociétés de livraison",
    vars:  ["{name}"],
  },
};

export default function NotificationsPage() {
  const { canWrite } = useCurrentUser();

  // ── Stats ────────────────────────────────────────────────────────────────
  const [stats, setStats]               = useState<NotificationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showAllZones, setShowAllZones] = useState(false);

  // ── Templates ────────────────────────────────────────────────────────────
  const [templates, setTemplates]           = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate]   = useState<string | null>(null);
  const [editTitle, setEditTitle]               = useState("");
  const [editBody, setEditBody]                 = useState("");
  const [savingTemplate, setSavingTemplate]     = useState(false);

  // ── Broadcast manuel ─────────────────────────────────────────────────────
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody]   = useState("");
  const [broadcastUrl, setBroadcastUrl]     = useState("/fr");
  const [sending, setSending]               = useState(false);
  const [lastResult, setLastResult]         = useState<SendResult | null>(null);

  // ── Historique ───────────────────────────────────────────────────────────
  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchTemplates();
    setHistory(loadHistory());
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await apiGet<NotificationStats>("/notifications/stats");
      setStats(data);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les statistiques", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await apiGet<Template[]>("/notifications/templates");
      setTemplates(data || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les templates", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ── Éditer un template ───────────────────────────────────────────────────
  const startEdit = (template: Template) => {
    setEditingTemplate(template.type);
    setEditTitle(template.title);
    setEditBody(template.body);
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditTitle("");
    setEditBody("");
  };

  const saveTemplate = async (type: string) => {
    setSavingTemplate(true);
    try {
      await apiPatch(`/notifications/templates/${type}`, { title: editTitle, body: editBody });
      toast({ title: "Template mis à jour !", description: "Le texte automatique a été enregistré" });
      await fetchTemplates();
      cancelEdit();
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le template", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Envoi broadcast ──────────────────────────────────────────────────────
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast({ title: "Erreur", description: "Titre et message obligatoires", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const result = await apiPost<SendResult>("/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body:  broadcastBody.trim(),
        url:   broadcastUrl.trim() || "/fr",
      });
      setLastResult(result);

      saveHistory({
        id:     Date.now().toString(),
        title:  broadcastTitle.trim(),
        body:   broadcastBody.trim(),
        sent:   result.sent,
        failed: result.failed,
        zones:  [],
        sentAt: new Date().toISOString(),
      });
      setHistory(loadHistory());
      setHistoryPage(1);

      toast({
        title:       result.sent > 0 ? "Notification envoyée !" : "Aucun destinataire",
        description: `${result.sent} notifié(s) • ${result.failed} échec(s)`,
      });

      // ── Réinitialiser automatiquement après succès ────────────────────
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastUrl("/fr");

      await fetchStats();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer la notification", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // ── Pagination historique ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const pagedHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  // ── Zones : affichage compact ────────────────────────────────────────────
  const zoneEntries = Object.entries(stats?.byZone ?? {}).sort(([, a], [, b]) => b - a);
  const visibleZones = showAllZones ? zoneEntries : zoneEntries.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="NOTIFICATIONS PUSH" />
      <Navigation />

      <main className="p-4 sm:p-6">

        {/* ── Titre ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-xl font-bold">Notifications Push</h2>
              <p className="text-sm text-gray-500">Gérez les alertes envoyées aux utilisateurs</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </Button>
        </div>

        {/* ── Grille principale ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Colonne gauche (2/3) ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* ── Stats compactes ── */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#e6f4f3" }}>
                      <Users className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold">{loadingStats ? "—" : stats?.total ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Actifs</p>
                      <p className="text-lg font-bold text-emerald-600">{loadingStats ? "—" : stats?.active ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Zones</p>
                      <p className="text-lg font-bold text-blue-600">
                        {loadingStats ? "—" : zoneEntries.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Zones compactes ── */}
            {zoneEntries.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {visibleZones.map(([zone, count]) => (
                      <div key={zone}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                        style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                        <span className="font-medium">{zone}</span>
                        <span className="bg-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                          style={{ color: VITOGAZ_GREEN }}>{count}</span>
                      </div>
                    ))}
                    {zoneEntries.length > 6 && (
                      <button
                        onClick={() => setShowAllZones(!showAllZones)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
                      >
                        {showAllZones ? "Réduire" : `+${zoneEntries.length - 6} zones`}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── 1. Infos Vitogaz — envoi manuel (prioritaire) ── */}
            <Card className="border-2" style={{ borderColor: VITOGAZ_GREEN + "40" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#e6f4f3" }}>
                    <Megaphone className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                  </div>
                  Infos Vitogaz
                  <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: VITOGAZ_GREEN }}>
                    Envoi manuel
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canWrite ? (
                  <form onSubmit={handleBroadcast} className="space-y-4">
                    <div>
                      <Label htmlFor="bc-title">
                        Titre <span className="text-xs text-gray-400 font-normal">({broadcastTitle.length}/65)</span>
                      </Label>
                      <Input
                        id="bc-title"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="Ex: 📢 Information importante de Vitogaz"
                        maxLength={65}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bc-body">
                        Message <span className="text-xs text-gray-400 font-normal">({broadcastBody.length}/240)</span>
                      </Label>
                      <Textarea
                        id="bc-body"
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        placeholder="Ex: Nos agences seront fermées le samedi 30 mars"
                        maxLength={240}
                        rows={3}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bc-url">Page à ouvrir au clic</Label>
                      <Input
                        id="bc-url"
                        value={broadcastUrl}
                        onChange={(e) => setBroadcastUrl(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Résumé audience */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      Envoi à tous les abonnés actifs ({stats?.active ?? 0})
                    </div>

                    {/* Résultat dernier envoi */}
                    {lastResult && (
                      <div className="flex items-center gap-6 p-3 rounded-lg border"
                        style={{ backgroundColor: "#e6f4f3", borderColor: "#008B7F33" }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-600">{lastResult.sent}</span>
                          <span className="text-xs text-gray-500">notifié(s)</span>
                        </div>
                        {lastResult.failed > 0 && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-lg font-bold text-red-500">{lastResult.failed}</span>
                            <span className="text-xs text-gray-500">échec(s)</span>
                          </div>
                        )}
                        {lastResult.sent === 0 && lastResult.failed === 0 && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <BellOff className="w-4 h-4" />
                            Aucun abonné actif
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={sending || !broadcastTitle.trim() || !broadcastBody.trim()}
                      className="gap-2 text-white"
                      style={{ backgroundColor: VITOGAZ_GREEN }}
                    >
                      {sending
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours...</>
                        : <><Send className="w-4 h-4" />Envoyer à tous</>
                      }
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">Droits insuffisants</p>
                )}
              </CardContent>
            </Card>

            {/* ── 2. Templates automatiques ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Edit2 className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                  Templates automatiques
                  <div className="ml-auto flex items-center gap-1 text-xs font-normal text-gray-400">
                    <Info className="w-3.5 h-3.5" />
                    Envoyés automatiquement à la création
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => {
                      const config = TEMPLATE_CONFIG[template.type];
                      const isEditing = editingTemplate === template.type;
                      return (
                        <div key={template.type}
                          className="border border-gray-200 rounded-xl p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {config?.icon}
                              <span className="text-sm font-semibold text-gray-800">
                                {config?.label || template.type}
                              </span>
                            </div>
                            {canWrite && !isEditing && (
                              <Button variant="outline" size="sm" onClick={() => startEdit(template)}
                                className="h-7 gap-1 text-xs">
                                <Edit2 className="w-3 h-3" />
                                Modifier
                              </Button>
                            )}
                            {isEditing && (
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" onClick={cancelEdit}
                                  className="h-7 gap-1 text-xs">
                                  <X className="w-3 h-3" />
                                  Annuler
                                </Button>
                                <Button size="sm" onClick={() => saveTemplate(template.type)}
                                  disabled={savingTemplate}
                                  className="h-7 gap-1 text-xs text-white"
                                  style={{ backgroundColor: VITOGAZ_GREEN }}>
                                  {savingTemplate
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Save className="w-3 h-3" />
                                  }
                                  Enregistrer
                                </Button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Titre</Label>
                                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                  maxLength={65} className="mt-1 text-sm h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">Message</Label>
                                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                                  maxLength={240} rows={2} className="mt-1 text-sm" />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-400">Variables :</span>
                                {config?.vars.map(v => (
                                  <code key={v} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{v}</code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-800">{template.title}</p>
                              <p className="text-sm text-gray-500">{template.body}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {config?.vars.map(v => (
                                  <code key={v} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{v}</code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* ── Colonne droite (1/3) — Historique ── */}
          <div className="xl:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Historique</span>
                  {history.length > 0 && (
                    <span className="text-xs font-normal text-gray-400">
                      {history.length} envoi(s)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pagedHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun envoi récent</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {pagedHistory.map((entry) => (
                        <div key={entry.id}
                          className="p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                              {entry.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-bold text-emerald-600">{entry.sent}✓</span>
                              {entry.failed > 0 && (
                                <span className="text-xs text-red-400">{entry.failed}✗</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{entry.body}</p>
                          <p className="text-[10px] text-gray-300 mt-1">
                            {new Date(entry.sentAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-xs text-gray-500">
                          {historyPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                          disabled={historyPage === totalPages}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}