"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  Percent,
  X,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";

const API_URL = 'https://vito-backend-supabase.onrender.com/api/v1';
const VITOGAZ_GREEN = "#008B7F";

// "status" retiré des SortKey — colonne Statut supprimée
type SortKey = "title" | "discount" | "validity" | "zones" | "usage";

interface Promotion {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  discount_value: number;
  discount_type: string;
  promo_code: string | null;
  valid_from: string;
  valid_until: string;
  image_url: string | null;
  product_category: string | null;
  zones: string[];
  applicable_products: string[];
  conditions: string[];
  usage_count: number;
  max_usage: number | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [sortedPromotions, setSortedPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Tri
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    discount_value: "",
    discount_type: "percentage",
    promo_code: "",
    valid_from: "",
    valid_until: "",
    image_url: "",
    product_category: "",
    zones: [] as string[],
    applicable_products: [] as string[],
    conditions: [] as string[],
    max_usage: "",
    is_active: true,
    is_featured: false,
    display_order: "0",
  });

  const [newProduct, setNewProduct] = useState("");
  const [newCondition, setNewCondition] = useState("");

  useEffect(() => { fetchPromotions(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPromotions(promotions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = promotions.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.promo_code && p.promo_code.toLowerCase().includes(query)) ||
          p.zones.some(zone => zone.toLowerCase().includes(query))
      );
      setFilteredPromotions(filtered);
    }
  }, [searchQuery, promotions]);

  // Tri appliqué après filtre
  useEffect(() => {
    if (!sortColumn || !sortDirection) {
      setSortedPromotions(filteredPromotions);
      return;
    }
    const col = sortColumn;
    const dir = sortDirection;
    const sorted = [...filteredPromotions].sort((a, b) => {
      if (col === "title") {
        const valA = a.title.toLowerCase();
        const valB = b.title.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      }
      if (col === "discount") {
        return dir === "asc" ? a.discount_value - b.discount_value : b.discount_value - a.discount_value;
      }
      if (col === "validity") {
        return dir === "asc"
          ? new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime()
          : new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime();
      }
      if (col === "zones") {
        return dir === "asc"
          ? a.zones.length - b.zones.length
          : b.zones.length - a.zones.length;
      }
      if (col === "usage") {
        return dir === "asc"
          ? (a.usage_count || 0) - (b.usage_count || 0)
          : (b.usage_count || 0) - (a.usage_count || 0);
      }
      return 0;
    });
    setSortedPromotions(sorted);
  }, [filteredPromotions, sortColumn, sortDirection]);

  const handleSort = (column: SortKey) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    if (sortDirection === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const sortLabel = (): string | null => {
    if (!sortColumn || !sortDirection) return null;
    if (sortColumn === "zones") return `Trié par Zones (${sortDirection === "desc" ? "Plus de zones" : "Moins de zones"})`;
    if (sortColumn === "usage") return `Trié par Utilisations (${sortDirection === "desc" ? "Plus utilisées" : "Moins utilisées"})`;
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
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({ title: "Erreur", description: "Impossible de charger les promotions", variant: "destructive" });
      setPromotions([]);
      setFilteredPromotions([]);
      setSortedPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const response = await fetch(`${API_URL}/promotions/upload-image`, { method: 'POST', body: fd });
      if (!response.ok) throw new Error('Erreur upload');
      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.file_url }));
      toast({ title: "Succès !", description: "Image uploadée avec succès" });
    } catch (error) {
      console.error("Erreur upload:", error);
      toast({ title: "Erreur", description: "Erreur lors de l'upload de l'image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddProduct = () => {
    if (newProduct.trim() && !formData.applicable_products.includes(newProduct.trim())) {
      setFormData(prev => ({ ...prev, applicable_products: [...prev.applicable_products, newProduct.trim()] }));
      setNewProduct("");
    }
  };

  const handleRemoveProduct = (product: string) => {
    setFormData(prev => ({ ...prev, applicable_products: prev.applicable_products.filter(p => p !== product) }));
  };

  const handleAddCondition = () => {
    if (newCondition.trim() && !formData.conditions.includes(newCondition.trim())) {
      setFormData(prev => ({ ...prev, conditions: [...prev.conditions, newCondition.trim()] }));
      setNewCondition("");
    }
  };

  const handleRemoveCondition = (condition: string) => {
    setFormData(prev => ({ ...prev, conditions: prev.conditions.filter(c => c !== condition) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.zones.length === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins une zone", variant: "destructive" });
      return;
    }
    const validFromISO = formData.valid_from ? new Date(formData.valid_from + 'T00:00:00Z').toISOString() : undefined;
    const validUntilISO = new Date(formData.valid_until + 'T23:59:59Z').toISOString();
    const payload = {
      title: formData.title, subtitle: formData.subtitle || null,
      description: formData.description || "Promotion spéciale",
      discount_value: parseFloat(formData.discount_value), discount_type: formData.discount_type,
      promo_code: formData.promo_code || null, valid_from: validFromISO, valid_until: validUntilISO,
      image_url: formData.image_url || null, product_category: formData.product_category || null,
      zones: formData.zones, applicable_products: formData.applicable_products,
      conditions: formData.conditions, max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
      is_active: formData.is_active, is_featured: formData.is_featured,
      display_order: parseInt(formData.display_order) || 0,
    };
    try {
      if (editingId) {
        await apiPatch(`/promotions/${editingId}`, payload);
        toast({ title: "Succès !", description: "Promotion modifiée avec succès" });
      } else {
        await apiPost('/promotions', payload);
        toast({ title: "Succès !", description: "Promotion créée avec succès" });
      }
      await fetchPromotions();
      resetForm();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const handleEdit = (promo: Promotion) => {
    setFormData({
      title: promo.title, subtitle: promo.subtitle || "", description: promo.description || "",
      discount_value: promo.discount_value.toString(), discount_type: promo.discount_type,
      promo_code: promo.promo_code || "", valid_from: promo.valid_from.split("T")[0],
      valid_until: promo.valid_until.split("T")[0], image_url: promo.image_url || "",
      product_category: promo.product_category || "", zones: promo.zones || [],
      applicable_products: promo.applicable_products || [], conditions: promo.conditions || [],
      max_usage: promo.max_usage ? promo.max_usage.toString() : "",
      is_active: promo.is_active, is_featured: promo.is_featured,
      display_order: promo.display_order.toString(),
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette promotion ?")) return;
    try {
      await apiDelete(`/promotions/${id}`);
      toast({ title: "Succès !", description: "Promotion supprimée" });
      await fetchPromotions();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  // Toggle is_active — fetchPromotions() pour forcer le rafraîchissement
  const handleToggleActive = async (promo: Promotion) => {
    setTogglingId(promo.id);
    try {
      await apiPatch(`/promotions/${promo.id}`, { is_active: !promo.is_active });
      toast({
        title: "Succès !",
        description: `Promotion ${!promo.is_active ? "activée" : "désactivée"}`,
      });
      await fetchPromotions();
    } catch (error) {
      console.error("Erreur toggle:", error);
      toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "", subtitle: "", description: "", discount_value: "", discount_type: "percentage",
      promo_code: "", valid_from: "", valid_until: "", image_url: "", product_category: "",
      zones: [], applicable_products: [], conditions: [], max_usage: "",
      is_active: true, is_featured: false, display_order: "0",
    });
    setEditingId(null);
    setShowForm(false);
    setNewProduct("");
    setNewCondition("");
  };

  const isEffectivelyActive = (promo: Promotion) => {
    try {
      const now = new Date();
      const end = new Date(promo.valid_until);
      return promo.is_active && now <= end;
    } catch { return false; }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("fr-FR");
    } catch { return "-"; }
  };

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "title", label: "Titre" },
    { key: "discount", label: "Réduction" },
    { key: "validity", label: "Validité" },
    { key: "zones", label: "Zones" },
    { key: "usage", label: "Utilisations" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Gestion des Promotions" />
      <Navigation />

      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Promotions</h2>
              <p className="text-sm text-gray-500">
                {promotions.length} promotion(s) au total •{" "}
                {promotions.filter(isEffectivelyActive).length} active(s)
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouvelle Promotion"}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier la Promotion" : "Nouvelle Promotion"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informations générales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Titre *</Label>
                      <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Fety Masaka 2025" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="subtitle">Sous-titre</Label>
                      <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Ex: Promotion de fin d'année" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Détails de la promotion" rows={3} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="image">Image de la promotion</Label>
                      <div className="mt-2">
                        {formData.image_url ? (
                          <div className="space-y-2">
                            <div className="relative w-full h-48 border-2 border-gray-200 rounded-lg overflow-hidden">
                              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">Cliquez sur X pour changer l'image</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="flex-1" />
                            {uploading && <span className="text-sm text-gray-500">Upload...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Réduction</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount_type">Type de réduction *</Label>
                      <select id="discount_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}>
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (Ar)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value">Valeur de réduction *</Label>
                      <Input id="discount_value" type="number" min="0" max={formData.discount_type === "percentage" ? "100" : undefined} step="0.01" required value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder={formData.discount_type === "percentage" ? "Ex: 30" : "Ex: 5000"} />
                    </div>
                    <div>
                      <Label htmlFor="promo_code">Code Promo</Label>
                      <Input id="promo_code" placeholder="Ex: FETY2025" value={formData.promo_code} onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label htmlFor="product_category">Catégorie de produit</Label>
                      <select id="product_category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.product_category} onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}>
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

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Période de validité</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valid_from">Date de début</Label>
                      <Input id="valid_from" type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="valid_until">Date de fin *</Label>
                      <Input id="valid_until" type="date" required value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Zones concernées</h3>
                  <ZoneSelector selectedZones={formData.zones} onChange={(zones) => setFormData({ ...formData, zones })} label="Zones concernées" required placeholder="Sélectionner les zones..." />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Produits applicables</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="Ex: Bouteille 12.5kg" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProduct(); } }} />
                      <Button type="button" onClick={handleAddProduct} variant="outline"><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.applicable_products.map((product, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                          {product}
                          <button type="button" onClick={() => handleRemoveProduct(product)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Conditions d'application</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="Ex: Minimum 2 bouteilles" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCondition(); } }} />
                      <Button type="button" onClick={handleAddCondition} variant="outline"><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.conditions.map((condition, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {condition}
                          <button type="button" onClick={() => handleRemoveCondition(condition)} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_usage">Nombre max d'utilisations</Label>
                      <Input id="max_usage" type="number" min="0" value={formData.max_usage} onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })} placeholder="Laisser vide pour illimité" />
                    </div>
                    <div>
                      <Label htmlFor="display_order">Ordre d'affichage</Label>
                      <Input id="display_order" type="number" min="0" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} placeholder="0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                      <Label htmlFor="is_active" className="cursor-pointer">Promotion active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="w-4 h-4" />
                      <Label htmlFor="is_featured" className="cursor-pointer">Promotion mise en avant</Label>
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
              <Input placeholder="Rechercher par titre, code ou zone..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                {sortableCols.map((col) => {
                  const isColActive = sortColumn === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none transition-colors hover:bg-gray-50"
                      style={isColActive ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </TableHead>
                  );
                })}
                <TableHead>Code</TableHead>
                <TableHead>Activer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : sortedPromotions.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Aucune promotion trouvée</TableCell></TableRow>
              ) : (
                sortedPromotions.map((promo) => (
                  <TableRow key={promo.id} className={!isEffectivelyActive(promo) ? "opacity-60" : ""}>
                    {/* Image */}
                    <TableCell>
                      {promo.image_url ? (
                        <img src={promo.image_url} alt={promo.title} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    {/* Titre */}
                    <TableCell className="font-medium">
                      <div>{promo.title}</div>
                      {promo.subtitle && <div className="text-xs text-gray-400">{promo.subtitle}</div>}
                    </TableCell>
                    {/* Réduction */}
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-sm" style={{ color: VITOGAZ_GREEN }}>
                        <Percent className="w-3.5 h-3.5" />
                        {promo.discount_type === "percentage"
                          ? `${promo.discount_value}%`
                          : `${promo.discount_value} Ar`}
                      </div>
                    </TableCell>
                    {/* Validité */}
                    <TableCell className="text-xs text-gray-600">
                      <div>{formatDate(promo.valid_from)}</div>
                      <div className="text-gray-400">→ {formatDate(promo.valid_until)}</div>
                    </TableCell>
                    {/* Zones */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {promo.zones && promo.zones.length > 0 ? (
                          <>
                            {promo.zones.slice(0, 2).map((zone, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                                {zone}
                              </span>
                            ))}
                            {promo.zones.length > 2 && (
                              <span className="text-xs text-gray-400">+{promo.zones.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">Toutes zones</span>
                        )}
                      </div>
                    </TableCell>
                    {/* Utilisations */}
                    <TableCell className="text-sm">
                      <span className="font-medium">{promo.usage_count || 0}</span>
                      {promo.max_usage && (
                        <span className="text-xs text-gray-400"> / {promo.max_usage}</span>
                      )}
                    </TableCell>
                    {/* Code */}
                    <TableCell>
                      {promo.promo_code ? (
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{promo.promo_code}</code>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    {/* Toggle is_active */}
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingId === promo.id}
                        title={promo.is_active ? "Désactiver" : "Activer"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          togglingId === promo.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        style={{ backgroundColor: promo.is_active ? VITOGAZ_GREEN : "#D1D5DB" }}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          promo.is_active ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(promo)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(promo.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pied de tableau */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            <p className="text-sm text-gray-500">{sortedPromotions.length} promotion(s)</p>
          </div>
        </Card>
      </main>
    </div>
  );
}