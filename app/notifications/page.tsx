"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell, BellOff, Send, Users, MapPin, Megaphone,
  BarChart2, Loader2, Tag, Building2, Truck,
  Clock, CheckCircle, XCircle, RefreshCw,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";

// ── 4 types cohérents avec le backend et la page Paramètres utilisateur ──────
type NotificationType = "PROMOTIONS" | "RESELLERS" | "DELIVERY" | "BROADCAST";

// URLs par défaut selon le type — identiques au backend
const DEFAULT_URLS: Record<NotificationType, string> = {
  PROMOTIONS: "/fr/promotions",
  RESELLERS:  "/fr/revendeurs",
  DELIVERY:   "/fr/commander",
  BROADCAST:  "/fr",
};

// Libellés et icônes pour l'UI
const TYPE_CONFIG: Record<NotificationType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  audience: string;
}> = {
  PROMOTIONS: {
    label:       "🎁 Promotions & offres",
    description: "Abonnés aux alertes promotions",
    icon:        <Tag className="w-4 h-4 text-amber-500" />,
    audience:    "Abonnés Promotions",
  },
  RESELLERS: {
    label:       "🏪 Nouveaux revendeurs",
    description: "Abonnés aux alertes revendeurs",
    icon:        <Building2 className="w-4 h-4 text-emerald-600" />,
    audience:    "Abonnés Revendeurs",
  },
  DELIVERY: {
    label:       "🚚 Nouvelles sociétés de livraison",
    description: "Abonnés aux alertes livraison",
    icon:        <Truck className="w-4 h-4 text-blue-500" />,
    audience:    "Abonnés Livraison",
  },
  BROADCAST: {
    label:       "📢 Infos Vitogaz",
    description: "Tous les abonnés actifs",
    icon:        <Megaphone className="w-4 h-4 text-purple-500" />,
    audience:    "Tous les abonnés",
  },
};

interface NotificationStats {
  total:  number;
  active: number;
  byZone: Record<string, number>;
}

interface SendResult {
  sent:   number;
  failed: number;
}

interface HistoryEntry {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  sent:      number;
  failed:    number;
  zones:     string[];
  sentAt:    string;
}

