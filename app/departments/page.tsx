"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Plus, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRouter } from "next/navigation";

const VITOGAZ_GREEN = "#008B7F";

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const { isSuperAdmin, loading } = useCurrentUser();
  const formRef = useRef<HTMLDivElement>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) {
      router.push("/");
      return;
    }
    fetchDepartments();
  }, [isSuperAdmin, loading, router]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDepartments(departments);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredDepartments(
      departments.filter((d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      )
    );
  }, [searchQuery, departments]);

  const fetchDepartments = async () => {
    try {
      setDataLoading(true);
      const data = await apiGet<Department[]>("/departments");
      setDepartments(data || []);
      setFilteredDepartments(data || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les départements",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      if (editingId) {
        await apiPatch(`/departments/${editingId}`, formData);
        toast({ title: "Succès !", description: "Département modifié" });
      } else {
        await apiPost("/departments", formData);
        toast({ title: "Succès !", description: "Département créé" });
      }
      await fetchDepartments();
      resetForm();
    } catch (error: any) {
      const message = error.message || "Erreur lors de la sauvegarde";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const handleEdit = (department: Department) => {
    if (!isSuperAdmin) return;
    setFormData({
      name: department.name,
      description: department.description || "",
    });
    setEditingId(department.id);
    setIsFormVisible(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce département ?")) return;

    try {
      await apiDelete(`/departments/${id}`);
      toast({ title: "Succès !", description: "Département supprimé" });
      await fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
    setIsFormVisible(false);
  };

  const toggleForm = () => {
    const newState = !isFormVisible;
    setIsFormVisible(newState);
    if (!newState) {
      resetForm();
    } else {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" 
               style={{ borderTopColor: VITOGAZ_GREEN }} />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="GESTION DES DÉPARTEMENTS" />
      <Navigation />

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Départements</h2>
              <p className="text-sm text-gray-500">
                {departments.length} département(s) au total
              </p>
            </div>
          </div>
          <Button
            onClick={toggleForm}
            className="gap-2 text-white"
            style={{ backgroundColor: VITOGAZ_GREEN }}
          >
            <Plus className="w-4 h-4" />
            {isFormVisible ? "Annuler" : "Nouveau Département"}
          </Button>
        </div>

        <Card className="mb-6" style={{ borderColor: "#b2dbd8", backgroundColor: "#f0faf9" }}>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700">
              ℹ️ Les départements servent à organiser les utilisateurs par service ou équipe.
              Chaque utilisateur doit être rattaché à un département lors de sa création.
            </p>
          </CardContent>
        </Card>

        {isFormVisible && (
          <div ref={formRef}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {editingId ? "Modifier le Département" : "Nouveau Département"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom du département *</Label>
                      <Input
                        id="name"
                        required
                        maxLength={100}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Marketing, IT, Ventes..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (optionnel)</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Description courte du département"
                      />
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
                placeholder="Rechercher un département..."
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
                <TableHead>Description</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Aucun département trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {dept.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(dept.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dept)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(dept.id)}
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">
              Connecté à l'API — données en temps réel
            </p>
            <p className="text-sm text-gray-500">
              {filteredDepartments.length} département(s)
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}