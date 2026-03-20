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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Youtube,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";

type SortKey = "title" | "category" | "download_count" | "is_offline";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  video_url?: string | null;
  download_count: number;
  is_offline: boolean;
  is_active: boolean;
}

export default function DocumentsPage() {
  // ── Permissions RBAC ─────────────────────────────────────────────────────
  const { canWrite, canDelete } = useCurrentUser();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [sortedDocuments, setSortedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Tri
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "pamf",
    file_url: "",
    video_url: "",
    is_offline: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isVideoCategory = formData.category === "video";

  useEffect(() => { fetchDocuments(); }, []);

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

  // Tri appliqué après filtre
  useEffect(() => {
    if (!sortColumn || !sortDirection) {
      setSortedDocuments(filteredDocuments);
      return;
    }
    const col = sortColumn;
    const dir = sortDirection;
    const sorted = [...filteredDocuments].sort((a, b) => {
      if (col === "title") {
        const valA = a.title.toLowerCase();
        const valB = b.title.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      }
      if (col === "category") {
        const valA = a.category.toLowerCase();
        const valB = b.category.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      }
      if (col === "download_count") {
        return dir === "asc"
          ? (a.download_count || 0) - (b.download_count || 0)
          : (b.download_count || 0) - (a.download_count || 0);
      }
      if (col === "is_offline") {
        const valA = a.is_offline ? 1 : 0;
        const valB = b.is_offline ? 1 : 0;
        return dir === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });
    setSortedDocuments(sorted);
  }, [filteredDocuments, sortColumn, sortDirection]);

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
    if (sortColumn === "is_offline") return `Trié par Offline (${sortDirection === "desc" ? "Offline en premier" : "Online en premier"})`;
    if (sortColumn === "download_count") return `Trié par Téléchargements (${sortDirection === "desc" ? "Plus téléchargés" : "Moins téléchargés"})`;
    const labels: Record<SortKey, string> = { title: "Titre", category: "Catégorie", download_count: "Téléchargements", is_offline: "Offline" };
    return `Trié par ${labels[sortColumn]} (${sortDirection === "asc" ? "A → Z" : "Z → A"})`;
  };

  const fetchDocuments = async () => {
    try {
      const data = await apiGet<Document[]>('/documents');
      setDocuments(data || []);
      setFilteredDocuments(data || []);
      setSortedDocuments(data || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({ title: "Erreur", description: "Impossible de charger les documents", variant: "destructive" });
      setDocuments([]);
      setFilteredDocuments([]);
      setSortedDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Erreur", description: "Seuls les fichiers PDF sont acceptés", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setUploading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/upload`, {
          method: 'POST',
          body: formDataUpload,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de l\'upload');
        }
        const { file_url } = await response.json();
        setFormData(prev => ({ ...prev, file_url }));
        toast({ title: "Succès !", description: "Fichier uploadé avec succès" });
      } catch (error: any) {
        console.error("Erreur upload:", error);
        toast({ title: "Erreur", description: error.message || "Impossible d'uploader le fichier", variant: "destructive" });
        setSelectedFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVideoCategory && !formData.file_url && !editingId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier PDF", variant: "destructive" });
      return;
    }
    if (isVideoCategory && !formData.video_url) {
      toast({ title: "Erreur", description: "Veuillez saisir un lien YouTube", variant: "destructive" });
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      file_url: isVideoCategory ? "" : formData.file_url,
      video_url: isVideoCategory ? formData.video_url : null,
      is_offline: formData.is_offline,
      is_active: true,
    };

    try {
      if (editingId) {
        await apiPatch(`/documents/${editingId}`, payload);
        toast({ title: "Succès !", description: "Document modifié avec succès" });
      } else {
        await apiPost('/documents', payload);
        toast({ title: "Succès !", description: "Document créé avec succès" });
      }
      await fetchDocuments();
      resetForm();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const handleEdit = (doc: Document) => {
    setFormData({
      title: doc.title,
      description: doc.description || "",
      category: doc.category,
      file_url: doc.file_url,
      video_url: doc.video_url || "",
      is_offline: doc.is_offline,
    });
    setEditingId(doc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;
    try {
      await apiDelete(`/documents/${id}`);
      toast({ title: "Succès !", description: "Document supprimé" });
      await fetchDocuments();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "pamf", file_url: "", video_url: "", is_offline: false });
    setSelectedFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      pamf: "bg-purple-100 text-purple-700",
      security: "bg-red-100 text-red-700",
      guides: "bg-teal-100 text-teal-700",
      video: "bg-rose-100 text-rose-700",
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      pamf: "PAMF",
      security: "Sécurité",
      guides: "Guides",
      video: "Vidéo",
    };
    return labels[category] || category;
  };

  const handleView = (doc: Document) => {
    const url = doc.video_url || doc.file_url;
    if (url) window.open(url, "_blank");
  };

  // Colonnes triables
  const sortableCols: { key: SortKey; label: string }[] = [
    { key: "title", label: "Titre" },
    { key: "category", label: "Catégorie" },
    { key: "download_count", label: "Téléchargements" },
    { key: "is_offline", label: "Offline" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Gestion des Documents" />
      <Navigation />

      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Documents</h2>
              <p className="text-sm text-gray-500">{documents.length} document(s) au total</p>
            </div>
          </div>
          {/* Bouton Nouveau — ADMIN/SUPER_ADMIN uniquement */}
          {canDelete && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
              <Plus className="w-4 h-4" />
              {showForm ? "Annuler" : "Nouveau Document"}
            </Button>
          )}
        </div>

        {/* Form — ADMIN/SUPER_ADMIN uniquement */}
        {showForm && canDelete && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier le Document" : "Nouveau Document"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Guide PAMF 2025" />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie *</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value, file_url: "", video_url: "" })}
                    >
                      <option value="pamf">PAMF</option>
                      <option value="security">Sécurité</option>
                      <option value="guides">Guides</option>
                      <option value="video">Vidéo (YouTube)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description du document" />
                  </div>

                  {/* Champ dynamique : PDF ou URL YouTube selon la catégorie */}
                  <div className="md:col-span-2">
                    {isVideoCategory ? (
                      <>
                        <Label htmlFor="video_url">Lien YouTube *</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Youtube className="w-5 h-5 text-rose-600 flex-shrink-0" />
                          <Input
                            id="video_url"
                            type="url"
                            value={formData.video_url}
                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="file">Fichier PDF {!editingId && "*"}</Label>
                        <div className="mt-1">
                          <input
                            type="file"
                            id="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold"
                            style={{ '--file-bg': '#e6f4f3', '--file-color': VITOGAZ_GREEN } as React.CSSProperties}
                          />
                          {selectedFile && (
                            <p className="mt-2 text-sm text-emerald-600">
                              <Upload className="w-4 h-4 inline mr-1" />
                              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Offline — masqué pour les vidéos */}
                  {!isVideoCategory && (
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.is_offline} onChange={(e) => setFormData({ ...formData, is_offline: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm font-medium">Disponible hors-ligne</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={uploading} className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                    {uploading ? "Upload en cours..." : editingId ? "Mettre à jour" : "Créer"}
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
              <Input placeholder="Rechercher par titre, catégorie ou description..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : sortedDocuments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Aucun document trouvé</TableCell></TableRow>
              ) : (
                sortedDocuments.map((doc) => (
                  <TableRow key={doc.id} className={!doc.is_active ? "opacity-50" : ""}>
                    {/* Titre */}
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    {/* Catégorie */}
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(doc.category)}`}>
                        {doc.category === "video" && <Youtube className="w-3 h-3 inline mr-1" />}
                        {getCategoryLabel(doc.category)}
                      </span>
                    </TableCell>
                    {/* Téléchargements */}
                    <TableCell className="text-sm text-gray-700">
                      {doc.category === "video" ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <span>{doc.download_count || 0}</span>
                      )}
                    </TableCell>
                    {/* Offline */}
                    <TableCell>
                      {doc.category === "video" ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : doc.is_offline ? (
                        <span className="text-emerald-600 text-sm font-medium">✓</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    {/* Description */}
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {doc.description || "-"}
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Voir — toujours visible */}
                        <Button variant="outline" size="sm" onClick={() => handleView(doc)} title={doc.category === "video" ? "Voir la vidéo" : "Voir le PDF"}>
                          {doc.category === "video"
                            ? <Youtube className="w-4 h-4 text-rose-600" />
                            : <Eye className="w-4 h-4" />
                          }
                        </Button>
                        {/* Modifier — EDITOR et ADMIN+ */}
                        {canWrite && (
                          <Button variant="outline" size="sm" onClick={() => handleEdit(doc)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Supprimer — ADMIN/SUPER_ADMIN uniquement */}
                        {canDelete && (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pied de tableau */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">{sortLabel() || ""}</p>
            <p className="text-sm text-gray-500">{sortedDocuments.length} document(s)</p>
          </div>
        </Card>
      </main>
    </div>
  );
}