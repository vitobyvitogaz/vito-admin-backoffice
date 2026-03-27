"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tag, Plus, Edit, Trash2, Search, Percent, X, Image as ImageIcon,
  ArrowUpDown, ArrowUp, ArrowDown, Settings, Star, Check, ChevronDown,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const API_URL      = 'https://vito-backend-supabase.onrender.com/api/v1';
const VITOGAZ_GREEN = "#008B7F";
type SortKey = "title" | "discount" | "validity" | "zones" | "usage";

// ── Composant ZonePills — multi-select avec recherche ─────────────────────────
interface ZonePillsProps {
  selectedZones: string[]
  onChange:      (zones: string[]) => void
}

const ZonePills: React.FC<ZonePillsProps> = ({ selectedZones, onChange }) => {
  const [zones, setZones]       = useState<string[]>([])
  const [query, setQuery]       = useState("")
  const [open, setOpen]         = useState(false)
  const containerRef            = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ id: string; name: string }[]>('/zones')
      .then(data => setZones(data.map(z => z.name).sort((a, b) => a.localeCompare(b, 'fr'))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = zones.filter(z =>
    z.toLowerCase().includes(query.toLowerCase()) && !selectedZones.includes(z)
  )

  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      onChange(selectedZones.filter(z => z !== zone))
    } else {
      onChange([...selectedZones, zone])
    }
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Pills sélectionnées */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selectedZones.map(zone => (
          <span key={zone} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
            {zone}
            <button type="button" onClick={() => toggleZone(zone)} className="hover:opacity-70 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selectedZones.length === 0 && (
          <span className="text-xs text-gray-400 self-center">Aucune zone sélectionnée</span>
        )}
      </div>

      {/* Input recherche + dropdown */}
      <div className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background cursor-text"
          onClick={() => setOpen(true)}
        >
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Rechercher et ajouter une zone..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
        </div>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-gray-400">
                {query ? `Aucune zone pour "${query}"` : "Toutes les zones sont sélectionnées"}
              </p>
            ) : (
              filtered.map(zone => (
                <button
                  key={zone}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); toggleZone(zone); setQuery("") }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                >
                  <span>{zone}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedZones.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Tout effacer
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface Promotion {
  id: string; title: string; subtitle: string | null; description: string;
  discount_value: number; discount_type: string; promo_code: string | null;
  valid_from: string; valid_until: string; image_url: string | null;
  product_category: string | null; zones: string[]; applicable_products: string[];
  conditions: string[]; usage_count: number; max_usage: number | null;
  is_active: boolean; is_featured: boolean; display_order: number;
}

interface PopupSettings {
  cooldown_hours: number; delay_seconds: number;
  allowed_pages: string[]; auto_close_seconds: number; enabled: boolean;
}

const PAGE_LABELS: Record<string, string> = {
  home: 'Accueil', promotions: 'Promotions', revendeurs: 'Revendeurs', all: 'Toutes',
}

export default function PromotionsPage() {
  const { canWrite, canDelete } = useCurrentUser();

  const [promotions, setPromotions]           = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [sortedPromotions, setSortedPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState("");
  const [showForm, setShowForm]               = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [uploading, setUploading]             = useState(false);
  const [togglingId, setTogglingId]           = useState<string | null>(null);
  const [showPopupConfig, setShowPopupConfig] = useState(false);
  const [popupSettings, setPopupSettings]     = useState<PopupSettings>({
    cooldown_hours: 48, delay_seconds: 3,
    allowed_pages: ['home'], auto_close_seconds: 30, enabled: true,
  });
  const [savingPopup, setSavingPopup]         = useState(false);

  const [sortColumn, setSortColumn]       = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [formData, setFormData] = useState({
    title: "", subtitle: "", description: "", discount_value: "",
    discount_type: "percentage", promo_code: "", valid_from: "", valid_until: "",
    image_url: "", product_category: "", zones: [] as string[],
    applicable_products: [] as string[], conditions: [] as string[],
    max_usage: "", is_active: true, is_featured: false, display_order: "0",
  });

  const [newProduct, setNewProduct]     = useState("");
  const [newCondition, setNewCondition] = useState("");

  useEffect(() => { fetchPromotions(); fetchPopupSettings(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") { setFilteredPromotions(promotions); return; }
    const q = searchQuery.toLowerCase();
    setFilteredPromotions(promotions.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.promo_code && p.promo_code.toLowerCase().includes(q)) ||
      p.zones.some(z => z.toLowerCase().includes(q))
    ));
  }, [searchQuery, promotions]);

  useEffect(() => {
    if (!sortColumn || !sortDirection) { setSortedPromotions(filteredPromotions); return; }
    const col = sortColumn; const dir = sortDirection;
    const sorted = [...filteredPromotions].sort((a, b) => {
      if (col === "title")    return dir === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      if (col === "discount") return dir === "asc" ? a.discount_value - b.discount_value : b.discount_value - a.discount_value;
      if (col === "validity") return dir === "asc" ? new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime() : new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime();
      if (col === "zones")    return dir === "asc" ? a.zones.length - b.zones.length : b.zones.length - a.zones.length;
      if (col === "usage")    return dir === "asc" ? (a.usage_count||0) - (b.usage_count||0) : (b.usage_count||0) - (a.usage_count||0);
      return 0;
    });
    setSortedPromotions(sorted);
  }, [filteredPromotions, sortColumn, sortDirection]);

  const handleSort = (column: SortKey) => {
    if (sortColumn !== column) { setSortColumn(column); setSortDirection("asc"); }
    else if (sortDirection === "asc") setSortDirection("desc");
    else { setSortColumn(null); setSortDirection(null); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    if (sortDirection === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const sortLabel = (): string | null => {
    if (!sortColumn || !sortDirection) return null;
    if (sortColumn === "zones")    return `Trié par Zones (${sortDirection === "desc" ? "Plus de zones" : "Moins de zones"})`;
    if (sortColumn === "usage")    return `Trié par Utilisations (${sortDirection === "desc" ? "Plus utilisées" : "Moins utilisées"})`;
    if (sortColumn === "discount") return `Trié par Réduction (${sortDirection === "desc" ? "Décroissant" : "Croissant"})`;
    if (sortColumn === "validity") return `Trié par Validité (${sortDirection === "desc" ? "Expire le plus tard" : "Expire bientôt"})`;
    return `Trié par Titre (${sortDirection === "asc" ? "A → Z" : "Z → A"})`;
  };

  const fetchPromotions = async () => {
    try {
      const data = await apiGet<Promotion[]>('/promotions');
      setPromotions(data || []);
      setFilteredPromotions(data || []);
      setSortedPromotions(data || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les promotions", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchPopupSettings = async () => {
    try {
      const data = await apiGet<any>('/settings/popup_settings');
      if (!data) return;
      // L'API peut retourner { setting_value: "{...}" } ou directement l'objet
      const raw = data?.setting_value ?? data?.value ?? data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setPopupSettings(prev => ({ ...prev, ...parsed }));
    } catch {}
  };

  const savePopupSettings = async () => {
    setSavingPopup(true);
    try {
      // Envoyer setting_value comme string JSON pour matcher le schéma app_settings
      await apiPatch('/settings/popup_settings', {
        setting_value: JSON.stringify(popupSettings),
      });
      toast({ title: "Succès !", description: "Configuration popup sauvegardée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally { setSavingPopup(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 MB", variant: "destructive" }); return; }
    try {
      setUploading(true);
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_URL}/promotions/upload-image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFormData(p => ({ ...p, image_url: data.file_url }));
      toast({ title: "Succès !", description: "Image uploadée" });
    } catch { toast({ title: "Erreur", description: "Erreur upload image", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  // ── Vérifier qu'une seule promo est featured ──────────────────────────────
  const handleFeaturedChange = (checked: boolean) => {
    if (checked) {
      const currentFeatured = promotions.find(p => p.is_featured && p.id !== editingId);
      if (currentFeatured) {
        toast({
          title: "Attention",
          description: `"${currentFeatured.title}" est déjà mise en avant. Elle sera remplacée.`,
        });
      }
    }
    setFormData(p => ({ ...p, is_featured: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.zones.length === 0) { toast({ title: "Erreur", description: "Veuillez sélectionner au moins une zone", variant: "destructive" }); return; }
    const payload = {
      title: formData.title, subtitle: formData.subtitle || null,
      description: formData.description || "Promotion spéciale",
      discount_value: parseFloat(formData.discount_value), discount_type: formData.discount_type,
      promo_code: formData.promo_code || null,
      valid_from: formData.valid_from ? new Date(formData.valid_from + 'T00:00:00Z').toISOString() : undefined,
      valid_until: new Date(formData.valid_until + 'T23:59:59Z').toISOString(),
      image_url: formData.image_url || null, product_category: formData.product_category || null,
      zones: formData.zones, applicable_products: formData.applicable_products,
      conditions: formData.conditions, max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
      is_active: formData.is_active, is_featured: formData.is_featured,
      display_order: parseInt(formData.display_order) || 0,
    };
    try {
      if (editingId) { await apiPatch(`/promotions/${editingId}`, payload); toast({ title: "Succès !", description: "Promotion modifiée" }); }
      else { await apiPost('/promotions', payload); toast({ title: "Succès !", description: "Promotion créée" }); }
      await fetchPromotions(); resetForm();
    } catch { toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" }); }
  };

  const handleEdit = (promo: Promotion) => {
    setFormData({
      title: promo.title, subtitle: promo.subtitle || "", description: promo.description || "",
      discount_value: promo.discount_value.toString(), discount_type: promo.discount_type,
      promo_code: promo.promo_code || "", valid_from: promo.valid_from.split("T")[0],
      valid_until: promo.valid_until.split("T")[0], image_url: promo.image_url || "",
      product_category: promo.product_category || "", zones: promo.zones || [],
      applicable_products: promo.applicable_products || [], conditions: promo.conditions || [],
      max_usage: promo.max_usage?.toString() || "", is_active: promo.is_active,
      is_featured: promo.is_featured, display_order: promo.display_order.toString(),
    });
    setEditingId(promo.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    try { await apiDelete(`/promotions/${id}`); toast({ title: "Succès !", description: "Promotion supprimée" }); await fetchPromotions(); }
    catch { toast({ title: "Erreur", description: "Erreur suppression", variant: "destructive" }); }
  };

  const handleToggleActive = async (promo: Promotion) => {
    if (!canWrite) return;
    setTogglingId(promo.id);
    try {
      await apiPatch(`/promotions/${promo.id}`, { is_active: !promo.is_active });
      toast({ title: "Succès !", description: `Promotion ${!promo.is_active ? "activée" : "désactivée"}` });
      await fetchPromotions();
    } catch { toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" }); }
    finally { setTogglingId(null); }
  };

  const resetForm = () => {
    setFormData({
      title: "", subtitle: "", description: "", discount_value: "", discount_type: "percentage",
      promo_code: "", valid_from: "", valid_until: "", image_url: "", product_category: "",
      zones: [], applicable_products: [], conditions: [], max_usage: "",
      is_active: true, is_featured: false, display_order: "0",
    });
    setEditingId(null); setShowForm(false); setNewProduct(""); setNewCondition("");
  };

  const isEffectivelyActive = (p: Promotion) => {
    try { return p.is_active && new Date() <= new Date(p.valid_until); } catch { return false; }
  };

  const formatDate = (d: string): string => {
    try { const date = new Date(d); return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("fr-FR"); } catch { return "-"; }
  };

  const toggleAllowedPage = (page: string) => {
    setPopupSettings(s => ({
      ...s,
      allowed_pages: s.allowed_pages.includes(page)
        ? s.allowed_pages.filter(p => p !== page)
        : [...s.allowed_pages, page],
    }));
  };

  const colSpan = 8 + (canWrite ? 1 : 0);

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "title", label: "Titre" }, { key: "discount", label: "Réduction" },
    { key: "validity", label: "Validité" }, { key: "zones", label: "Zones" },
    { key: "usage", label: "Utilisations" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="GESTION DES PROMOTIONS" />
      <Navigation />

      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Promotions</h2>
              <p className="text-sm text-gray-500">
                {promotions.length} promotion(s) • {promotions.filter(isEffectivelyActive).length} active(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Config popup */}
            {canWrite && (
              <Button variant="outline" onClick={() => setShowPopupConfig(!showPopupConfig)} className="gap-2">
                <Settings className="w-4 h-4" />
                Config popup
              </Button>
            )}
            {canDelete && (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                <Plus className="w-4 h-4" />
                {showForm ? "Annuler" : "Nouvelle Promotion"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Config popup ── */}
        {showPopupConfig && canWrite && (
          <Card className="mb-6 border-2" style={{ borderColor: VITOGAZ_GREEN + "30" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                Configuration du Popup Promotions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Activé */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="popup_enabled" checked={popupSettings.enabled}
                    onChange={e => setPopupSettings(s => ({ ...s, enabled: e.target.checked }))} className="w-4 h-4" />
                  <Label htmlFor="popup_enabled" className="cursor-pointer">Popup activé</Label>
                </div>

                {/* Cooldown */}
                <div>
                  <Label htmlFor="cooldown">Cooldown (heures)</Label>
                  <Input id="cooldown" type="number" min="0" max="720"
                    value={popupSettings.cooldown_hours}
                    onChange={e => setPopupSettings(s => ({ ...s, cooldown_hours: parseInt(e.target.value) || 0 }))}
                    className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">0 = toujours, 48 = 1x toutes les 48h</p>
                </div>

                {/* Délai d'apparition */}
                <div>
                  <Label htmlFor="delay">Délai d'apparition (secondes)</Label>
                  <Input id="delay" type="number" min="0" max="60"
                    value={popupSettings.delay_seconds}
                    onChange={e => setPopupSettings(s => ({ ...s, delay_seconds: parseInt(e.target.value) || 0 }))}
                    className="mt-1" />
                </div>

                {/* Fermeture auto */}
                <div>
                  <Label htmlFor="autoclose">Fermeture auto (secondes)</Label>
                  <Input id="autoclose" type="number" min="5" max="120"
                    value={popupSettings.auto_close_seconds}
                    onChange={e => setPopupSettings(s => ({ ...s, auto_close_seconds: parseInt(e.target.value) || 30 }))}
                    className="mt-1" />
                </div>
              </div>

              {/* Pages autorisées */}
              <div>
                <Label>Pages où le popup peut apparaître</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(PAGE_LABELS).map(([page, label]) => {
                    const active = popupSettings.allowed_pages.includes(page);
                    return (
                      <button key={page} type="button" onClick={() => toggleAllowedPage(page)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                          active ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                        style={active ? { backgroundColor: VITOGAZ_GREEN, borderColor: VITOGAZ_GREEN } : {}}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={savePopupSettings} disabled={savingPopup} className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                {savingPopup ? "Sauvegarde..." : "Enregistrer la configuration"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {showForm && (canDelete || (canWrite && !!editingId)) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier la Promotion" : "Nouvelle Promotion"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informations générales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Titre *</Label>
                      <Input id="title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Fety Masaka 2025" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="subtitle">Sous-titre</Label>
                      <Input id="subtitle" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Ex: Promotion de fin d'année" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} placeholder="Détails de la promotion" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="image">Image</Label>
                      <div className="mt-2">
                        {formData.image_url ? (
                          <div className="space-y-2">
                            <div className="relative w-full h-48 border-2 border-gray-200 rounded-lg overflow-hidden">
                              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setFormData(p => ({...p, image_url: ""}))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="flex-1" />
                            {uploading && <span className="text-sm text-gray-500">Upload...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Réduction */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Réduction</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount_type">Type *</Label>
                      <select id="discount_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (Ar)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value">Valeur *</Label>
                      <Input id="discount_value" type="number" min="0" max={formData.discount_type === "percentage" ? "100" : undefined} step="0.01" required
                        value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="promo_code">Code avantage</Label>
                      <Input id="promo_code" placeholder="Ex: FETY2025 — à montrer au revendeur"
                        value={formData.promo_code} onChange={e => setFormData({...formData, promo_code: e.target.value.toUpperCase()})} />
                      <p className="text-xs text-gray-400 mt-1">Ce code est montré par l'utilisateur à son revendeur physique</p>
                    </div>
                    <div>
                      <Label htmlFor="product_category">Catégorie produit</Label>
                      <select id="product_category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.product_category} onChange={e => setFormData({...formData, product_category: e.target.value})}>
                        <option value="">Toutes catégories</option>
                        <option value="bouteille">Bouteilles</option>
                        <option value="detendeur">Détendeurs</option>
                        <option value="tuyau">Tuyaux</option>
                        <option value="kit1">Kits Fatapera</option>
                        <option value="kit2">Kits connectiques</option>
                        <option value="kit3">Kits complets</option>
                        <option value="accessoire">Accessoires</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Période */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Période de validité</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valid_from">Date de début</Label>
                      <Input id="valid_from" type="date" value={formData.valid_from} onChange={e => setFormData({...formData, valid_from: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="valid_until">Date de fin *</Label>
                      <Input id="valid_until" type="date" required value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* ── Zones — Pills multi-select avec recherche ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Zones concernées *</h3>
                  <ZonePills selectedZones={formData.zones} onChange={zones => setFormData({...formData, zones})} />
                </div>

                {/* Produits applicables */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Produits applicables</h3>
                  <div className="flex gap-2">
                    <Input value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Ex: Bouteille 12.5kg"
                      onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); if (newProduct.trim()) { setFormData(p => ({...p, applicable_products: [...p.applicable_products, newProduct.trim()]})); setNewProduct(""); } } }} />
                    <Button type="button" onClick={() => { if (newProduct.trim()) { setFormData(p => ({...p, applicable_products: [...p.applicable_products, newProduct.trim()]})); setNewProduct(""); } }} variant="outline"><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.applicable_products.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                        {p}<button type="button" onClick={() => setFormData(prev => ({...prev, applicable_products: prev.applicable_products.filter(x => x !== p)}))}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Conditions</h3>
                  <div className="flex gap-2">
                    <Input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Ex: Minimum 2 bouteilles"
                      onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); if (newCondition.trim()) { setFormData(p => ({...p, conditions: [...p.conditions, newCondition.trim()]})); setNewCondition(""); } } }} />
                    <Button type="button" onClick={() => { if (newCondition.trim()) { setFormData(p => ({...p, conditions: [...p.conditions, newCondition.trim()]})); setNewCondition(""); } }} variant="outline"><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.conditions.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {c}<button type="button" onClick={() => setFormData(p => ({...p, conditions: p.conditions.filter(x => x !== c)}))}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Paramètres */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_usage">Nombre max d'utilisations</Label>
                      <Input id="max_usage" type="number" min="0" value={formData.max_usage} onChange={e => setFormData({...formData, max_usage: e.target.value})} placeholder="Vide = illimité" />
                    </div>
                    <div>
                      <Label htmlFor="display_order">Ordre d'affichage</Label>
                      <Input id="display_order" type="number" min="0" value={formData.display_order} onChange={e => setFormData({...formData, display_order: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4" />
                      <Label htmlFor="is_active" className="cursor-pointer">Promotion active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={e => handleFeaturedChange(e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="is_featured" className="cursor-pointer flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                        Promo du moment
                        <span className="text-xs text-gray-400 font-normal">(1 seule à la fois)</span>
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                    {editingId ? "Mettre à jour" : "Créer"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input placeholder="Rechercher par titre, code ou zone..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                {sortableCols.map(col => {
                  const isColActive = sortColumn === col.key;
                  return (
                    <TableHead key={col.key} onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none transition-colors hover:bg-gray-50"
                      style={isColActive ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}>
                      <span className="flex items-center gap-1">{col.label}<SortIcon column={col.key} /></span>
                    </TableHead>
                  );
                })}
                <TableHead>Code</TableHead>
                {canWrite && <TableHead>Activer</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={colSpan} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : sortedPromotions.length === 0 ? (
                <TableRow><TableCell colSpan={colSpan} className="text-center py-8">Aucune promotion trouvée</TableCell></TableRow>
              ) : (
                sortedPromotions.map(promo => (
                  <TableRow key={promo.id} className={!promo.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      {promo.image_url ? (
                        <img src={promo.image_url} alt={promo.title} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-400" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {promo.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        <span>{promo.title}</span>
                      </div>
                      {promo.subtitle && <div className="text-xs text-gray-400">{promo.subtitle}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-sm" style={{ color: VITOGAZ_GREEN }}>
                        <Percent className="w-3.5 h-3.5" />
                        {promo.discount_type === "percentage" ? `${promo.discount_value}%` : `${promo.discount_value} Ar`}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      <div>{formatDate(promo.valid_from)}</div>
                      <div className="text-gray-400">→ {formatDate(promo.valid_until)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {promo.zones?.length > 0 ? (
                          <>
                            {promo.zones.slice(0, 2).map((z, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>{z}</span>
                            ))}
                            {promo.zones.length > 2 && <span className="text-xs text-gray-400">+{promo.zones.length - 2}</span>}
                          </>
                        ) : <span className="text-gray-400 text-xs">Toutes zones</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{promo.usage_count || 0}</span>
                      {promo.max_usage && <span className="text-xs text-gray-400"> / {promo.max_usage}</span>}
                    </TableCell>
                    <TableCell>
                      {promo.promo_code
                        ? <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{promo.promo_code}</code>
                        : <span className="text-gray-400 text-xs">-</span>}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <button onClick={() => handleToggleActive(promo)} disabled={togglingId === promo.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${togglingId === promo.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          style={{ backgroundColor: promo.is_active ? VITOGAZ_GREEN : "#D1D5DB" }}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${promo.is_active ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canWrite && <Button variant="outline" size="sm" onClick={() => handleEdit(promo)}><Edit className="w-4 h-4" /></Button>}
                        {canDelete && <Button variant="destructive" size="sm" onClick={() => handleDelete(promo.id)}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            <p className="text-sm text-gray-500">{sortedPromotions.length} promotion(s)</p>
          </div>
        </Card>
      </main>
    </div>
  );
}