"use client";

import { useEffect, useState, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
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
  ArrowUpDown, ArrowUp, ArrowDown, Settings, Star, Check, ChevronDown, QrCode, Download,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const API_URL       = 'https://vito-backend-supabase.onrender.com/api/v1';
const VITOGAZ_GREEN = "#008B7F";
type SortKey = "title" | "discount" | "validity" | "zones" | "usage";

// ── ZonePills — multi-select avec recherche ───────────────────────────────────
const ZonePills = ({ selectedZones, onChange }: { selectedZones: string[]; onChange: (z: string[]) => void }) => {
  const [zones, setZones]   = useState<string[]>([])
  const [query, setQuery]   = useState("")
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ id: string; name: string }[]>('/zones')
      .then(d => setZones(d.map(z => z.name).sort((a, b) => a.localeCompare(b, 'fr'))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filtered = zones.filter(z => z.toLowerCase().includes(query.toLowerCase()) && !selectedZones.includes(z))

  return (
    <div ref={ref} className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selectedZones.map(z => (
          <span key={z} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
            {z}
            <button type="button" onClick={() => onChange(selectedZones.filter(x => x !== z))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {selectedZones.length === 0 && <span className="text-xs text-gray-400 self-center">Aucune zone — laisser vide = toutes zones</span>}
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background cursor-text" onClick={() => setOpen(true)}>
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Rechercher une zone..." value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} />
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
        </div>
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-3 py-2.5 text-sm text-gray-400">{query ? `Aucune zone pour "${query}"` : "Tout sélectionné"}</p>
              : filtered.map(z => (
                <button key={z} type="button"
                  onMouseDown={e => { e.preventDefault(); onChange([...selectedZones, z]); setQuery("") }}
                  className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors">
                  {z}
                </button>
              ))
            }
          </div>
        )}
      </div>
      {selectedZones.length > 0 && (
        <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Tout effacer
        </button>
      )}
    </div>
  )
}

// ── ProductSelector — sélection depuis la vraie BDD, filtré par catégorie ────
interface Product { id: string; name: string; category: string; is_active: boolean }

// ── ProductCategoryPills — multi-select catégories depuis la BDD ──────────────
const ProductCategoryPills = ({
  selectedCategories,
  onChange,
}: {
  selectedCategories: string[]
  onChange:           (cats: string[]) => void
}) => {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    apiGet<Product[]>('/products')
      .then(d => {
        const unique = [...new Set(d.filter(p => p.is_active).map(p => p.category))]
          .sort((a, b) => a.localeCompare(b, 'fr'))
        setCategories(unique)
      })
      .catch(() => {})
  }, [])

  const toggle = (cat: string) => {
    onChange(
      selectedCategories.includes(cat)
        ? selectedCategories.filter(c => c !== cat)
        : [...selectedCategories, cat]
    )
  }

  return (
    <div className="space-y-2 mt-1">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => {
          const active = selectedCategories.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                active
                  ? 'text-white border-transparent'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
              }`}
              style={active ? { backgroundColor: VITOGAZ_GREEN, borderColor: VITOGAZ_GREEN } : {}}
            >
              {active && <Check className="w-3 h-3" />}
              {cat}
            </button>
          )
        })}
      </div>
      {selectedCategories.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Tout effacer
        </button>
      )}
      {categories.length === 0 && (
        <p className="text-xs text-gray-400">Chargement des catégories...</p>
      )}
    </div>
  )
}

// ── ProductSelector — filtre sur plusieurs catégories ─────────────────────────
const ProductSelector = ({
  selectedIds,
  onChange,
  categoryFilters = [],
}: {
  selectedIds:      string[]
  onChange:         (ids: string[]) => void
  categoryFilters?: string[]
}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery]       = useState("")
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    apiGet<Product[]>('/products')
      .then(d => setProducts(d.filter(p => p.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])
  }

  // Filtre : si des catégories sont sélectionnées, n'afficher que leurs produits
  const filtered = products.filter(p => {
    const matchCat   = categoryFilters.length === 0 || categoryFilters.includes(p.category)
    const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQuery
  })

  const grouped = filtered.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  if (loading) return <p className="text-sm text-gray-400">Chargement des produits...</p>

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map(id => {
            const p = products.find(x => x.id === id)
            if (!p) return null
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                {p.name}
                <button type="button" onClick={() => toggle(id)}><X className="w-3 h-3" /></button>
              </span>
            )
          })}
          <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors self-center">
            Tout effacer
          </button>
        </div>
      )}
      {categoryFilters.length > 0 && (
        <p className="text-xs text-gray-400">
          Filtrés par : <span className="font-medium text-gray-600">{categoryFilters.join(', ')}</span>
        </p>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un produit..." className="pl-9 h-9 text-sm" />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</p>
            </div>
            {items.map(p => (
              <button key={p.id} type="button" onClick={() => toggle(p.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{p.name}</span>
                {selectedIds.includes(p.id) && <Check className="w-4 h-4 flex-shrink-0" style={{ color: VITOGAZ_GREEN }} />}
              </button>
            ))}
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="px-3 py-4 text-sm text-gray-400 text-center">
            {categoryFilters.length > 0 ? `Aucun produit dans les catégories sélectionnées` : "Aucun produit trouvé"}
          </p>
        )}
      </div>
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
  // Champs scan QR
  scan_enabled: boolean; scan_points: number;
  scan_confirmation_message: string | null; scan_max_per_user: number;
  scan_cooldown_hours: number;
}

interface PopupSettings {
  cooldown_hours: number; delay_seconds: number;
  allowed_pages: string[]; auto_close_seconds: number; enabled: boolean;
  popup_strategy: string; popup_fixed_promo_id: string;
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
  const formRef                               = useRef<HTMLDivElement>(null);
  const [showPopupConfig, setShowPopupConfig] = useState(false);
  const [showQrModal, setShowQrModal]         = useState<string | null>(null); // promo_code du QR à afficher
  const [popupSettings, setPopupSettings]     = useState<PopupSettings>({
    cooldown_hours: 48, delay_seconds: 3, allowed_pages: ['home'], auto_close_seconds: 30, enabled: true,
    popup_strategy: 'featured', popup_fixed_promo_id: '',
  });
  const [savingPopup, setSavingPopup]         = useState(false);

  const [sortColumn, setSortColumn]       = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [formData, setFormData] = useState({
    title: "", subtitle: "", description: "", discount_value: "",
    discount_type: "percentage", promo_code: "",
    valid_from: "", valid_until: "",
    image_url: "", product_category: [] as string[],
    zones: [] as string[],
    applicable_product_ids: [] as string[],
    conditions: [] as string[],
    max_usage: "", is_active: true, is_featured: false, display_order: "0",
    // Scan QR
    scan_enabled: false, scan_points: "0",
    scan_confirmation_message: "", scan_max_per_user: "1", scan_cooldown_hours: "0",
  });

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

  const handleSort = (col: SortKey) => {
    if (sortColumn !== col) { setSortColumn(col); setSortDirection("asc"); }
    else if (sortDirection === "asc") setSortDirection("desc");
    else { setSortColumn(null); setSortDirection(null); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    if (sortDirection === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const sortLabel = () => {
    if (!sortColumn || !sortDirection) return null;
    if (sortColumn === "zones")    return `Trié par Zones (${sortDirection === "desc" ? "Plus" : "Moins"})`;
    if (sortColumn === "usage")    return `Trié par Utilisations (${sortDirection === "desc" ? "Décroissant" : "Croissant"})`;
    if (sortColumn === "discount") return `Trié par Réduction (${sortDirection === "desc" ? "Décroissant" : "Croissant"})`;
    if (sortColumn === "validity") return `Trié par Validité (${sortDirection === "desc" ? "Expire le plus tard" : "Expire bientôt"})`;
    return `Trié par Titre (${sortDirection === "asc" ? "A → Z" : "Z → A"})`;
  };

  const fetchPromotions = async () => {
    try {
      const data = await apiGet<Promotion[]>('/promotions');
      setPromotions(data || []); setFilteredPromotions(data || []); setSortedPromotions(data || []);
    } catch { toast({ title: "Erreur", description: "Impossible de charger les promotions", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const fetchPopupSettings = async () => {
    try {
      const data = await apiGet<any>('/settings/popup_settings');
      if (!data) return;
      const raw    = data?.setting_value ?? data?.value ?? data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setPopupSettings(prev => ({ ...prev, ...parsed }));
    } catch {}
  };

  const savePopupSettings = async () => {
    setSavingPopup(true);
    try {
      await apiPatch('/settings/key/popup_settings', {
        setting_value: JSON.stringify(popupSettings),
      });
      toast({ title: "Succès !", description: "Configuration popup sauvegardée" });
      setShowPopupConfig(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally { setSavingPopup(false); }
  };

  // ── handleImageUpload — CORRIGÉ : ajout du token Supabase ──────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "5 MB maximum", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);

      // Récupérer le token JWT depuis le localStorage (même mécanisme que apiFetch)
      const token = getAuthToken();

      if (!token) {
        toast({ title: "Erreur", description: "Session expirée, veuillez vous reconnecter", variant: "destructive" });
        return;
      }

      const fd = new FormData();
      fd.append('file', file);

      // Ne pas définir Content-Type manuellement — le browser le gère avec FormData
      const res = await fetch(`${API_URL}/promotions/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setFormData(p => ({ ...p, image_url: data.file_url }));
      toast({ title: "Succès !", description: "Image uploadée" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Erreur", description: error.message || "Erreur upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFeaturedChange = (checked: boolean) => {
    if (checked) {
      const curr = promotions.find(p => p.is_featured && p.id !== editingId);
      if (curr) toast({ title: "Attention", description: `"${curr.title}" sera remplacée en tant que Promo du moment.` });
    }
    setFormData(p => ({ ...p, is_featured: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation : bloquer si le numéro d'ordre est déjà pris ────────────
    const orderValue = parseInt(formData.display_order) || 0
    const conflict = promotions.find(p =>
      p.display_order === orderValue && p.id !== editingId
    )
    if (conflict) {
      toast({
        title: "Numéro d'ordre déjà utilisé",
        description: `"${conflict.title}" utilise déjà le numéro ${orderValue}. Choisissez un autre numéro.`,
        variant: "destructive",
      })
      return
    }

    const payload = {
      title:                formData.title,
      subtitle:             formData.subtitle || null,
      description:          formData.description || "Promotion spéciale",
      discount_value:       parseFloat(formData.discount_value),
      discount_type:        formData.discount_type,
      promo_code:           formData.promo_code || null,
      valid_from:           formData.valid_from ? new Date(formData.valid_from + 'T00:00:00Z').toISOString() : undefined,
      valid_until:          new Date(formData.valid_until + 'T23:59:59Z').toISOString(),
      image_url:            formData.image_url || null,
      product_category:     formData.product_category.length > 0
        ? formData.product_category.join(',')
        : null,
      zones:                formData.zones,
      applicable_products:  formData.applicable_product_ids,
      conditions:           formData.conditions,
      max_usage:            formData.max_usage ? parseInt(formData.max_usage) : null,
      is_active:            formData.is_active,
      is_featured:          formData.is_featured,
      display_order:        orderValue,
      // Scan QR
      scan_enabled:              formData.scan_enabled,
      scan_points:               parseInt(formData.scan_points) || 0,
      scan_confirmation_message: formData.scan_confirmation_message || null,
      scan_max_per_user:         parseInt(formData.scan_max_per_user) || 1,
      scan_cooldown_hours:       parseInt(formData.scan_cooldown_hours) || 0,
    };
    try {
      if (editingId) { await apiPatch(`/promotions/${editingId}`, payload); toast({ title: "Succès !", description: "Promotion modifiée" }); }
      else           { await apiPost('/promotions', payload);               toast({ title: "Succès !", description: "Promotion créée" }); }
      await fetchPromotions(); resetForm();
    } catch { toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" }); }
  };

  const handleEdit = (promo: Promotion) => {
    setFormData({
      title: promo.title, subtitle: promo.subtitle || "", description: promo.description || "",
      discount_value: promo.discount_value.toString(), discount_type: promo.discount_type,
      promo_code: promo.promo_code || "",
      valid_from: promo.valid_from.split("T")[0], valid_until: promo.valid_until.split("T")[0],
      image_url: promo.image_url || "", product_category: (() => {
        const raw = promo.product_category
        if (!raw) return [] as string[]
        if (Array.isArray(raw)) return raw as string[]
        // Essayer JSON d'abord (ancien format), puis CSV (nouveau format)
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed : [raw]
        } catch {
          // Format CSV : "Bouteilles,Accessoires"
          return raw.split(',').map((s: string) => s.trim()).filter(Boolean) as string[]
        }
      })(),
      zones: promo.zones || [], applicable_product_ids: promo.applicable_products || [],
      conditions: promo.conditions || [], max_usage: promo.max_usage?.toString() || "",
      is_active: promo.is_active, is_featured: promo.is_featured, display_order: promo.display_order.toString(),
      scan_enabled: promo.scan_enabled || false,
      scan_points: (promo.scan_points || 0).toString(),
      scan_confirmation_message: promo.scan_confirmation_message || "",
      scan_max_per_user: (promo.scan_max_per_user || 1).toString(),
      scan_cooldown_hours: (promo.scan_cooldown_hours || 0).toString(),
    });
    setEditingId(promo.id); setShowForm(true);
    // ── Scroll vers le formulaire ──────────────────────────────────────────
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    try { await apiDelete(`/promotions/${id}`); toast({ title: "Succès !" }); await fetchPromotions(); }
    catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  const handleToggleActive = async (promo: Promotion) => {
    if (!canWrite) return;
    setTogglingId(promo.id);
    try {
      await apiPatch(`/promotions/${promo.id}`, { is_active: !promo.is_active });
      toast({ title: "Succès !", description: `Promotion ${!promo.is_active ? "activée" : "désactivée"}` });
      await fetchPromotions();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setTogglingId(null); }
  };

  const resetForm = () => {
    setFormData({
      title: "", subtitle: "", description: "", discount_value: "", discount_type: "percentage",
      promo_code: "", valid_from: "", valid_until: "", image_url: "", product_category: [] as string[],
      zones: [], applicable_product_ids: [], conditions: [], max_usage: "",
      is_active: true, is_featured: false, display_order: "0",
      scan_enabled: false, scan_points: "0",
      scan_confirmation_message: "", scan_max_per_user: "1", scan_cooldown_hours: "0",
    });
    setNewCondition(""); setEditingId(null); setShowForm(false);
  };

  const isEffectivelyActive = (p: Promotion) => {
    try { return p.is_active && new Date() <= new Date(p.valid_until); } catch { return false; }
  };

  const fmt = (d: string) => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString("fr-FR"); } catch { return "-"; } };

  const toggleAllowedPage = (page: string) => setPopupSettings(s => ({
    ...s,
    allowed_pages: s.allowed_pages.includes(page)
      ? s.allowed_pages.filter(p => p !== page)
      : [...s.allowed_pages, page],
  }));

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
            {canWrite && (
              <Button variant="outline" onClick={() => setShowPopupConfig(!showPopupConfig)} className="gap-2">
                <Settings className="w-4 h-4" />Config popup
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

        {/* Config popup */}
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
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="popup_enabled" checked={popupSettings.enabled}
                    onChange={e => setPopupSettings(s => ({ ...s, enabled: e.target.checked }))} className="w-4 h-4" />
                  <Label htmlFor="popup_enabled" className="cursor-pointer">Popup activé</Label>
                </div>
                <div>
                  <Label>Cooldown (heures)</Label>
                  <Input type="number" min="0" max="720" value={popupSettings.cooldown_hours}
                    onChange={e => setPopupSettings(s => ({ ...s, cooldown_hours: parseInt(e.target.value)||0 }))} className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">0 = toujours · 48 = 1x/48h</p>
                </div>
                <div>
                  <Label>Délai d'apparition (sec)</Label>
                  <Input type="number" min="0" max="60" value={popupSettings.delay_seconds}
                    onChange={e => setPopupSettings(s => ({ ...s, delay_seconds: parseInt(e.target.value)||0 }))} className="mt-1" />
                </div>
                <div>
                  <Label>Fermeture auto (sec)</Label>
                  <Input type="number" min="5" max="120" value={popupSettings.auto_close_seconds}
                    onChange={e => setPopupSettings(s => ({ ...s, auto_close_seconds: parseInt(e.target.value)||30 }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Pages autorisées</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(PAGE_LABELS).map(([page, label]) => {
                    const active = popupSettings.allowed_pages.includes(page);
                    return (
                      <button key={page} type="button" onClick={() => toggleAllowedPage(page)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition-all ${active ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                        style={active ? { backgroundColor: VITOGAZ_GREEN, borderColor: VITOGAZ_GREEN } : {}}>
                        {active && <Check className="w-3 h-3" />}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Stratégie de sélection de la promo ── */}
              <div className="border-t border-gray-100 pt-4">
                <Label className="text-sm font-semibold">Stratégie d'affichage</Label>
                <p className="text-xs text-gray-400 mb-3 mt-0.5">Quelle promotion afficher dans le popup ?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Méthode de sélection</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                      value={popupSettings.popup_strategy}
                      onChange={e => setPopupSettings(s => ({ ...s, popup_strategy: e.target.value, popup_fixed_promo_id: '' }))}
                    >
                      <option value="featured">⭐ Promo du moment (is_featured)</option>
                      <option value="random">🎲 Aléatoire à chaque ouverture</option>
                      <option value="fixed">📌 Promo fixe (choisie manuellement)</option>
                      <option value="order_asc">↑ Ordre croissant (display_order min)</option>
                      <option value="order_desc">↓ Ordre décroissant (display_order max)</option>
                      <option value="latest">🆕 La plus récente (valid_from)</option>
                    </select>
                  </div>

                  {/* Sélecteur de promo fixe — visible uniquement si stratégie = fixed */}
                  {popupSettings.popup_strategy === 'fixed' && (
                    <div>
                      <Label>Promotion à afficher</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        value={popupSettings.popup_fixed_promo_id}
                        onChange={e => setPopupSettings(s => ({ ...s, popup_fixed_promo_id: e.target.value }))}
                      >
                        <option value="">— Choisir une promotion —</option>
                        {promotions
                          .filter(p => p.is_active)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.is_featured ? '⭐ ' : ''}{p.title}
                            </option>
                          ))
                        }
                      </select>
                      {!popupSettings.popup_fixed_promo_id && (
                        <p className="text-xs text-amber-500 mt-1">⚠ Sélectionnez une promotion</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={savePopupSettings} disabled={savingPopup} className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                {savingPopup ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {showForm && (canDelete || (canWrite && !!editingId)) && (
          <Card className="mb-6" ref={formRef}>
            <CardHeader>
              <CardTitle>{editingId ? "Modifier la Promotion" : "Nouvelle Promotion"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">1. Informations générales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Titre *</Label>
                      <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Fety Masaka 2025" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Sous-titre</Label>
                      <Input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Ex: Promotion de fin d'année" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} placeholder="Détails de la promotion" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Image</Label>
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
                            {uploading && <span className="text-sm text-gray-500">Upload en cours...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Réduction */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">2. Réduction</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Type *</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (Ar)</option>
                      </select>
                    </div>
                    <div>
                      <Label>Valeur *</Label>
                      <Input type="number" min="0" max={formData.discount_type === "percentage" ? "100" : undefined} step="0.01" required
                        className="mt-1" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Code avantage <span className="text-xs font-normal text-gray-400">(à montrer au revendeur physique)</span></Label>
                      <Input className="mt-1" placeholder="Ex: FETY2025" value={formData.promo_code}
                        onChange={e => setFormData({...formData, promo_code: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
                </div>

                {/* 3. Période de validité */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">3. Période de validité</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date de début</Label>
                      <Input type="date" className="mt-1" value={formData.valid_from} onChange={e => setFormData({...formData, valid_from: e.target.value})} />
                    </div>
                    <div>
                      <Label>Date de fin *</Label>
                      <Input type="date" required className="mt-1" value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* 4. Zones */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">4. Zones concernées <span className="text-sm font-normal text-gray-400">(vide = toutes zones)</span></h3>
                  <ZonePills selectedZones={formData.zones} onChange={zones => setFormData({...formData, zones})} />
                </div>

                {/* 5. Produits */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">5. Produits applicables</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Catégories de produits <span className="text-xs font-normal text-gray-400">(sélection multiple)</span></Label>
                      <ProductCategoryPills
                        selectedCategories={formData.product_category}
                        onChange={cats => setFormData({
                          ...formData,
                          product_category: cats,
                          // Ne pas vider les produits sélectionnés — l'utilisateur gère manuellement
                        })}
                      />
                    </div>
                    <div>
                      <Label>Produits spécifiques <span className="text-xs font-normal text-gray-400">(optionnel — filtrés par catégories ci-dessus)</span></Label>
                      <div className="mt-2">
                        <ProductSelector
                          selectedIds={formData.applicable_product_ids}
                          onChange={ids => setFormData({...formData, applicable_product_ids: ids})}
                          categoryFilters={formData.product_category}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">6. Conditions</h3>
                  {/* Pills au-dessus du champ */}
                  {formData.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.conditions.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {c}<button type="button" onClick={() => setFormData(p => ({...p, conditions: p.conditions.filter(x => x !== c)}))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Ex: Minimum 2 bouteilles"
                      onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); if (newCondition.trim()) { setFormData(p => ({...p, conditions: [...p.conditions, newCondition.trim()]})); setNewCondition(""); } } }} />
                    <Button type="button" variant="outline" onClick={() => { if (newCondition.trim()) { setFormData(p => ({...p, conditions: [...p.conditions, newCondition.trim()]})); setNewCondition(""); } }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 7. Paramètres */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">7. Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre max d'utilisations</Label>
                      <Input type="number" min="0" className="mt-1" value={formData.max_usage} onChange={e => setFormData({...formData, max_usage: e.target.value})} placeholder="Vide = illimité" />
                    </div>
                    <div>
                      <Label>Ordre d'affichage *</Label>
                      <Input
                        type="number" min="0" required className="mt-1"
                        value={formData.display_order}
                        onChange={e => setFormData({...formData, display_order: e.target.value})}
                        placeholder="Ex: 1"
                      />
                      {/* Hint : numéros déjà pris par d'autres promotions */}
                      {promotions.filter(p => p.id !== editingId).length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Déjà utilisés :{' '}
                          {promotions
                            .filter(p => p.id !== editingId)
                            .map(p => p.display_order)
                            .sort((a, b) => a - b)
                            .join(', ')
                          }
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4" />
                      <Label htmlFor="is_active" className="cursor-pointer">Promotion active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={e => handleFeaturedChange(e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="is_featured" className="cursor-pointer flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                        Promo du moment <span className="text-xs text-gray-400 font-normal">(1 seule à la fois)</span>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* 8. Programme Scan QR */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">8. Programme Scan QR</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 md:col-span-2">
                      <input type="checkbox" id="scan_enabled" checked={formData.scan_enabled}
                        onChange={e => setFormData({...formData, scan_enabled: e.target.checked})} className="w-4 h-4" />
                      <Label htmlFor="scan_enabled" className="cursor-pointer flex items-center gap-1.5">
                        <QrCode className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                        Activer le scan QR pour cette promotion
                      </Label>
                    </div>
                    {formData.scan_enabled && (
                      <>
                        <div>
                          <Label>Points attribués par scan</Label>
                          <Input type="number" min="0" className="mt-1" value={formData.scan_points}
                            onChange={e => setFormData({...formData, scan_points: e.target.value})}
                            placeholder="0 = participation sans points" />
                          <p className="text-xs text-gray-400 mt-1">0 = participation simple, sans accumulation de points</p>
                        </div>
                        <div>
                          <Label>Limite par utilisateur (téléphone)</Label>
                          <Input type="number" min="0" className="mt-1" value={formData.scan_max_per_user}
                            onChange={e => setFormData({...formData, scan_max_per_user: e.target.value})}
                            placeholder="1" />
                          <p className="text-xs text-gray-400 mt-1">0 = illimité · 1 = 1 seul scan par numéro</p>
                        </div>
                        <div>
                          <Label>Cooldown entre scans (heures)</Label>
                          <Input type="number" min="0" className="mt-1" value={formData.scan_cooldown_hours}
                            onChange={e => setFormData({...formData, scan_cooldown_hours: e.target.value})}
                            placeholder="0" />
                          <p className="text-xs text-gray-400 mt-1">0 = pas de délai entre les scans</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Message de confirmation</Label>
                          <Textarea className="mt-1" rows={3} value={formData.scan_confirmation_message}
                            onChange={e => setFormData({...formData, scan_confirmation_message: e.target.value})}
                            placeholder="Ex: Merci ! Vous participez au tirage au sort du 31 mars. Le gagnant sera contacté par téléphone." />
                          <p className="text-xs text-gray-400 mt-1">Affiché à l'utilisateur après sa participation.</p>
                        </div>
                        {formData.promo_code && (
                          <div className="md:col-span-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <p className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                              <QrCode className="w-4 h-4" /> QR Code de cette promotion
                            </p>
                            <p className="text-xs text-emerald-700 mb-3">
                              URL encodée : <code className="bg-white px-2 py-0.5 rounded font-mono">
                                https://vitobyvitogaz.mg/fr/scan/{formData.promo_code}
                              </code>
                            </p>
                            <p className="text-xs text-emerald-600">Le QR sera génératable depuis la liste des promotions après sauvegarde.</p>
                          </div>
                        )}
                        {!formData.promo_code && (
                          <div className="md:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-xs text-amber-700">⚠ Vous devez définir un code avantage (section 2) pour activer le scan QR.</p>
                          </div>
                        )}
                      </>
                    )}
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
                <TableHead className="w-12 text-center">#</TableHead>
                {canWrite && <TableHead>Activer</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={colSpan} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : sortedPromotions.length === 0 ? (
                <TableRow><TableCell colSpan={colSpan} className="text-center py-8">Aucune promotion</TableCell></TableRow>
              ) : (
                sortedPromotions.map(promo => (
                  <TableRow key={promo.id} className={!promo.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      {promo.image_url
                        ? <img src={promo.image_url} alt={promo.title} className="w-12 h-12 object-cover rounded-lg" />
                        : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-400" /></div>
                      }
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
                      <div>{fmt(promo.valid_from)}</div>
                      <div className="text-gray-400">→ {fmt(promo.valid_until)}</div>
                    </TableCell>
                    <TableCell>
                      {promo.zones?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {promo.zones.slice(0, 2).map((z, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>{z}</span>
                          ))}
                          {promo.zones.length > 2 && <span className="text-xs text-gray-400">+{promo.zones.length - 2}</span>}
                        </div>
                      ) : <span className="text-xs text-gray-400">Toutes zones</span>}
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
                    {/* Colonne # — numéro d'ordre visible */}
                    <TableCell className="text-center">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                        {promo.display_order}
                      </span>
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
                        {promo.promo_code && (promo as any).scan_enabled && (
                          <Button variant="outline" size="sm" onClick={() => setShowQrModal(promo.promo_code!)} title="Générer QR Code">
                            <QrCode className="w-4 h-4" />
                          </Button>
                        )}
                        {canWrite  && <Button variant="outline"     size="sm" onClick={() => handleEdit(promo)}><Edit  className="w-4 h-4" /></Button>}
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
        {/* ── Modal QR Code ── */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowQrModal(null)}>
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <QrCode className="w-5 h-5" style={{ color: VITOGAZ_GREEN }} />
                  QR Code — <code className="font-mono text-sm">{showQrModal}</code>
                </h3>
                <button onClick={() => setShowQrModal(null)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-center mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`https://vitobyvitogaz.mg/fr/scan/${showQrModal}`)}&margin=10`}
                  alt={`QR ${showQrModal}`}
                  className="rounded-xl border border-gray-100"
                  width={260} height={260}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mb-4 font-mono break-all">
                https://vitobyvitogaz.mg/fr/scan/{showQrModal}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 text-white gap-2"
                  style={{ backgroundColor: VITOGAZ_GREEN }}
                  onClick={() => {
                    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(`https://vitobyvitogaz.mg/fr/scan/${showQrModal}`)}&margin=20`
                    const a = document.createElement('a'); a.href = url; a.download = `qr-${showQrModal}.png`; a.target = '_blank'; a.click()
                  }}
                >
                  <Download className="w-4 h-4" /> Télécharger PNG
                </Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`https://vitobyvitogaz.mg/fr/scan/${showQrModal}`); }}>
                  Copier URL
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}