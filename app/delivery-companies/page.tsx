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
  Truck,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { ZoneSelector } from "@/components/ZoneSelector";

interface DeliveryCompany {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  service_areas: string[];
  is_verified: boolean;
  is_active: boolean;
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
    phone: "",
    whatsapp: "",
    email: "",
    service_areas: [] as string[],
    is_verified: false,
  });

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
          c.service_areas.some(area => area.toLowerCase().includes(query))
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      const data = await apiGet<DeliveryCompany[]>('/delivery-companies');
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
      phone: formData.phone,
      whatsapp: formData.whatsapp || null,
      email: formData.email || null,
      service_areas: formData.service_areas,
      is_verified: formData.is_verified,
      is_active: true,
      features: [],
      specialties: [],
    };

    try {
      if (editingId) {
        await apiPatch(`/delivery-companies/${editingId}`, payload);
        toast({
          title: "Succès !",
          description: "Société modifiée avec succès",
        });
      } else {
        await apiPost('/delivery-companies', payload);
        toast({
          title: "Succès !",
          description: "Société créée avec succès",
        });
      }

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
      phone: company.phone,
      whatsapp: company.whatsapp || "",
      email: company.email || "",
      service_areas: company.service_areas || [],
      is_verified: company.is_verified,
    });
    setEditingId(company.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette société ?")) return;

    try {
      await apiDelete(`/delivery-companies/${id}`);
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

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      service_areas: [],
      is_verified: false,
    });
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
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+261 32 00 000 00"
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
                      placeholder="+261 32 00 000 00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="contact@entreprise.mg"
                    />
                  </div>
                  
                  {/* ZoneSelector Component */}
                  <div className="md:col-span-2">
                    <ZoneSelector
                      selectedZones={formData.service_areas}
                      onChange={(zones) =>
                        setFormData({ ...formData, service_areas: zones })
                      }
                      label="Zones de service"
                      required
                      placeholder="Sélectionner les zones desservies..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_verified}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_verified: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">
                        Société vérifiée
                      </span>
                    </label>
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
                <TableHead>Zones de service</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Aucune société trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {company.phone}
                        </div>
                        {company.whatsapp && (
                          <div className="text-green-600">
                            WhatsApp: {company.whatsapp}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {company.service_areas && company.service_areas.length > 0 ? (
                          company.service_areas.map((area, idx) => (
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
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.is_verified ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Vérifiée
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          Non vérifiée
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(company)}
                        >
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