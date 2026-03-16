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
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Image as ImageIcon,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { uploadProductImage } from "@/lib/supabase";
import { exportToCSV } from "@/lib/export-csv";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";

const PAGE_SIZE = 50;

interface Product {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  order_position: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    product_code: "",
    name: "",
    description: "",
    category: "",
    price: "",
    image_url: "",
    is_featured: false,
    is_active: true,
    order_position: "0",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.product_code.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query))
      );
      setFilteredProducts(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, products]);

  // Données de la page courante
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const fetchProducts = async () => {
    try {
      const data = await apiGet<Product[]>('/products');
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle is_active directement dans le tableau
  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    try {
      await apiPatch(`/products/${product.id}`, { is_active: !product.is_active });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: !p.is_active } : p
        )
      );
      toast({
        title: "Succès !",
        description: `Produit ${!product.is_active ? "activé" : "désactivé"}`,
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

  // Export CSV
  const handleExportCSV = () => {
    exportToCSV(
      filteredProducts,
      "produits",
      {
        product_code: "Code",
        name: "Nom",
        category: "Catégorie",
        price: "Prix (Ar)",
        description: "Description",
        is_featured: "Vedette",
        is_active: "Actif",
        order_position: "Position",
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const payload = {
        product_code: formData.product_code,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        price: formData.price ? parseFloat(formData.price) : null,
        image_url: imageUrl || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
        order_position: parseInt(formData.order_position),
      };

      if (editingId) {
        await apiPatch(`/products/${editingId}`, payload);
        toast({ title: "Succès !", description: "Produit modifié avec succès" });
      } else {
        await apiPost('/products', payload);
        toast({ title: "Succès !", description: "Produit créé avec succès" });
      }

      await fetchProducts();
      resetForm();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      product_code: product.product_code,
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      price: product.price?.toString() || "",
      image_url: product.image_url || "",
      is_featured: product.is_featured,
      is_active: product.is_active,
      order_position: product.order_position.toString(),
    });
    setImagePreview(product.image_url || "");
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;

    try {
      await apiDelete(`/products/${id}`);
      toast({ title: "Succès !", description: "Produit supprimé" });
      await fetchProducts();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: "",
      name: "",
      description: "",
      category: "",
      price: "",
      image_url: "",
      is_featured: false,
      is_active: true,
      order_position: "0",
    });
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Gestion des Produits" />
      <Navigation />

      {/* Main Content */}
      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Produits</h2>
              <p className="text-sm text-gray-500">
                {products.length} produit(s) au total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="w-4 h-4" />
              {showForm ? "Annuler" : "Nouveau Produit"}
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier le Produit" : "Nouveau Produit"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_code">Code Produit *</Label>
                    <Input
                      id="product_code"
                      required
                      value={formData.product_code}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      placeholder="B13"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Bouteille 13kg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du produit..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Bouteilles"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prix (Ar)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="50000"
                    />
                  </div>

                  {/* Upload Image */}
                  <div className="md:col-span-2">
                    <Label htmlFor="image">Image du produit</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <label
                        htmlFor="image"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Choisir une image</span>
                      </label>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded border"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="order_position">Position d'affichage</Label>
                    <Input
                      id="order_position"
                      type="number"
                      value={formData.order_position}
                      onChange={(e) => setFormData({ ...formData, order_position: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Produit mis en avant</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Produit actif</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Upload en cours..." : editingId ? "Mettre à jour" : "Créer"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
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
                placeholder="Rechercher par nom, code ou catégorie..."
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
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Vedette</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className={!product.is_active ? "opacity-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {product.product_code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-300" />
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {product.price ? (
                        `${product.price.toLocaleString()} Ar`
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.is_featured ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                          ⭐ Vedette
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    {/* Toggle is_active */}
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(product)}
                        disabled={togglingId === product.id}
                        title={product.is_active ? "Désactiver" : "Activer"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          product.is_active ? "bg-green-500" : "bg-gray-300"
                        } ${togglingId === product.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            product.is_active ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {currentPage} sur {totalPages} —{" "}
                {filteredProducts.length} produit(s)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}