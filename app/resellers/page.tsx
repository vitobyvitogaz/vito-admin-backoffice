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
  Package,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";

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
}

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

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [filteredResellers, setFilteredResellers] = useState<Reseller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [resellerProducts, setResellerProducts] = useState<Record<string, ResellerProduct[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
    type: "Station Service",
    phone: "",
    whatsapp: "",
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
  }, [searchQuery, resellers]);

  const fetchResellers = async () => {
    try {
      const data = await apiGet<Reseller[]>('/resellers');
      setResellers(data);
      setFilteredResellers(data);
      
      // Charger les produits de chaque revendeur
      await fetchAllResellerProducts(data);
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

  const fetchAllResellerProducts = async (resellers: Reseller[]) => {
    // Charger tous les produits en parallèle
    const promises = resellers.map(async (reseller) => {
      try {
        const data = await apiGet<ResellerProduct[]>(`/resellers/${reseller.id}/products`);
        return { id: reseller.id, products: data };
      } catch (error) {
        console.error(`Erreur chargement produits pour ${reseller.name}:`, error);
        return { id: reseller.id, products: [] };
      }
    });

    const results = await Promise.all(promises);
    
    const productsMap: Record<string, ResellerProduct[]> = {};
    results.forEach(result => {
      productsMap[result.id] = result.products;
    });
    
    setResellerProducts(productsMap);
  };

  const fetchProducts = async () => {
    try {
      const data = await apiGet<Product[]>('/products');
      setProducts(data.filter(p => p.is_active));
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
      const productIds = data.map(item => item.product_id);
      setSelectedProducts(productIds);
    } catch (error) {
      console.error("Erreur chargement produits du revendeur:", error);
    }
  };

  const getCategoryBadges = (resellerId: string) => {
    const products = resellerProducts[resellerId] || [];
    if (products.length === 0) return null;

    // Grouper par catégorie
    const categoryGroups: Record<string, number> = {};
    products.forEach(item => {
      const category = item.products.category;
      categoryGroups[category] = (categoryGroups[category] || 0) + 1;
    });

    // Couleurs par catégorie
    const categoryColors: Record<string, string> = {
      'Bouteilles': 'bg-blue-100 text-blue-700',
      'Accessoires': 'bg-green-100 text-green-700',
      'Kit': 'bg-purple-100 text-purple-700',
      'Gaz au détail': 'bg-orange-100 text-orange-700',
    };

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(categoryGroups).map(([category, count]) => (
          <span
            key={category}
            className={`px-2 py-1 text-xs rounded-full ${
              categoryColors[category] || 'bg-gray-100 text-gray-700'
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
      is_active: true,
      is_verified: true,
    };

    try {
      let resellerId = editingId;
      
      if (editingId) {
        await apiPatch(`/resellers/${editingId}`, payload);
        toast({
          title: "Succès !",
          description: "Revendeur modifié avec succès",
        });
      } else {
        const newReseller = await apiPost<Reseller>('/resellers', payload);
        resellerId = newReseller.id;
        toast({
          title: "Succès !",
          description: "Revendeur créé avec succès",
        });
      }

      // Sauvegarder les produits
      if (resellerId) {
        await apiPost(`/resellers/${resellerId}/products`, {
          productIds: selectedProducts
        });
      }
      
      await fetchResellers();
      resetForm();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
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
    });
    setEditingId(reseller.id);
    setShowForm(true);
    
    // Charger les produits du revendeur
    await fetchResellerProducts(reseller.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce revendeur ?")) return;

    try {
      await apiDelete(`/resellers/${id}`);
      toast({
        title: "Succès !",
        description: "Revendeur supprimé",
      });
      await fetchResellers();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      latitude: "",
      longitude: "",
      type: "Station Service",
      phone: "",
      whatsapp: "",
    });
    setEditingId(null);
    setShowForm(false);
    setSelectedProducts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VIto Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion des Revendeurs
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">← Retour Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex gap-6">
            <Link
              href="/"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/revendeurs"
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Revendeurs
            </Link>
            <Link
              href="/delivery-companies"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Livraisons
            </Link>
            <Link
              href="/documents"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Documents
            </Link>
            <Link
              href="/promotions"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Promotions
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Revendeurs</h2>
              <p className="text-sm text-gray-500">
                {resellers.length} revendeur(s) au total
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouveau Revendeur"}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier le Revendeur" : "Nouveau Revendeur"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations de base */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informations de base</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Ville *</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Adresse *</Label>
                      <Input
                        id="address"
                        required
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="latitude">Latitude *</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({ ...formData, latitude: e.target.value })
                        }
                        placeholder="-18.8792"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude *</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            longitude: e.target.value,
                          })
                        }
                        placeholder="47.5079"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                      >
                        <option value="Station Service">Station Service</option>
                        <option value="Épicerie">Épicerie</option>
                        <option value="Quincaillerie">Quincaillerie</option>
                        <option value="Libre service">Libre service</option>
                        <option value="Autres">Autres</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+261 32 00 00 001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) =>
                          setFormData({ ...formData, whatsapp: e.target.value })
                        }
                        placeholder="+261 32 00 00 001"
                      />
                    </div>
                  </div>
                </div>

                {/* Produits vendus */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Produits vendus</h3>
                    <span className="text-sm text-gray-500">
                      ({selectedProducts.length} sélectionné{selectedProducts.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedProducts.includes(product.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {product.category}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => {}}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit">
                    {editingId ? "Mettre à jour" : "Créer"}
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
                <TableHead>Nom</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredResellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Aucun revendeur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredResellers.map((reseller) => (
                  <TableRow key={reseller.id}>
                    <TableCell className="font-medium">
                      {reseller.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {reseller.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {reseller.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadges(reseller.id) || (
                        <span className="text-xs text-gray-400">Aucun produit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {reseller.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/revendeurs/${reseller.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Horaires et produits"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(reseller)}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(reseller.id)}
                          title="Supprimer"
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
        </Card>
      </main>
    </div>
  );
}