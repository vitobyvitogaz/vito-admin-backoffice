"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Phone,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { exportToCSV } from "@/lib/export-csv";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";

const PAGE_SIZE = 50;
const VITOGAZ_GREEN = "#008B7F";

// Icône bouteille de gaz custom
const GasBottleIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2h4" />
    <path d="M12 2v2" />
    <path d="M8 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <path d="M8 10h8" />
    <path d="M8 14h8" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// SortKey sans null — inclut is_active
type SortKey = "name" | "city" | "type" | "is_active";

interface Product {
  id: string;
  name: string;
  category: string;
  product_code: string;
  is_active: boolean;
}

interface ResellerProduct {
  product_id: string;
  products: Product;
}

interface Reseller {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  type: string;
  phone: string;
  whatsapp: string | null;
  is_active: boolean;
  reseller_products?: ResellerProduct[];
}

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [filteredResellers, setFilteredResellers] = useState<Reseller[]>([]);
  const [sortedResellers, setSortedResellers] = useState<Reseller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Tri — SortKey | null pour le state
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
    type: "Station Service",
    phone: "",
    whatsapp: "",
    is_active: true,
  });

  useEffect(() => {
    fetchResellers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredResellers(resellers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = resellers.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.city.toLowerCase().includes(query) ||
          r.address.toLowerCase().includes(query)
      );
      setFilteredResellers(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, resellers]);

  // Tri appliqué après filtre
  useEffect(() => {
    if (!sortColumn || !sortDirection) {
      setSortedResellers(filteredResellers);
      return;
    }
    const col = sortColumn;
    const dir = sortDirection;
    const sorted = [...filteredResellers].sort((a, b) => {
      if (col === "is_active") {
        const valA = a.is_active ? 1 : 0;
        const valB = b.is_active ? 1 : 0;
        return dir === "asc" ? valA - valB : valB - valA;
      }
      const valA = a[col].toLowerCase();
      const valB = b[col].toLowerCase();
      if (valA < valB) return dir === "asc" ? -1 : 1;
      if (valA > valB) return dir === "asc" ? 1 : -1;
      return 0;
    });
    setSortedResellers(sorted);
    setCurrentPage(1);
  }, [filteredResellers, sortColumn, sortDirection]);

  // Données de la page courante
  const totalPages = Math.ceil(sortedResellers.length / PAGE_SIZE);
  const paginatedResellers = sortedResellers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
    const labels: Record<SortKey, string> = { name: "Nom", city: "Ville", type: "Type", is_active: "Actif" };
    if (sortColumn === "is_active") {
      return `Trié par Actif (${sortDirection === "desc" ? "Actifs en premier" : "Inactifs en premier"})`;
    }
    return `Trié par ${labels[sortColumn]} (${sortDirection === "asc" ? "A → Z" : "Z → A"})`;
  };

  const fetchResellers = async () => {
    try {
      // Les produits sont déjà inclus dans la réponse via reseller_products
      const data = await apiGet<Reseller[]>('/resellers');
      setResellers(data);
      setFilteredResellers(data);
      setSortedResellers(data);
    } catch (error) {
      console.error("Erreur chargement revendeurs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les revendeurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiGet<Product[]>('/products');
      setProducts(data.filter((p) => p.is_active));
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    }
  };

  const fetchResellerProducts = async (resellerId: string) => {
    try {
      const data = await apiGet<ResellerProduct[]>(`/resellers/${resellerId}/products`);
      setSelectedProducts(data.map((item) => item.product_id));
    } catch (error) {
      console.error("Erreur chargement produits du revendeur:", error);
    }
  };

  const handleToggleActive = async (reseller: Reseller) => {
    setTogglingId(reseller.id);
    try {
      await apiPatch(`/resellers/${reseller.id}`, { is_active: !reseller.is_active });
      setResellers((prev) =>
        prev.map((r) =>
          r.id === reseller.id ? { ...r, is_active: !r.is_active } : r
        )
      );
      toast({
        title: "Succès !",
        description: `Revendeur ${!reseller.is_active ? "activé" : "désactivé"}`,
      });
    } catch (error) {
      console.error("Erreur toggle:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(sortedResellers, "revendeurs", {
      name: "Nom",
      city: "Ville",
      address: "Adresse",
      type: "Type",
      phone: "Téléphone",
      whatsapp: "WhatsApp",
      latitude: "Latitude",
      longitude: "Longitude",
      is_active: "Actif",
    });
  };

  // Utilise les produits déjà inclus dans les données du revendeur
  const getCategoryBadges = (reseller: Reseller) => {
    const items = (reseller.reseller_products || []).filter(rp => rp.products?.is_active);
    if (items.length === 0) return null;

    const categoryGroups: Record<string, number> = {};
    items.forEach((item) => {
      const category = item.products.category;
      categoryGroups[category] = (categoryGroups[category] || 0) + 1;
    });

    const categoryColors: Record<string, string> = {
      Bouteilles: "bg-teal-100 text-teal-700",
      Accessoires: "bg-green-100 text-green-700",
      Kit: "bg-purple-100 text-purple-700",
      "Gaz au détail": "bg-orange-100 text-orange-700",
    };

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(categoryGroups).map(([category, count]) => (
          <span
            key={category}
            className={`px-2 py-1 text-xs rounded-full ${
              categoryColors[category] || "bg-gray-100 text-gray-700"
            }`}
          >
            {category} ({count})
          </span>
        ))}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      whatsapp: formData.whatsapp || null,
      services: {},
      is_verified: true,
    };
    try {
      let resellerId = editingId;
      if (editingId) {
        await apiPatch(`/resellers/${editingId}`, payload);
        toast({ title: "Succès !", description: "Revendeur modifié avec succès" });
      } else {
        const newReseller = await apiPost<Reseller>('/resellers', payload);
        resellerId = newReseller.id;
        toast({ title: "Succès !", description: "Revendeur créé avec succès" });
      }
      if (resellerId) {
        await apiPost(`/resellers/${resellerId}/products`, { productIds: selectedProducts });
      }
      await fetchResellers();
      resetForm();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const handleEdit = async (reseller: Reseller) => {
    setFormData({
      name: reseller.name,
      address: reseller.address,
      city: reseller.city,
      latitude: reseller.latitude.toString(),
      longitude: reseller.longitude.toString(),
      type: reseller.type,
      phone: reseller.phone,
      whatsapp: reseller.whatsapp || "",
      is_active: reseller.is_active,
    });
    setEditingId(reseller.id);
    setShowForm(true);
    await fetchResellerProducts(reseller.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce revendeur ?")) return;
    try {
      await apiDelete(`/resellers/${id}`);
      toast({ title: "Succès !", description: "Revendeur supprimé" });
      await fetchResellers();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const resetForm = () => {
    setFormData({
      name: "", address: "", city: "", latitude: "", longitude: "",
      type: "Station Service", phone: "", whatsapp: "", is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
    setSelectedProducts([]);
  };

  // Colonnes triables avec leurs labels
  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Nom" },
    { key: "city", label: "Ville" },
    { key: "type", label: "Type" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Gestion des Revendeurs" />
      <Navigation />

      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Revendeurs</h2>
              <p className="text-sm text-gray-500">
                {resellers.length} revendeur(s) au total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={sortedResellers.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="gap-2 text-white"
              style={{ backgroundColor: VITOGAZ_GREEN }}
            >
              <Plus className="w-4 h-4" />
              {showForm ? "Annuler" : "Nouveau Revendeur"}
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier le Revendeur" : "Nouveau Revendeur"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informations de base</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom *</Label>
                      <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="city">Ville *</Label>
                      <Input id="city" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Adresse *</Label>
                      <Input id="address" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="latitude">Latitude *</Label>
                      <Input id="latitude" type="number" step="any" required value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} placeholder="-18.8792" />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude *</Label>
                      <Input id="longitude" type="number" step="any" required value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} placeholder="47.5079" />
                    </div>
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <select id="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                        <option value="Station Service">Station Service</option>
                        <option value="Épicerie">Épicerie</option>
                        <option value="Quincaillerie">Quincaillerie</option>
                        <option value="Libre service">Libre service</option>
                        <option value="Autres">Autres</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input id="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+261 32 00 00 001" />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input id="whatsapp" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="+261 32 00 00 001" />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm font-medium">Revendeur actif</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Produits vendus */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {/*<GasBottleIcon className="w-5 h-5" style={{ color: VITOGAZ_GREEN } as React.CSSProperties} />*/}
                    <GasBottleIcon className="w-5 h-5" style={{ color: VITOGAZ_GREEN }} />
                    <h3 className="text-lg font-semibold">Produits vendus</h3>
                    <span className="text-sm text-gray-500">
                      ({selectedProducts.length} sélectionné{selectedProducts.length > 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedProducts.includes(product.id)
                            ? "bg-teal-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        style={selectedProducts.includes(product.id) ? { borderColor: VITOGAZ_GREEN } : {}}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                          </div>
                          <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={() => {}} className="mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
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
              <Input
                placeholder="Rechercher par nom, ville ou adresse..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {/* Colonnes triables : Nom, Ville, Type */}
                {sortableCols.map((col) => {
                  const isActive = sortColumn === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none transition-colors hover:bg-gray-50"
                      style={isActive ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </TableHead>
                  );
                })}
                <TableHead>Produits</TableHead>
                <TableHead>Contact</TableHead>
                {/* Colonne Actif — triable */}
                <TableHead
                  onClick={() => handleSort("is_active")}
                  className="cursor-pointer select-none transition-colors hover:bg-gray-50"
                  style={sortColumn === "is_active" ? { backgroundColor: "#f0faf9", color: VITOGAZ_GREEN } : {}}
                >
                  <span className="flex items-center gap-1">
                    Actif
                    <SortIcon column="is_active" />
                  </span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell>
                </TableRow>
              ) : paginatedResellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Aucun revendeur trouvé</TableCell>
                </TableRow>
              ) : (
                paginatedResellers.map((reseller) => (
                  <TableRow key={reseller.id} className={!reseller.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{reseller.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {reseller.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: "#e6f4f3", color: VITOGAZ_GREEN }}>
                        {reseller.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadges(reseller) || (
                        <span className="text-xs text-gray-400">Aucun produit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {reseller.phone}
                      </div>
                    </TableCell>
                    {/* Toggle is_active */}
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(reseller)}
                        disabled={togglingId === reseller.id}
                        title={reseller.is_active ? "Désactiver" : "Activer"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          togglingId === reseller.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        style={{ backgroundColor: reseller.is_active ? VITOGAZ_GREEN : "#D1D5DB" }}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reseller.is_active ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/resellers/${reseller.id}`}>
                          <Button variant="outline" size="sm" title="Horaires et produits">
                            <Clock className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(reseller)} title="Modifier">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(reseller.id)} title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pied de tableau : indicateur de tri + pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Page {currentPage} sur {totalPages} — {sortedResellers.length} revendeur(s)
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8"
                      style={
                        page === currentPage
                          ? { backgroundColor: VITOGAZ_GREEN, color: "white", borderColor: VITOGAZ_GREEN }
                          : {}
                      }
                      variant={page === currentPage ? "default" : "outline"}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}