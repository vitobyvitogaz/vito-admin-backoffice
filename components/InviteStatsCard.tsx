"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";

const VITOGAZ_GREEN = "#008B7F";
const PERIODS = [7, 30, 90] as const;

type Period = (typeof PERIODS)[number];
type Counts = Record<string, number>;

interface InviteStats {
  since: string;
  totals: Record<string, Counts>;
}

const SOURCES: { key: string; label: string; hint: string }[] = [
  { key: "install", label: "À l'installation", hint: "Carte proposée à l'installation ou au premier lancement de l'application installée" },
  { key: "banner", label: "Bandeau", hint: "Bandeau récurrent pour les visiteurs pas encore abonnés" },
];

const EVENTS: { key: string; label: string; hint: string }[] = [
  { key: "shown", label: "Affichée", hint: "Nombre de fois où l'invitation a été montrée" },
  { key: "accepted", label: "Activer touché", hint: "Clics sur « Activer les notifications »" },
  { key: "granted", label: "Activée", hint: "Notifications effectivement activées" },
  { key: "denied", label: "Refusée", hint: "Refus dans la fenêtre du navigateur" },
  { key: "dismissed", label: "Fermée", hint: "« Plus tard », croix, ou fenêtre du navigateur fermée sans réponse" },
  { key: "error", label: "Échec technique", hint: "L'activation a échoué après l'autorisation" },
];

const rate = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)} %` : "—";

export function InviteStatsCard() {
  const [days, setDays] = useState<Period>(30);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (period: Period) => {
    setLoading(true);
    setFailed(false);
    try {
      setStats(await apiGet<InviteStats>(`/notifications/invite-stats?days=${period}`));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const empty =
    !stats || SOURCES.every(({ key }) => Object.values(stats.totals[key] ?? {}).every((n) => n === 0));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
            Invitation à activer les notifications
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={days === p ? "default" : "outline"}
                onClick={() => setDays(p)}
                style={days === p ? { backgroundColor: VITOGAZ_GREEN } : undefined}
              >
                {p} jours
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => void load(days)} aria-label="Actualiser les compteurs">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Compteurs anonymes, sans identifiant. Ils ne distinguent pas les personnes : une même personne peut voir
          l&apos;invitation plusieurs fois.
        </p>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500 py-4">Chargement…</p>
        ) : failed ? (
          <p className="text-sm text-red-600 py-4">Impossible de charger les compteurs.</p>
        ) : empty ? (
          <p className="text-sm text-gray-500 py-4">Aucune invitation enregistrée sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2 pr-4 font-medium"></th>
                  {SOURCES.map(({ key, label, hint }) => (
                    <th key={key} className="py-2 px-3 font-medium text-right" title={hint}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {EVENTS.map(({ key, label, hint }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-700" title={hint}>
                      {label}
                    </td>
                    {SOURCES.map(({ key: source }) => {
                      const value = stats?.totals[source]?.[key] ?? 0;
                      const isFailure = key === "error" && value > 0;
                      return (
                        <td
                          key={source}
                          className={`py-2 px-3 text-right ${isFailure ? "font-semibold text-red-600" : ""}`}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-2 pr-4" title="Notifications activées ÷ invitations affichées">
                    Taux d&apos;activation
                  </td>
                  {SOURCES.map(({ key: source }) => (
                    <td key={source} className="py-2 px-3 text-right" style={{ color: VITOGAZ_GREEN }}>
                      {rate(stats?.totals[source]?.granted ?? 0, stats?.totals[source]?.shown ?? 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
