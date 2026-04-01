"use client";

import { useEffect, useState, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, Plus, Pencil, Trash2, Search, X, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Package } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const API_URL = 'https://vito-backend-supabase.onrender.com/api/v1';
const VITOGAZ_GREEN = "#008B7F";

type SortKey = "name" | "points_cost" | "stock_quantity" | "category" | "status";

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  stock_quantity: number;
  category: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Vêtements",
  "Électronique",
  "Bons d'achat",
  "Articles ménagers",
  "Accessoires",
  "Autres",
];

export default function RewardItemsPage() {
  const { role } = useCurrentUser();
  const canManage = role === "ADMIN" || role === "GESTIONNAIRE_PROMO";
  const formRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<RewardItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<RewardItem[]>([]);
  const [sortedItems, setSortedItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    points_cost: "",
    stock_quantity: "",
    category: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredItems(
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
      )
    );
  }, [searchQuery, items]);

  useEffect(() => {
    if (!sortColumn || !sortDirection) {
      setSortedItems(filteredItems);
      return;
    }

    const sorted = [...filteredItems].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "points_cost":
          aValue = a.points_cost;
          bValue = b.points_cost;
          break;
        case "stock_quantity":
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case "category":
          aValue = (a.category || "").toLowerCase();
          bValue = (b.category || "").toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setSortedItems(sorted);
  }, [filteredItems, sortColumn, sortDirection]);

  const handleSort = (col: SortKey) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
    }
    return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: VITOGAZ_GREEN }} />;
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiGet<RewardItem[]>("/reward-items?includeInactive=true");
      setItems(data || []);
      setFilteredItems(data || []);
      setSortedItems(data || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "5 MB maximum",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const token = getAuthToken();

      if (!token) {
        toast({
          title: "Erreur",
          description: "Session expirée",
          variant: "destructive",
        });
        return;
      }

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_URL}/promotions/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setFormData((p) => ({ ...p, image_url: data.file_url }));
      toast({ title: "Succès !", description: "Image uploadée" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const payload = {
      name: formData.name,
      description: formData.description || null,
      image_url: formData.image_url || null,
      points_cost: parseInt(formData.points_cost),
      stock_quantity: parseInt(formData.stock_quantity),
      category: formData.category || null,
      status: formData.status,
    };

    try {
      if (editingId) {
        await apiPatch(`/reward-items/${editingId}`, payload);
        toast({ title: "Succès !", description: "Article modifié" });
      } else {
        await apiPost("/reward-items", payload);
        toast({ title: "Succès !", description: "Article créé" });
      }
      await fetchItems();
      resetForm();
    } catch (error: any) {
      const message = error.message || "Erreur lors de la sauvegarde";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const handleEdit = (item: RewardItem) => {
    if (!canManage) return;
    setFormData({
      name: item.name,
      description: item.description || "",
      image_url: item.image_url || "",
      points_cost: item.points_cost.toString(),
      stock_quantity: item.stock_quantity.toString(),
      category: item.category || "",
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;

    try {
      await apiDelete(`/reward-items/${id}`);
      toast({ title: "Succès !", description: "Article supprimé" });
      await fetchItems();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
      points_cost: "",
      stock_quantity: "",
      category: "",
      status: "ACTIVE",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
          Épuisé
        </span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
          Stock faible ({stock})
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">
        {stock} en stock
      </span>
    );
  };

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Nom" },
    { key: "points_cost", label: "Coût (points)" },
    { key: "stock_quantity", label: "Stock" },
    { key: "category", label: "Catégorie" },
    { key: "status", label: "Statut" },
  ];

  const sortLabel = () => {
    if (!sortColumn || !sortDirection) return null;
    const colData = sortableCols.find((c) => c.key === sortColumn);
    if (!colData) return null;
    return `Trié par ${colData.label} (${sortDirection === "asc" ? "Croissant" : "Décroissant"})`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="CATALOGUE ARTICLES À ÉCHANGER" />
      <Navigation />

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Articles à Échanger</h2>
              <p className="text-sm text-gray-500">
                {items.length} article(s) • {items.filter((i) => i.stock_quantity > 0).length} en stock
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) resetForm();
              }}
              className="gap-2 text-white"
              style={{ backgroundColor: VITOGAZ_GREEN }}
            >
              <Plus className="w-4 h-4" />
              {showForm ? "Annuler" : "Nouvel Article"}
            </Button>
          )}
        </div>

        {!canManage && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                ℹ️ Vous pouvez consulter le catalogue. Seuls les administrateurs et gestionnaires promo peuvent créer/modifier des articles.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6" style={{ borderColor: "#b2dbd8", backgroundColor: "#f0faf9" }}>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700">
              💡 Ces articles sont proposés aux utilisateurs PWA qui souhaitent échanger leurs points de fidélité. Le stock est automatiquement décrémenté lors de la validation d'un échange.
            </p>
          </CardContent>
        </Card>

        {showForm && canManage && (
          <div ref={formRef}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId ? "Modifier l'Article" : "Nouvel Article"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Nom de l'article *</Label>
                      <Input
                        id="name"
                        required
                        maxLength={200}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: T-shirt Vitogaz"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description détaillée de l'article"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Image</Label>
                      <div className="mt-2">
                        {formData.image_url ? (
                          <div className="space-y-2">
                            <div className="relative w-full h-48 border-2 border-gray-200 rounded-lg overflow-hidden">
                              <img
                                src={formData.image_url}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, image_url: "" }))}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              className="flex-1"
                            />
                            {uploading && <span className="text-sm text-gray-500">Upload...</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="points_cost">Coût en points *</Label>
                      <Input
                        id="points_cost"
                        type="number"
                        min="1"
                        required
                        value={formData.points_cost}
                        onChange={(e) => setFormData({ ...formData, points_cost: e.target.value })}
                        placeholder="Ex: 500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="stock_quantity">Stock initial *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        required
                        value={formData.stock_quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, stock_quantity: e.target.value })
                        }
                        placeholder="Ex: 50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Catégorie</Label>
                      <select
                        id="category"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">— Sélectionner —</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="status">Statut *</Label>
                      <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="ACTIVE">Actif</option>
                        <option value="INACTIVE">Inactif</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="text-white"
                      style={{ backgroundColor: VITOGAZ_GREEN }}
                    >
                      {editingId ? "Mettre à jour" : "Créer"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un article..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

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
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8">
                    Aucun article trouvé
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name}
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: VITOGAZ_GREEN }}
                      >
                        {item.points_cost} pts
                      </span>
                    </TableCell>
                    <TableCell>{getStockBadge(item.stock_quantity)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.category || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.status === "ACTIVE" ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            <p className="text-sm text-gray-500">{sortedItems.length} article(s)</p>
          </div>
        </Card>
      </main>
    </div>
  );
}