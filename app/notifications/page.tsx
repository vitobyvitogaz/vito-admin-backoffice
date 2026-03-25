"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Send,
  Users,
  MapPin,
  Megaphone,
  BarChart2,
  Loader2,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";

type NotificationType =
  | "BROADCAST"
  | "PROMO_NEW"
  | "PROMO_EXPIRING"
  | "PROMO_GEO"
  | "RESELLER_NEW";

interface NotificationStats {
  total: number;
  active: number;
  byZone: Record<string, number>;
}

interface SendResult {
  sent: number;
  failed: number;
}

const NOTIFICATION_TYPES: { value: NotificationType; label: string; description: string }[] = [
  { value: "BROADCAST", label: "📢 Message général", description: "Envoyer à tous les abonnés" },
  { value: "PROMO_NEW", label: "🎁 Nouvelle promotion", description: "Annoncer une nouvelle promotion" },
  { value: "PROMO_EXPIRING", label: "⏰ Promotion expirant", description: "Rappel avant expiration" },
  { value: "PROMO_GEO", label: "📍 Promotion géolocalisée", description: "Cibler une zone spécifique" },
  { value: "RESELLER_NEW", label: "🏪 Nouveau revendeur", description: "Annoncer un nouveau point de vente" },
]

const DEFAULT_URLS: Record<NotificationType, string> = {
  BROADCAST: "/fr",
  PROMO_NEW: "/fr/promotions",
  PROMO_EXPIRING: "/fr/promotions",
  PROMO_GEO: "/fr/promotions",
  RESELLER_NEW: "/fr/revendeurs",
}

export default function NotificationsPage() {
  const { canWrite } = useCurrentUser();

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const [type, setType] = useState<NotificationType>("BROADCAST");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/fr");
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  // Mettre à jour l'URL par défaut selon le type
  useEffect(() => {
    setUrl(DEFAULT_URLS[type]);
  }, [type]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await apiGet<NotificationStats>("/notifications/stats");
      setStats(data);
    } catch (error) {
      console.error("Erreur stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre et le message sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const payload = {
        type,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || DEFAULT_URLS[type],
        targetZones: targetZones.length > 0 ? targetZones : [],
        tag: type.toLowerCase(),
      };

      const result = await apiPost<SendResult>("/notifications/send", payload);
      setLastResult(result);

      toast({
        title: "Notification envoyée !",
        description: `${result.sent} appareil(s) notifié(s) • ${result.failed} échec(s)`,
      });

      // Rafraîchir les stats
      await fetchStats();
    } catch (error) {
      console.error("Erreur envoi:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setType("BROADCAST");
    setTitle("");
    setBody("");
    setUrl("/fr");
    setTargetZones([]);
    setLastResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="NOTIFICATIONS PUSH" />
      <Navigation />

      <main className="p-6">
        {/* Titre page */}
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
          <div>
            <h2 className="text-2xl font-bold">Notifications Push</h2>
            <p className="text-sm text-gray-500">
              Envoyer des notifications aux utilisateurs de l'application
            </p>
          </div>
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
                  <p className="text-2xl font-bold">
                    {loadingStats ? "—" : stats?.total ?? 0}
                  </p>
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
                  <p className="text-2xl font-bold text-emerald-600">
                    {loadingStats ? "—" : stats?.active ?? 0}
                  </p>
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

        {/* ── Répartition par zone ── */}
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
                    <div
                      key={zone}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                      style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}
                    >
                      <span className="font-medium">{zone}</span>
                      <span className="bg-white rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: VITOGAZ_GREEN }}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Formulaire d'envoi ── */}
        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" style={{ color: VITOGAZ_GREEN }} />
                Envoyer une notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-6">

                {/* Type */}
                <div>
                  <Label>Type de notification *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    {NOTIFICATION_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          type === t.value
                            ? "border-[#008B7F] bg-[#e6f4f3]"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <Label htmlFor="notif-title">Titre *</Label>
                  <Input
                    id="notif-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: 🎁 Nouvelle promotion Vitogaz"
                    maxLength={100}
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">{title.length}/100 caractères</p>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="notif-body">Message *</Label>
                  <Textarea
                    id="notif-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Ex: -20% sur les bouteilles 12.5kg — valable jusqu'au 31 mars"
                    maxLength={200}
                    rows={3}
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">{body.length}/200 caractères</p>
                </div>

                {/* URL de redirection */}
                <div>
                  <Label htmlFor="notif-url">URL de redirection</Label>
                  <Input
                    id="notif-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/fr/promotions"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Page ouverte au clic sur la notification
                  </p>
                </div>

                {/* Zones cibles */}
                <div>
                  <Label>Zones cibles</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Laisser vide pour envoyer à tous les abonnés ({stats?.active ?? 0} actifs)
                  </p>
                  <ZoneSelector
                    selectedZones={targetZones}
                    onChange={setTargetZones}
                    label=""
                    placeholder="Sélectionner des zones (optionnel)..."
                  />
                  {targetZones.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: VITOGAZ_GREEN }}>
                      → Envoi ciblé vers {targetZones.length} zone(s) :{" "}
                      {targetZones.join(", ")}
                    </p>
                  )}
                </div>

                {/* Résultat du dernier envoi */}
                {lastResult && (
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: "#e6f4f3", borderColor: "#008B7F33" }}>
                    <p className="font-medium text-sm" style={{ color: VITOGAZ_GREEN }}>
                      Dernier envoi
                    </p>
                    <div className="flex gap-6 mt-2">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{lastResult.sent}</p>
                        <p className="text-xs text-gray-500">Notifié(s)</p>
                      </div>
                      {lastResult.failed > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-red-500">{lastResult.failed}</p>
                          <p className="text-xs text-gray-500">Échec(s)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={sending || !title.trim() || !body.trim()}
                    className="gap-2 text-white"
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
                        Envoyer{targetZones.length > 0 ? ` aux zones sélectionnées` : " à tous"}
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
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                Vous n'avez pas les droits pour envoyer des notifications.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}