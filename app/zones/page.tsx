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
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";

interface Zone {
  id: string;
  name: string;
  province: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    province: "",
    code: "",
    is_active: true,
  });

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredZones(zones);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = zones.filter(
        (z) =>
          z.name.toLowerCase().includes(query) ||
          z.province.toLowerCase().includes(query) ||
          z.code.toLowerCase().includes(query)
      );
      setFilteredZones(filtered);
    }
  }, [searchQuery, zones]);

  const fetchZones = async () => {
    try {
      const data = await apiGet<Zone[]>('/zones');
      // Inclure aussi les zones inactives pour l'admin
      const allZones = data || [];
      setZones(allZones);
      setFilteredZones(allZones);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les zones",
        variant: "destructive",
      });
      setZones([]);
      setFilteredZones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      province: formData.province,
      code: formData.code.toUpperCase(),
      is_active: formData.is_active,
    };

    try {
      if (editingId) {
        await apiPatch(`/zones/${editingId}`, payload);
        toast({
          title: "Succès !",
          description: "Zone modifiée avec succès",
        });
      } else {
        await apiPost('/zones', payload);
        toast({
          title: "Succès !",
          description: "Zone créée avec succès",
        });
      }

      await fetchZones();
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

  const handleEdit = (zone: Zone) => {
    setFormData({
      name: zone.name,
      province: zone.province,
      code: zone.code,
      is_active: zone.is_active,
    });
    setEditingId(zone.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette zone ?")) return;

    try {
      await apiDelete(`/zones/${id}`);
      toast({
        title: "Succès !",
        description: "Zone supprimée",
      });
      await fetchZones();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (zone: Zone) => {
    try {
      await apiPatch(`/zones/${zone.id}`, {
        is_active: !zone.is_active,
      });
      toast({
        title: "Succès !",
        description: `Zone ${!zone.is_active ? 'activée' : 'désactivée'}`,
      });
      await fetchZones();
    } catch (error) {
      console.error("Erreur toggle:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      province: "",
      code: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Grouper par province
  const groupedZones = filteredZones.reduce((acc, zone) => {
    if (!acc[zone.province]) {
      acc[zone.province] = [];
    }
    acc[zone.province].push(zone);
    return acc;
  }, {} as Record<string, Zone[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VIto Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion des Zones / Villes
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
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Promotions
            </Link>
            <Link
              href="/zones"
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Zones
            </Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Zones / Villes</h2>
              <p className="text-sm text-gray-500">
                {zones.length} zone(s) au total •{" "}
                {zones.filter(z => z.is_active).length} active(s)
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouvelle Zone"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier la Zone" : "Nouvelle Zone"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la ville *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Antananarivo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province *</Label>
                    <Input
                      id="province"
                      required
                      value={formData.province}
                      onChange={(e) =>
                        setFormData({ ...formData, province: e.target.value })
                      }
                      placeholder="Ex: Antananarivo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code (3 lettres) *</Label>
                    <Input
                      id="code"
                      required
                      maxLength={10}
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ex: TNR"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">Zone active</span>
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
                placeholder="Rechercher par nom, province ou code..."
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
                <TableHead>Province</TableHead>
                <TableHead>Code</TableHead>
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
              ) : filteredZones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Aucune zone trouvée
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {Object.entries(groupedZones).map(([province, provinceZones]) => (
                    <>
                      <TableRow key={`header-${province}`} className="bg-gray-50">
                        <TableCell colSpan={5} className="font-semibold text-gray-700">
                          {province}
                        </TableCell>
                      </TableRow>
                      {provinceZones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-500" />
                              {zone.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {zone.province}
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {zone.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => toggleActive(zone)}
                              className="flex items-center gap-1"
                            >
                              {zone.is_active ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-400 text-sm">
                                  <XCircle className="w-4 h-4" />
                                  Inactive
                                </span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(zone)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(zone.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}