// Historique stocké en localStorage (pas de backend pour ça)
const HISTORY_KEY = "notif-history";
const loadHistory = (): HistoryEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
};
const saveHistory = (entry: HistoryEntry) => {
  const history = loadHistory();
  const updated = [entry, ...history].slice(0, 10); // max 10
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export default function NotificationsPage() {
  const { canWrite } = useCurrentUser();

  const [stats, setStats]               = useState<NotificationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [history, setHistory]           = useState<HistoryEntry[]>([]);

  // Formulaire
  const [type, setType]               = useState<NotificationType>("BROADCAST");
  const [title, setTitle]             = useState("");
  const [body, setBody]               = useState("");
  const [url, setUrl]                 = useState(DEFAULT_URLS["BROADCAST"]);
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [sending, setSending]         = useState(false);
  const [lastResult, setLastResult]   = useState<SendResult | null>(null);

  useEffect(() => {
    fetchStats();
    setHistory(loadHistory());
  }, []);

  // URL par défaut selon le type sélectionné
  useEffect(() => {
    setUrl(DEFAULT_URLS[type]);
  }, [type]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({ title: "Erreur", description: "Le titre et le message sont obligatoires", variant: "destructive" });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const payload = {
        type,
        title:       title.trim(),
        body:        body.trim(),
        url:         url.trim() || DEFAULT_URLS[type],
        targetZones: targetZones.length > 0 ? targetZones : [],
        tag:         type.toLowerCase(),
      };

      const result = await apiPost<SendResult>("/notifications/send", payload);
      setLastResult(result);

      // Sauvegarder dans l'historique local
      const entry: HistoryEntry = {
        id:     Date.now().toString(),
        type,
        title:  title.trim(),
        body:   body.trim(),
        sent:   result.sent,
        failed: result.failed,
        zones:  targetZones,
        sentAt: new Date().toISOString(),
      };
      saveHistory(entry);
      setHistory(loadHistory());

      toast({
        title:       result.sent > 0 ? "Notification envoyée !" : "Aucun destinataire",
        description: `${result.sent} notifié(s) • ${result.failed} échec(s)`,
      });

      await fetchStats();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer la notification", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setType("BROADCAST");
    setTitle("");
    setBody("");
    setUrl(DEFAULT_URLS["BROADCAST"]);
    setTargetZones([]);
    setLastResult(null);
  };

  // Audience estimée selon le type et les zones
  const estimatedAudience = (): string => {
    if (!stats) return "—";
    if (targetZones.length > 0) {
      return `~${targetZones.length} zone(s) ciblée(s)`;
    }
    return `${stats.active} abonné(s) actif(s)`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="NOTIFICATIONS PUSH" />
      <Navigation />

      <main className="p-6 max-w-5xl mx-auto">

        {/* Titre */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Notifications Push</h2>
              <p className="text-sm text-gray-500">
                Envoyez des alertes directement sur les appareils des utilisateurs
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* ── Statistiques ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6f4f3" }}>
                  <Users className="w-5 h-5" style={{ color: VITOGAZ_GREEN }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total abonnés</p>
                  <p className="text-2xl font-bold">{loadingStats ? "—" : stats?.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Abonnés actifs</p>
                  <p className="text-2xl font-bold text-emerald-600">{loadingStats ? "—" : stats?.active ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Zones couvertes</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {loadingStats ? "—" : Object.keys(stats?.byZone ?? {}).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Répartition par zone */}
        {!loadingStats && stats && Object.keys(stats.byZone).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                Abonnés par zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byZone)
                  .sort(([, a], [, b]) => b - a)
                  .map(([zone, count]) => (
                    <div key={zone} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                      style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                      <span className="font-medium">{zone}</span>
                      <span className="bg-white rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ color: VITOGAZ_GREEN }}>{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Formulaire ── */}
          <div className="lg:col-span-2">
            {canWrite ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" style={{ color: VITOGAZ_GREEN }} />
                    Composer une notification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSend} className="space-y-5">

                    {/* ── Type = Audience ── */}
                    <div>
                      <Label>Audience *</Label>
                      <p className="text-xs text-gray-400 mb-2">
                        Seuls les abonnés ayant activé ce type d'alerte recevront la notification
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((t) => {
                          const config = TYPE_CONFIG[t];
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setType(t)}
                              className={`text-left p-3 rounded-xl border-2 transition-all ${
                                type === t
                                  ? "border-[#008B7F] bg-[#e6f4f3]"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <p className="font-medium text-sm">{config.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Titre ── */}
                    <div>
                      <Label htmlFor="notif-title">Titre *</Label>
                      <Input
                        id="notif-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          type === "PROMOTIONS" ? "Ex: 🎁 -20% sur les bouteilles ce weekend" :
                          type === "RESELLERS"  ? "Ex: 🏪 Nouveau revendeur à Analakely" :
                          type === "DELIVERY"   ? "Ex: 🚚 Nouvelle société de livraison disponible" :
                          "Ex: 📢 Information importante de Vitogaz"
                        }
                        maxLength={100}
                        required
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
                    </div>

                    {/* ── Message ── */}
                    <div>
                      <Label htmlFor="notif-body">Message *</Label>
                      <Textarea
                        id="notif-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={
                          type === "PROMOTIONS" ? "Ex: Profitez de -20% sur toutes les bouteilles 12.5kg jusqu'au 31 mars" :
                          type === "RESELLERS"  ? "Ex: Un nouveau point de vente vient d'ouvrir près de chez vous" :
                          type === "DELIVERY"   ? "Ex: Express Gaz Madagascar livre maintenant à domicile en 2h" :
                          "Ex: Nos agences seront fermées le samedi 30 mars pour maintenance"
                        }
                        maxLength={200}
                        rows={3}
                        required
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">{body.length}/200</p>
                    </div>

                    {/* ── URL de redirection ── */}
                    <div>
                      <Label htmlFor="notif-url">Page à ouvrir au clic</Label>
                      <Input
                        id="notif-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Pré-remplie selon le type — modifiable si besoin
                      </p>
                    </div>

                    {/* ── Ciblage par zone (optionnel) ── */}
                    <div>
                      <Label>Restreindre à une zone <span className="font-normal text-gray-400">(optionnel)</span></Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Sans sélection → envoi à {TYPE_CONFIG[type].audience} ({estimatedAudience()})
                      </p>
                      <ZoneSelector
                        selectedZones={targetZones}
                        onChange={setTargetZones}
                        label=""
                        placeholder="Toutes les zones..."
                      />
                      {targetZones.length > 0 && (
                        <p className="text-xs mt-2" style={{ color: VITOGAZ_GREEN }}>
                          Envoi restreint à : {targetZones.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* ── Résumé avant envoi ── */}
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                      <strong>Résumé :</strong> Notification de type{" "}
                      <span className="font-semibold text-gray-800">{TYPE_CONFIG[type].label}</span>
                      {" "}→ {targetZones.length > 0
                        ? `zones : ${targetZones.join(", ")}`
                        : TYPE_CONFIG[type].audience
                      }
                    </div>

                    {/* ── Résultat du dernier envoi ── */}
                    {lastResult && (
                      <div className="p-4 rounded-xl border"
                        style={{ backgroundColor: "#e6f4f3", borderColor: "#008B7F33" }}>
                        <p className="font-medium text-sm" style={{ color: VITOGAZ_GREEN }}>
                          Résultat de l'envoi
                        </p>
                        <div className="flex gap-6 mt-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <div>
                              <p className="text-xl font-bold text-emerald-600">{lastResult.sent}</p>
                              <p className="text-xs text-gray-500">Notifié(s)</p>
                            </div>
                          </div>
                          {lastResult.failed > 0 && (
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <div>
                                <p className="text-xl font-bold text-red-500">{lastResult.failed}</p>
                                <p className="text-xs text-gray-500">Échec(s)</p>
                              </div>
                            </div>
                          )}
                          {lastResult.sent === 0 && lastResult.failed === 0 && (
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <BellOff className="w-4 h-4" />
                              Aucun abonné ne correspond à ces critères
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Boutons ── */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={sending || !title.trim() || !body.trim()}
                        className="gap-2 text-white flex-1 sm:flex-none"
                        style={{ backgroundColor: VITOGAZ_GREEN }}
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Envoyer
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleReset}>
                        Réinitialiser
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    Vous n'avez pas les droits pour envoyer des notifications.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Historique ── */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Aucun envoi récent
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id}
                        className="p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            {TYPE_CONFIG[entry.type]?.icon}
                            <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                              {entry.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-600">{entry.sent}</span>
                            {entry.failed > 0 && (
                              <span className="text-xs text-red-400">/ {entry.failed}✗</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{entry.body}</p>
                        {entry.zones.length > 0 && (
                          <p className="text-xs mt-1" style={{ color: VITOGAZ_GREEN }}>
                            {entry.zones.join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(entry.sentAt).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}