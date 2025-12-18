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
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Upload,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  download_count: number;
  is_offline: boolean;
  is_active: boolean;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "pamf",  // ✅ minuscule
    file_url: "",
    is_offline: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDocuments(documents);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = documents.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.category.toLowerCase().includes(query) ||
          (d.description && d.description.toLowerCase().includes(query))
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  const fetchDocuments = async () => {
    try {
      const data = await apiGet<Document[]>('/documents');
      setDocuments(data || []);
      setFilteredDocuments(data || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  /*const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Erreur",
          description: "Seuls les fichiers PDF sont acceptés",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      
      const fakeUrl = `https://lqkqasuotgrlqwokquhy.supabase.co/storage/v1/object/public/documents/${file.name}`;
      setFormData({ ...formData, file_url: fakeUrl });
    }
  };*/

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Erreur",
          description: "Seuls les fichiers PDF sont acceptés",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setUploading(true);

      try {
        // Créer FormData pour l'upload
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        // Upload vers le backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/upload`, {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de l\'upload');
        }

        const { file_url, file_size } = await response.json();
        
        setFormData({ ...formData, file_url });
        
        toast({
          title: "Succès !",
          description: "Fichier uploadé avec succès",
        });
      } catch (error: any) {
        console.error("Erreur upload:", error);
        toast({
          title: "Erreur",
          description: error.message || "Impossible d'uploader le fichier",
          variant: "destructive",
        });
        setSelectedFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file_url && !editingId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,  // ✅ déjà en minuscules
      file_url: formData.file_url,
      is_offline: formData.is_offline,
      is_active: true,
    };

    try {
      if (editingId) {
        await apiPatch(`/documents/${editingId}`, payload);
        toast({
          title: "Succès !",
          description: "Document modifié avec succès",
        });
      } else {
        await apiPost('/documents', payload);
        toast({
          title: "Succès !",
          description: "Document créé avec succès",
        });
      }

      await fetchDocuments();
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

  const handleEdit = (doc: Document) => {
    setFormData({
      title: doc.title,
      description: doc.description || "",
      category: doc.category,
      file_url: doc.file_url,
      is_offline: doc.is_offline,
    });
    setEditingId(doc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      await apiDelete(`/documents/${id}`);
      toast({
        title: "Succès !",
        description: "Document supprimé",
      });
      await fetchDocuments();
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
      description: "",
      category: "pamf",  // ✅ minuscule
      file_url: "",
      is_offline: false,
    });
    setSelectedFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      pamf: "bg-purple-100 text-purple-700",
      security: "bg-red-100 text-red-700",
      guides: "bg-blue-100 text-blue-700",
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      pamf: "PAMF",
      security: "Sécurité",
      guides: "Guides",
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VIto Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion des Documents
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
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
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
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold">Documents</h2>
              <p className="text-sm text-gray-500">
                {documents.length} document(s) au total
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouveau Document"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier le Document" : "Nouveau Document"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Ex: Guide PAMF 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie *</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      <option value="pamf">PAMF</option>
                      <option value="security">Sécurité</option>
                      <option value="guides">Guides</option>
                    </select>
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
                      placeholder="Description du document"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="file">
                      Fichier PDF {!editingId && "*"}
                    </Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        id="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {selectedFile && (
                        <p className="mt-2 text-sm text-green-600">
                          <Upload className="w-4 h-4 inline mr-1" />
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_offline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_offline: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">
                        Disponible hors-ligne
                      </span>
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

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, catégorie ou description..."
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
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Téléchargements</TableHead>
                <TableHead>Offline</TableHead>
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
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Aucun document trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(
                          doc.category
                        )}`}
                      >
                        {getCategoryLabel(doc.category)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {doc.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Download className="w-4 h-4 text-gray-400" />
                        {doc.download_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.is_offline ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.file_url, "_blank")}
                          title="Voir le PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
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