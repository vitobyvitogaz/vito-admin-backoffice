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
  Truck,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";

// API URL depuis env
const API_URL = 'https://vito-backend-supabase.onrender.com/api/v1';

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
  is_active: boolean;
  display_order: number;
}

export default function DeliveryCompaniesPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<DeliveryCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    description: "",
    phone: "",
    whatsapp: "",
    messenger: "",
    email: "",
    website: "",
    service_areas: [] as string[],
    delivery_time: "",
    min_order_amount: "",
    delivery_fee: "",
    working_hours: "",
    features: [] as string[],
    specialties: [] as string[],
    is_verified: false,
    is_active: true,
    display_order: 0,
  });

  // États pour les inputs de tags
  const [featureInput, setFeatureInput] = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = companies.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.service_areas.some((area) => area.toLowerCase().includes(query))
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/delivery-companies`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      
      const data = await response.json();
      setCompanies(data || []);
      setFilteredCompanies(data || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sociétés de livraison",
        variant: "destructive",
      });
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.service_areas.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une zone de service",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formData.name,
      logo_url: formData.logo_url || null,
      description: formData.description || null,
      phone: formData.phone,
      whatsapp: formData.whatsapp || null,
      messenger: formData.messenger || null,
      email: formData.email || null,
      website: formData.website || null,
      service_areas: formData.service_areas,
      delivery_time: formData.delivery_time || null,
      min_order_amount: formData.min_order_amount || null,
      delivery_fee: formData.delivery_fee || null,
      working_hours: formData.working_hours || null,
      features: formData.features,
      specialties: formData.specialties,
      is_verified: formData.is_verified,
      is_active: formData.is_active,
      display_order: Number(formData.display_order) || 0,
    };

    try {
      const url = editingId
        ? `${API_URL}/delivery-companies/${editingId}`
        : `${API_URL}/delivery-companies`;
      
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      toast({
        title: "Succès !",
        description: editingId ? "Société modifiée avec succès" : "Société créée avec succès",
      });

      await fetchCompanies();
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

  const handleEdit = (company: DeliveryCompany) => {
    setFormData({
      name: company.name,
      logo_url: company.logo_url || "",
      description: company.description || "",
      phone: company.phone,
      whatsapp: company.whatsapp || "",
      messenger: company.messenger || "",
      email: company.email || "",
      website: company.website || "",
      service_areas: company.service_areas || [],
      delivery_time: company.delivery_time || "",
      min_order_amount: company.min_order_amount || "",
      delivery_fee: company.delivery_fee || "",
      working_hours: company.working_hours || "",
      features: company.features || [],
      specialties: company.specialties || [],
      is_verified: company.is_verified,
      is_active: company.is_active,
      display_order: company.display_order,
    });
    setEditingId(company.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette société ?")) return;

    try {
      const response = await fetch(`${API_URL}/delivery-companies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast({
        title: "Succès !",
        description: "Société supprimée",
      });
      await fetchCompanies();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter((f) => f !== feature),
    });
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialtyInput.trim()],
      });
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((s) => s !== specialty),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      description: "",
      phone: "",
      whatsapp: "",
      messenger: "",
      email: "",
      website: "",
      service_areas: [],
      delivery_time: "",
      min_order_amount: "",
      delivery_fee: "",
      working_hours: "",
      features: [],
      specialties: [],
      is_verified: false,
      is_active: true,
      display_order: 0,
    });
    setFeatureInput("");
    setSpecialtyInput("");
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VIto Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion des Sociétés de Livraison
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
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
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

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold">Sociétés de Livraison</h2>
              <p className="text-sm text-gray-500">
                {companies.length} société(s) au total
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouvelle Société"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier la Société" : "Nouvelle Société"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: INFORMATIONS GÉNÉRALES */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom de la société *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Livraison Express"
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo_url">URL du Logo</Label>
                      <Input
                        id="logo_url"
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Décrivez les services de la société..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CONTACT */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+261 32 00 000 00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder="+261 32 00 000 00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="messenger">Messenger</Label>
                      <Input
                        id="messenger"
                        value={formData.messenger}
                        onChange={(e) => setFormData({ ...formData, messenger: e.target.value })}
                        placeholder="Nom sur Messenger"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@entreprise.mg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="website">Site Web</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.entreprise.mg"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: SERVICE */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Détails du service</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery_time">Délai de livraison</Label>
                      <Input
                        id="delivery_time"
                        value={formData.delivery_time}
                        onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                        placeholder="Ex: 24-48h"
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_order_amount">Montant minimum</Label>
                      <Input
                        id="min_order_amount"
                        value={formData.min_order_amount}
                        onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                        placeholder="Ex: 50 000 Ar"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_fee">Frais de livraison</Label>
                      <Input
                        id="delivery_fee"
                        value={formData.delivery_fee}
                        onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                        placeholder="Ex: 5 000 Ar"
                      />
                    </div>
                    <div>
                      <Label htmlFor="working_hours">Horaires</Label>
                      <Input
                        id="working_hours"
                        value={formData.working_hours}
                        onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                        placeholder="Ex: Lun-Sam 8h-18h"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: ZONES DE SERVICE */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Zones de service *</h3>
                  <ZoneSelector
                    selectedZones={formData.service_areas}
                    onChange={(zones) => setFormData({ ...formData, service_areas: zones })}
                    label=""
                    required
                    placeholder="Sélectionner les zones desservies..."
                  />
                </div>

                {/* SECTION 5: CARACTÉRISTIQUES */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Caractéristiques</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Features */}
                    <div>
                      <Label htmlFor="features">Fonctionnalités</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          id="features"
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                          placeholder="Ex: Paiement mobile"
                        />
                        <Button type="button" onClick={addFeature} size="sm">
                          +
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {feature}
                            <button
                              type="button"
                              onClick={() => removeFeature(feature)}
                              className="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <Label htmlFor="specialties">Spécialités</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          id="specialties"
                          value={specialtyInput}
                          onChange={(e) => setSpecialtyInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                          placeholder="Ex: Livraison express"
                        />
                        <Button type="button" onClick={addSpecialty} size="sm">
                          +
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.specialties.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {specialty}
                            <button
                              type="button"
                              onClick={() => removeSpecialty(specialty)}
                              className="hover:text-green-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: PARAMÈTRES */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="display_order">Ordre d'affichage</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_verified}
                          onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Société vérifiée</span>
                      </label>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="submit">{editingId ? "Mettre à jour" : "Créer"}</Button>
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
                placeholder="Rechercher par nom ou zone..."
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
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Note</TableHead>
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
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Aucune société trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{company.name}</span>
                        {company.description && (
                          <span className="text-xs text-gray-500 line-clamp-1">
                            {company.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {company.phone}
                        </div>
                        {company.whatsapp && (
                          <div className="text-green-600 text-xs">WA: {company.whatsapp}</div>
                        )}
                        {company.email && (
                          <div className="text-gray-500 text-xs">{company.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {company.service_areas && company.service_areas.length > 0 ? (
                          company.service_areas.slice(0, 2).map((area, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700"
                            >
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                        {company.service_areas.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{company.service_areas.length - 2}
                          </span>
                        )}
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
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Vérifiée
                          </span>
                        )}
                        {company.is_active ? (
                          <span className="text-green-600 text-xs">● Active</span>
                        ) : (
                          <span className="text-gray-400 text-xs">● Inactive</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.review_count > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{company.rating.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs">({company.review_count})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
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