"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Truck, Plus, Edit, Trash2, Search, CheckCircle, ThumbsUp,
  X, Image as ImageIcon, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, ChevronDown, Settings, Star,
} from "lucide-react";
import { toast } from "@/lib/use-toast";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api"; // ← apiGet ajouté
import { exportToCSV } from "@/lib/export-csv";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
// ← ZoneSelector supprimé

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vito-backend-supabase.onrender.com/api/v1';
const PAGE_SIZE = 50;
const VITOGAZ_GREEN = "#008B7F";

type SortKey = "name" | "zones" | "rating" | "is_active";

// ── ZonePills — multi-select avec recherche (même pattern que Promotions) ──────
const ZonePills = ({
  selectedZones,
  onChange,
}: {
  selectedZones: string[]
  onChange: (z: string[]) => void
}) => {
  const [zones, setZones] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ id: string; name: string }[]>('/zones')
      .then(d => setZones(d.map(z => z.name).sort((a, b) => a.localeCompare(b, 'fr'))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filtered = zones.filter(
    z => z.toLowerCase().includes(query.toLowerCase()) && !selectedZones.includes(z)
  )

  return (
    <div ref={ref} className="space-y-2">
      {/* Pills sélectionnées */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selectedZones.map(z => (
          <span
            key={z}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: VITOGAZ_GREEN }}
          >
            {z}
            <button
              type="button"
              onClick={() => onChange(selectedZones.filter(x => x !== z))}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selectedZones.length === 0 && (
          <span className="text-xs text-gray-400 self-center">
            Aucune zone sélectionnée
          </span>
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
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            strokeWidth={1.5}
          />
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
                  onMouseDown={e => {
                    e.preventDefault()
                    onChange([...selectedZones, zone])
                    setQuery("")
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                >
                  {zone}
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

interface Review {
  id: string;
  rating: number;
  reviewer_name: string | null;
  comment: string | null;
  feedback_at: string;
  contact_type: string;
}

interface DeliveryCompany {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  messenger: string | null;
  email: string | null;
  website: string | null;
  service_areas: string[];
  delivery_time: string | null;
  min_order_amount: string | null;
  delivery_fee: string | null;
  working_hours: string | null;
  rating: number;
  review_count: number;
  features: string[];
  specialties: string[];
  is_verified: boolean;
  verified_at: string | null;
  is_active: boolean;
  display_order: number;
}

export default function DeliveryCompaniesPage() {
  const { canWrite, canDelete } = useCurrentUser();

  const [companies, setCompanies]                 = useState<DeliveryCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<DeliveryCompany[]>([]);
  const [sortedCompanies, setSortedCompanies]     = useState<DeliveryCompany[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [searchQuery, setSearchQuery]             = useState("");
  const [showForm, setShowForm]                   = useState(false);
  const [editingId, setEditingId]                 = useState<string | null>(null);
  const [uploading, setUploading]                 = useState(false);
  const [togglingId, setTogglingId]               = useState<string | null>(null);
  const [showFeedbackConfig, setShowFeedbackConfig] = useState(false);
  const [feedbackSettings, setFeedbackSettings]     = useState({ delay_value: 2, delay_unit: 'hours' });
  const [savingFeedback, setSavingFeedback]          = useState(false);
  const [expandedReviews, setExpandedReviews]       = useState<string | null>(null);
  const [reviewsMap, setReviewsMap]                 = useState<Record<string, Review[]>>({});
  const [loadingReviews, setLoadingReviews]         = useState<string | null>(null);
  const [deletingReview, setDeletingReview]         = useState<string | null>(null);

  const [sortColumn, setSortColumn]       = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [currentPage, setCurrentPage]     = useState(1);

  const [formData, setFormData] = useState({
    name: "", logo_url: "", description: "", phone: "",
    whatsapp: "", messenger: "", email: "", website: "",
    service_areas: [] as string[], delivery_time: "",
    min_order_amount: "", delivery_fee: "", working_hours: "",
    features: [] as string[], specialties: [] as string[],
    is_verified: false,
    verified_at: "",
    is_active: true,
    display_order: 0,
  });

  const [featureInput, setFeatureInput]     = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");

  useEffect(() => { fetchCompanies(); fetchFeedbackSettings(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCompanies(companies.filter(
        (c) => c.name.toLowerCase().includes(query) ||
               c.service_areas.some((a) => a.toLowerCase().includes(query))
      ));
    }
    setCurrentPage(1);
  }, [searchQuery, companies]);

  useEffect(() => {
    if (!sortColumn || !sortDirection) { setSortedCompanies(filteredCompanies); return; }
    const col = sortColumn; const dir = sortDirection;
    const sorted = [...filteredCompanies].sort((a, b) => {
      if (col === "name") {
        const va = a.name.toLowerCase(); const vb = b.name.toLowerCase();
        return dir === "asc" ? va < vb ? -1 : va > vb ? 1 : 0 : va > vb ? -1 : va < vb ? 1 : 0;
      }
      if (col === "zones")     return dir === "asc" ? a.service_areas.length - b.service_areas.length : b.service_areas.length - a.service_areas.length;
      if (col === "rating")    return dir === "asc" ? a.rating - b.rating : b.rating - a.rating;
      if (col === "is_active") return dir === "asc" ? (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0) : (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
      return 0;
    });
    setSortedCompanies(sorted);
    setCurrentPage(1);
  }, [filteredCompanies, sortColumn, sortDirection]);

  const totalPages         = Math.ceil(sortedCompanies.length / PAGE_SIZE);
  const paginatedCompanies = sortedCompanies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    if (sortColumn === "is_active") return `Trié par Actif (${sortDirection === "desc" ? "Actifs en premier" : "Inactifs en premier"})`;
    if (sortColumn === "zones")     return `Trié par Zones (${sortDirection === "desc" ? "Plus de zones" : "Moins de zones"})`;
    if (sortColumn === "rating")    return `Trié par Satisfaction (${sortDirection === "desc" ? "Mieux notés" : "Notes croissantes"})`;
    return `Trié par Nom (${sortDirection === "asc" ? "A → Z" : "Z → A"})`;
  };

  const fetchFeedbackSettings = async () => {
    try {
      const data = await apiGet<any>('/settings/feedback_settings')
      if (!data) return
      const raw    = data?.setting_value ?? data?.value ?? data
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (parsed?.delay_value) setFeedbackSettings(prev => ({ ...prev, ...parsed }))
    } catch {}
  }

  const saveFeedbackSettings = async () => {
    setSavingFeedback(true)
    try {
      // Tenter un PATCH d'abord — si la clé n'existe pas encore, créer via POST
      try {
        await apiPatch('/settings/key/feedback_settings', {
          setting_value: JSON.stringify(feedbackSettings),
        })
      } catch {
        // Clé inexistante → créer avec les bons noms de colonnes (app_settings)
        await apiPost('/settings', {
          setting_key:   'feedback_settings',
          setting_value: JSON.stringify(feedbackSettings),
          setting_type:  'json',
          description:   'Configuration du délai de feedback livraison',
          is_active:     true,
        })
      }
      toast({ title: "Succès !", description: "Configuration feedback sauvegardée" })
      setShowFeedbackConfig(false)
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" })
    } finally { setSavingFeedback(false) }
  }

  const loadReviews = async (companyId: string) => {
    if (expandedReviews === companyId) { setExpandedReviews(null); return; }
    setExpandedReviews(companyId)
    if (reviewsMap[companyId]) return // déjà chargé
    setLoadingReviews(companyId)
    try {
      const data = await apiGet<Review[]>(`/feedback/reviews/${companyId}`)
      setReviewsMap(prev => ({ ...prev, [companyId]: data || [] }))
    } catch {
      setReviewsMap(prev => ({ ...prev, [companyId]: [] }))
    } finally { setLoadingReviews(null) }
  }

  const handleDeleteReview = async (companyId: string, attemptId: string) => {
    if (!confirm('Supprimer cet avis ? Cette action est irréversible.')) return
    setDeletingReview(attemptId)
    try {
      await apiDelete(`/feedback/review/${attemptId}`)
      setReviewsMap(prev => ({
        ...prev,
        [companyId]: (prev[companyId] || []).filter(r => r.id !== attemptId),
      }))
      await fetchCompanies() // Rafraîchir le rating affiché
      toast({ title: "Avis supprimé" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer l'avis", variant: "destructive" })
    } finally { setDeletingReview(null) }
  }

  const formatReviewDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return '' }
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/delivery-companies`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setCompanies(data || []);
      setFilteredCompanies(data || []);
      setSortedCompanies(data || []);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les sociétés de livraison", variant: "destructive" });
      setCompanies([]); setFilteredCompanies([]); setSortedCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 MB", variant: "destructive" }); return; }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const response = await fetch(`${API_URL}/delivery-companies/upload-logo`, { method: 'POST', body: fd });
      if (!response.ok) throw new Error('Erreur upload');
      const data = await response.json();
      setFormData((prev) => ({ ...prev, logo_url: data.file_url }));
      toast({ title: "Succès !", description: "Logo uploadé avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l'upload du logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (company: DeliveryCompany) => {
    if (!canWrite) return;
    setTogglingId(company.id);
    try {
      await apiPatch(`/delivery-companies/${company.id}`, { is_active: !company.is_active });
      setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, is_active: !c.is_active } : c));
      toast({ title: "Succès !", description: `Société ${!company.is_active ? "activée" : "désactivée"}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(sortedCompanies, "societes_livraison", {
      name: "Nom", phone: "Téléphone", whatsapp: "WhatsApp", email: "Email",
      service_areas: "Zones", delivery_time: "Délai", delivery_fee: "Frais",
      is_verified: "Vérifiée", verified_at: "Date vérification",
      is_active: "Active", rating: "Satisfaction", review_count: "Nb feedbacks",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.service_areas.length === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins une zone de service", variant: "destructive" });
      return;
    }
    const payload = {
      name:             formData.name,
      logo_url:         formData.logo_url || null,
      description:      formData.description || null,
      phone:            formData.phone,
      whatsapp:         formData.whatsapp || null,
      messenger:        formData.messenger || null,
      email:            formData.email || null,
      website:          formData.website || null,
      service_areas:    formData.service_areas,
      delivery_time:    formData.delivery_time || null,
      min_order_amount: formData.min_order_amount || null,
      delivery_fee:     formData.delivery_fee || null,
      working_hours:    formData.working_hours || null,
      features:         formData.features,
      specialties:      formData.specialties,
      is_verified:      formData.is_verified,
      verified_at:      formData.verified_at
        ? new Date(formData.verified_at).toISOString()
        : formData.is_verified ? undefined : null,
      is_active:        formData.is_active,
      display_order:    Number(formData.display_order) || 0,
    };
    try {
      if (editingId) {
        await apiPatch(`/delivery-companies/${editingId}`, payload);
      } else {
        await apiPost('/delivery-companies', payload);
      }
      toast({ title: "Succès !", description: editingId ? "Société modifiée" : "Société créée" });
      await fetchCompanies();
      resetForm();
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const handleEdit = (company: DeliveryCompany) => {
    const verifiedAtInput = company.verified_at
      ? new Date(company.verified_at).toISOString().split('T')[0]
      : "";

    setFormData({
      name:             company.name,
      logo_url:         company.logo_url || "",
      description:      company.description || "",
      phone:            company.phone,
      whatsapp:         company.whatsapp || "",
      messenger:        company.messenger || "",
      email:            company.email || "",
      website:          company.website || "",
      service_areas:    company.service_areas || [],
      delivery_time:    company.delivery_time || "",
      min_order_amount: company.min_order_amount || "",
      delivery_fee:     company.delivery_fee || "",
      working_hours:    company.working_hours || "",
      features:         company.features || [],
      specialties:      company.specialties || [],
      is_verified:      company.is_verified,
      verified_at:      verifiedAtInput,
      is_active:        company.is_active,
      display_order:    company.display_order,
    });
    setEditingId(company.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette société ?")) return;
    try {
      await apiDelete(`/delivery-companies/${id}`);
      toast({ title: "Succès !", description: "Société supprimée" });
      await fetchCompanies();
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };
  const removeFeature   = (f: string) => setFormData({ ...formData, features:    formData.features.filter((x) => x !== f) });
  const addSpecialty    = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData({ ...formData, specialties: [...formData.specialties, specialtyInput.trim()] });
      setSpecialtyInput("");
    }
  };
  const removeSpecialty = (s: string) => setFormData({ ...formData, specialties: formData.specialties.filter((x) => x !== s) });

  const resetForm = () => {
    setFormData({
      name: "", logo_url: "", description: "", phone: "", whatsapp: "", messenger: "",
      email: "", website: "", service_areas: [], delivery_time: "", min_order_amount: "",
      delivery_fee: "", working_hours: "", features: [], specialties: [],
      is_verified: false, verified_at: "", is_active: true, display_order: 0,
    });
    setFeatureInput(""); setSpecialtyInput(""); setEditingId(null); setShowForm(false);
  };

  const formatVerifiedDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return null; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="GESTION DES SOCIÉTÉS DE LIVRAISON" />
      <Navigation />

      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Sociétés de Livraison</h2>
              <p className="text-sm text-gray-500">{companies.length} société(s) au total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={sortedCompanies.length === 0} className="gap-2">
              <Download className="w-4 h-4" />Exporter CSV
            </Button>
            {canWrite && (
              <Button variant="outline" onClick={() => setShowFeedbackConfig(!showFeedbackConfig)} className="gap-2">
                <Settings className="w-4 h-4" />Config Feedback
              </Button>
            )}
            {canDelete && (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                <Plus className="w-4 h-4" />
                {showForm ? "Annuler" : "Nouvelle Société"}
              </Button>
            )}
          </div>
        </div>

        {/* Config Feedback */}
        {showFeedbackConfig && canWrite && (
          <Card className="mb-6 border-2" style={{ borderColor: VITOGAZ_GREEN + "30" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4" style={{ color: VITOGAZ_GREEN }} />
                Configuration du Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Délai avant l'envoi de la notification de notation à l'utilisateur qui a contacté une société.</p>
              <div className="flex items-end gap-3">
                <div>
                  <Label>Valeur</Label>
                  <Input
                    type="number" min="1" max="999" className="mt-1 w-28"
                    value={feedbackSettings.delay_value}
                    onChange={e => setFeedbackSettings(s => ({ ...s, delay_value: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label>Unité</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={feedbackSettings.delay_unit}
                    onChange={e => setFeedbackSettings(s => ({ ...s, delay_unit: e.target.value }))}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Heures</option>
                    <option value="days">Jours</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400 pb-2">
                  → Notification envoyée {feedbackSettings.delay_value} {feedbackSettings.delay_unit === 'minutes' ? 'minute(s)' : feedbackSettings.delay_unit === 'hours' ? 'heure(s)' : 'jour(s)'} après le contact
                </p>
              </div>
              <Button onClick={saveFeedbackSettings} disabled={savingFeedback} className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                {savingFeedback ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {showForm && (canDelete || (canWrite && !!editingId)) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier la Société" : "Nouvelle Société"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations générales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom de la société *</Label>
                      <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Livraison Express" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="logo">Logo de la société</Label>
                      <div className="mt-2">
                        {formData.logo_url ? (
                          <div className="space-y-2">
                            <div className="relative w-full h-48 border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                              <img src={formData.logo_url} alt="Preview" className="w-full h-full object-contain p-4" />
                              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, logo_url: "" }))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="flex-1" />
                            {uploading && <span className="text-sm text-gray-500">Upload...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Décrivez les services de la société..." rows={3} />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="phone">Téléphone *</Label><Input id="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+261 32 00 000 00" /></div>
                    <div><Label htmlFor="whatsapp">WhatsApp</Label><Input id="whatsapp" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="+261 32 00 000 00" /></div>
                    <div><Label htmlFor="messenger">Messenger</Label><Input id="messenger" value={formData.messenger} onChange={(e) => setFormData({ ...formData, messenger: e.target.value })} placeholder="URL Messenger" /></div>
                    <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contact@entreprise.mg" /></div>
                    <div className="md:col-span-2"><Label htmlFor="website">Site Web</Label><Input id="website" type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.entreprise.mg" /></div>
                  </div>
                </div>

                {/* Détails service */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Détails du service</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="delivery_time">Délai de livraison</Label><Input id="delivery_time" value={formData.delivery_time} onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })} placeholder="Ex: 24-48h" /></div>
                    <div><Label htmlFor="min_order_amount">Montant minimum</Label><Input id="min_order_amount" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} placeholder="Ex: 50 000 Ar" /></div>
                    <div><Label htmlFor="delivery_fee">Frais de livraison</Label><Input id="delivery_fee" value={formData.delivery_fee} onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })} placeholder="Ex: 5 000 Ar" /></div>
                    <div><Label htmlFor="working_hours">Horaires</Label><Input id="working_hours" value={formData.working_hours} onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })} placeholder="Ex: Lun-Sam 8h-18h" /></div>
                  </div>
                </div>

                {/* ── Zones — ZonePills remplace ZoneSelector ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Zones de service *
                  </h3>
                  <ZonePills
                    selectedZones={formData.service_areas}
                    onChange={(zones) => setFormData({ ...formData, service_areas: zones })}
                  />
                </div>

                {/* Caractéristiques */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Caractéristiques</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="features">Fonctionnalités</Label>
                      <div className="flex gap-2 mb-2">
                        <Input id="features" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())} placeholder="Ex: Paiement mobile" />
                        <Button type="button" onClick={addFeature} size="sm">+</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.features.map((f, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-sm flex items-center gap-2" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                            {f}<button type="button" onClick={() => removeFeature(f)} className="hover:opacity-70">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="specialties">Spécialités</Label>
                      <div className="flex gap-2 mb-2">
                        <Input id="specialties" value={specialtyInput} onChange={(e) => setSpecialtyInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())} placeholder="Ex: Livraison express" />
                        <Button type="button" onClick={addSpecialty} size="sm">+</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.specialties.map((s, idx) => (
                          <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-2">
                            {s}<button type="button" onClick={() => removeSpecialty(s)} className="hover:text-emerald-900">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paramètres */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="display_order">Ordre d'affichage</Label>
                      <Input id="display_order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} placeholder="0" />
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_verified"
                          checked={formData.is_verified}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setFormData({
                              ...formData,
                              is_verified: checked,
                              verified_at: checked
                                ? (formData.verified_at || new Date().toISOString().split('T')[0])
                                : "",
                            })
                          }}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="is_verified" className="flex items-center gap-1.5 cursor-pointer">
                          <CheckCircle className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                          Vérifié par Vitogaz
                        </Label>
                      </div>
                      {formData.is_verified && (
                        <div>
                          <Label htmlFor="verified_at" className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                            Date de vérification
                            <span className="text-xs text-gray-400 font-normal">(optionnelle)</span>
                          </Label>
                          <Input
                            id="verified_at"
                            type="date"
                            value={formData.verified_at}
                            onChange={(e) => setFormData({ ...formData, verified_at: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
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
              <Input placeholder="Rechercher par nom ou zone..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Logo</TableHead>
                <TableHead className="w-36 cursor-pointer select-none hover:bg-gray-50" onClick={() => handleSort("name")} style={sortColumn === "name" ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}>
                  <span className="flex items-center gap-1">Nom<SortIcon column="name" /></span>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-50" onClick={() => handleSort("zones")} style={sortColumn === "zones" ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}>
                  <span className="flex items-center gap-1">Zones<SortIcon column="zones" /></span>
                </TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-50" onClick={() => handleSort("rating")} style={sortColumn === "rating" ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}>
                  <span className="flex items-center gap-1">Satisfaction<SortIcon column="rating" /></span>
                </TableHead>
                {canWrite && (
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50" onClick={() => handleSort("is_active")} style={sortColumn === "is_active" ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}>
                    <span className="flex items-center gap-1">Actif<SortIcon column="is_active" /></span>
                  </TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={canWrite ? 9 : 8} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : paginatedCompanies.length === 0 ? (
                <TableRow><TableCell colSpan={canWrite ? 9 : 8} className="text-center py-8">Aucune société trouvée</TableCell></TableRow>
              ) : (
                paginatedCompanies.map((company) => (
                  <React.Fragment key={company.id}>
                  <TableRow className={!company.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-12 h-12 object-contain rounded-lg bg-white p-1 border" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-36">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight">{company.name}</span>
                        {company.description && <span className="text-xs text-gray-400 line-clamp-1 mt-0.5">{company.description}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                        <span className="font-medium">{company.phone}</span>
                        {company.whatsapp && <span className="text-emerald-600">WA: {company.whatsapp}</span>}
                        {company.email && <span className="text-gray-400 truncate max-w-[120px]">{company.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {company.service_areas && company.service_areas.length > 0 ? (
                          <>
                            {company.service_areas.slice(0, 2).map((area, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>{area}</span>
                            ))}
                            {company.service_areas.length > 2 && <span className="text-xs text-gray-400">+{company.service_areas.length - 2}</span>}
                          </>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-600">
                        {company.delivery_time && <div>⏱️ {company.delivery_time}</div>}
                        {company.delivery_fee && <div>💰 {company.delivery_fee}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {company.is_verified && (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                              <CheckCircle className="w-3 h-3" />Vérifié
                            </span>
                            {company.verified_at && (
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                {formatVerifiedDate(company.verified_at)}
                              </span>
                            )}
                          </div>
                        )}
                        <span className={`text-xs ${company.is_active ? "text-emerald-600" : "text-gray-400"}`}>
                          ● {company.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.review_count > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= Math.round(company.rating) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} strokeWidth={1.5} />
                            ))}
                            <span className="text-xs font-medium text-gray-700 ml-1">{company.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{company.review_count} avis</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(company)}
                          disabled={togglingId === company.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${togglingId === company.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          style={{ backgroundColor: company.is_active ? VITOGAZ_GREEN : "#D1D5DB" }}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${company.is_active ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {company.review_count > 0 && (
                          <Button variant="outline" size="sm" onClick={() => loadReviews(company.id)}
                            className={expandedReviews === company.id ? 'bg-amber-50 border-amber-300 text-amber-700' : ''}>
                            <Star className="w-4 h-4" />
                            <span className="ml-1 text-xs">{company.review_count}</span>
                          </Button>
                        )}
                        {canWrite && <Button variant="outline" size="sm" onClick={() => handleEdit(company)}><Edit className="w-4 h-4" /></Button>}
                        {canDelete && <Button variant="destructive" size="sm" onClick={() => handleDelete(company.id)}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* ── Panneau avis inline ── */}
                  {expandedReviews === company.id && (
                    <TableRow>
                      <TableCell colSpan={canWrite ? 9 : 8} className="p-0 bg-amber-50/50">
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              Avis clients — {company.name}
                              <span className="text-xs font-normal text-gray-500">({company.review_count} avis · {company.rating.toFixed(1)}/5)</span>
                            </h4>
                            <button onClick={() => setExpandedReviews(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                              Fermer
                            </button>
                          </div>

                          {loadingReviews === company.id ? (
                            <div className="flex items-center gap-2 py-4">
                              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" />
                              <span className="text-sm text-gray-400">Chargement des avis...</span>
                            </div>
                          ) : (reviewsMap[company.id] || []).length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">Aucun avis pour cette société.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(reviewsMap[company.id] || []).map((review) => (
                                <div key={review.id} className="bg-white rounded-xl p-4 border border-amber-100 relative">
                                  {/* Supprimer — SUPER_ADMIN uniquement */}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteReview(company.id, review.id)}
                                      disabled={deletingReview === review.id}
                                      className="absolute top-3 right-3 p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                      title="Supprimer cet avis"
                                    >
                                      {deletingReview === review.id
                                        ? <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-500 rounded-full animate-spin" />
                                        : <Trash2 className="w-3.5 h-3.5" />
                                      }
                                    </button>
                                  )}
                                  <div className="flex items-center gap-2.5 mb-2 pr-6">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                                      {review.reviewer_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800 leading-tight">{review.reviewer_name || 'Anonyme'}</p>
                                      <p className="text-[10px] text-gray-400">{formatReviewDate(review.feedback_at)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 mb-2">
                                    {[1,2,3,4,5].map(s => (
                                      <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} strokeWidth={1.5} />
                                    ))}
                                    <span className="text-xs font-medium text-gray-600 ml-1">{review.rating}/5</span>
                                  </div>
                                  {review.comment ? (
                                    <p className="text-xs text-gray-600 italic leading-relaxed">"{review.comment}"</p>
                                  ) : (
                                    <p className="text-xs text-gray-300 italic">Pas de commentaire</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">Page {currentPage} sur {totalPages} — {sortedCompanies.length} société(s)</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button key={page} size="sm" onClick={() => setCurrentPage(page)} className="w-8"
                      variant={page === currentPage ? "default" : "outline"}
                      style={page === currentPage ? { backgroundColor: VITOGAZ_GREEN, color: "white", borderColor: VITOGAZ_GREEN } : {}}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}