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
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Percent,
  MapPin,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";

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
  zones: string[];
  applicable_products: string[];
  usage_count: number;
  is_active: boolean;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    discount_value: "",
    discount_type: "PERCENTAGE",
    promo_code: "",
    valid_from: "",
    valid_until: "",
    zones: [] as string[],
    applicable_products: ["Bouteille 12.5kg", "Bouteille 6kg"],
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

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

  const fetchPromotions = async () => {
    try {
      const data = await apiGet<Promotion[]>('/promotions');
      setPromotions(data || []);
      setFilteredPromotions(data || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les promotions",
        variant: "destructive",
      });
      setPromotions([]);
      setFilteredPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.zones.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une zone",
        variant: "destructive",
      });
      return;
    }

    // Convertir les dates en format ISO
    const validFromISO = formData.valid_from ? new Date(formData.valid_from + 'T00:00:00Z').toISOString() : undefined;
    const validUntilISO = new Date(formData.valid_until + 'T23:59:59Z').toISOString();

    const payload = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      description: formData.description || "Promotion spéciale",
      discount_value: parseFloat(formData.discount_value),
      discount_type: formData.discount_type,
      promo_code: formData.promo_code || null,
      valid_from: validFromISO,
      valid_until: validUntilISO,
      zones: formData.zones,
      applicable_products: formData.applicable_products,
      is_active: true,
      is_featured: false,
    };

    try {
      if (editingId) {
        await apiPatch(`/promotions/${editingId}`, payload);
        toast({
          title: "Succès !",
          description: "Promotion modifiée avec succès",
        });
      } else {
        await apiPost('/promotions', payload);
        toast({
          title: "Succès !",
          description: "Promotion créée avec succès",
        });
      }

      await fetchPromotions();
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

  const handleEdit = (promo: Promotion) => {
    setFormData({
      title: promo.title,
      subtitle: promo.subtitle || "",
      description: promo.description || "",
      discount_value: promo.discount_value.toString(),
      discount_type: promo.discount_type,
      promo_code: promo.promo_code || "",
      valid_from: promo.valid_from.split("T")[0],
      valid_until: promo.valid_until.split("T")[0],
      zones: promo.zones || [],
      applicable_products: promo.applicable_products || ["Bouteille 12.5kg"],
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette promotion ?"))
      return;

    try {
      await apiDelete(`/promotions/${id}`);
      toast({
        title: "Succès !",
        description: "Promotion supprimée",
      });
      await fetchPromotions();
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
      title: "",
      subtitle: "",
      description: "",
      discount_value: "",
      discount_type: "PERCENTAGE",
      promo_code: "",
      valid_from: "",
      valid_until: "",
      zones: [],
      applicable_products: ["Bouteille 12.5kg", "Bouteille 6kg"],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const isActive = (promo: Promotion) => {
    try {
      const now = new Date();
      const start = new Date(promo.valid_from);
      const end = new Date(promo.valid_until);
      return promo.is_active && now >= start && now <= end;
    } catch {
      return false;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("fr-FR");
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VIto Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion des Promotions
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">← Retour Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

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
              href="/resellers"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
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
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Promotions
            </Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8 text-orange-600" />
            <div>
              <h2 className="text-2xl font-bold">Promotions</h2>
              <p className="text-sm text-gray-500">
                {promotions.length} promotion(s) au total •{" "}
                {promotions.filter(isActive).length} active(s)
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouvelle Promotion"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier la Promotion" : "Nouvelle Promotion"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Ex: Fety Masaka 2025"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="subtitle">Sous-titre</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) =>
                        setFormData({ ...formData, subtitle: e.target.value })
                      }
                      placeholder="Ex: Promotion de fin d'année"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Détails de la promotion"
                    />
                  </div>

                  <div>
                    <Label htmlFor="discount_type">Type de réduction *</Label>
                    <select
                      id="discount_type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_type: e.target.value })
                      }
                    >
                      <option value="PERCENTAGE">Pourcentage (%)</option>
                      <option value="FIXED_AMOUNT">Montant fixe (Ar)</option>
                      <option value="FREE_DELIVERY">Livraison gratuite</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="discount_value">
                      Valeur de réduction *
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      max={formData.discount_type === "PERCENTAGE" ? "100" : undefined}
                      step="0.01"
                      required
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: e.target.value,
                        })
                      }
                      placeholder={formData.discount_type === "PERCENTAGE" ? "Ex: 30" : "Ex: 5000"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="promo_code">Code Promo</Label>
                    <Input
                      id="promo_code"
                      placeholder="Ex: FETY2025"
                      value={formData.promo_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          promo_code: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="valid_from">Date de début</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valid_from: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="valid_until">Date de fin *</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      required
                      value={formData.valid_until}
                      onChange={(e) =>
                        setFormData({ ...formData, valid_until: e.target.value })
                      }
                    />
                  </div>

                  {/* ZoneSelector Component */}
                  <div className="md:col-span-2">
                    <ZoneSelector
                      selectedZones={formData.zones}
                      onChange={(zones) =>
                        setFormData({ ...formData, zones })
                      }
                      label="Zones concernées"
                      required
                      placeholder="Sélectionner les zones..."
                    />
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

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, code ou zone..."
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
                <TableHead>Titre</TableHead>
                <TableHead>Réduction</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead>Utilisations</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredPromotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Aucune promotion trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredPromotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">
                      {promo.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <Percent className="w-4 h-4" />
                        {promo.discount_type === "PERCENTAGE" 
                          ? `${promo.discount_value}%`
                          : `${promo.discount_value} Ar`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {promo.promo_code ? (
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {promo.promo_code}
                        </code>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {formatDate(promo.valid_from)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        → {formatDate(promo.valid_until)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {promo.zones && promo.zones.length > 0 ? (
                          promo.zones.slice(0, 2).map((zone, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700"
                            >
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {zone}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Toutes zones
                          </span>
                        )}
                        {promo.zones && promo.zones.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{promo.zones.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        {promo.usage_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isActive(promo) ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
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