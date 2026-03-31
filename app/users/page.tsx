"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Plus, Pencil, Trash2, Search, Shield, ShieldCheck,
  User, Eye, KeyRound, RefreshCw, Lock, Star,
} from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "@/lib/use-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vito-backend-supabase.onrender.com/api/v1';

interface AppUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { isSuperAdmin, canManageUsers } = useCurrentUser();

  const [users, setUsers]                   = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers]   = useState<AppUser[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState("");
  const [showForm, setShowForm]             = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [resettingId, setResettingId]       = useState<string | null>(null);
  const [showResetForm, setShowResetForm]   = useState<string | null>(null);
  const [newPassword, setNewPassword]       = useState("");

  const [formData, setFormData] = useState({
    email: "", first_name: "", last_name: "", role: "VIEWER", password: "",
  });

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") { setFilteredUsers(users); return; }
    const query = searchQuery.toLowerCase();
    setFilteredUsers(users.filter(u =>
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query) ||
      (u.first_name && u.first_name.toLowerCase().includes(query)) ||
      (u.last_name && u.last_name.toLowerCase().includes(query))
    ));
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<AppUser[]>('/users');
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les utilisateurs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;
    try {
      if (editingId) {
        await apiPatch(`/users/${editingId}`, {
          first_name: formData.first_name || null,
          last_name:  formData.last_name  || null,
          role:       formData.role,
        });
        toast({ title: "Succès !", description: "Utilisateur modifié" });
      } else {
        await apiPost('/users', {
          email:      formData.email,
          password:   formData.password,
          first_name: formData.first_name || null,
          last_name:  formData.last_name  || null,
          role:       formData.role,
        });
        toast({ title: "Succès !", description: "Utilisateur créé" });
      }
      await fetchUsers();
      resetForm();
    } catch (error: any) {
      const message = (error.message || "").toLowerCase();
      const friendlyMessage =
        message.includes("already") || message.includes("existe") || message.includes("duplicate")
          ? "Un compte avec cet email existe déjà."
          : message.includes("password")
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : "Erreur lors de la sauvegarde. Veuillez réessayer.";
      toast({ title: "Erreur", description: friendlyMessage, variant: "destructive" });
    }
  };

  const handleEdit = (user: AppUser) => {
    if (!canManageUsers) return;
    setFormData({ email: user.email, first_name: user.first_name || "", last_name: user.last_name || "", role: user.role, password: "" });
    setEditingId(user.id);
    setShowForm(true);
    setShowResetForm(null);
  };

  const handleDelete = async (id: string) => {
    if (!canManageUsers) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      await apiDelete(`/users/${id}`);
      toast({ title: "Succès !", description: "Utilisateur supprimé" });
      await fetchUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!canManageUsers) return;
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Erreur", description: "Minimum 8 caractères", variant: "destructive" });
      return;
    }
    setResettingId(id);
    try {
      await fetch(`${API_URL}/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('vito_auth_token')}` },
        body: JSON.stringify({ password: newPassword }),
      });
      toast({ title: "Succès !", description: "Mot de passe réinitialisé" });
      setShowResetForm(null);
      setNewPassword("");
    } catch {
      toast({ title: "Erreur", description: "Impossible de réinitialiser le mot de passe", variant: "destructive" });
    } finally {
      setResettingId(null);
    }
  };

  const resetForm = () => {
    setFormData({ email: "", first_name: "", last_name: "", role: "VIEWER", password: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":        return <ShieldCheck className="w-4 h-4 text-red-600" />;
      case "ADMIN":              return <Shield className="w-4 h-4 text-orange-600" />;
      case "EDITOR":             return <KeyRound className="w-4 h-4 text-blue-600" />;
      case "VIEWER":             return <Eye className="w-4 h-4 text-emerald-600" />;
      case "GESTIONNAIRE_PROMO": return <Star className="w-4 h-4 text-violet-600" />;
      default:                   return <User className="w-4 h-4 text-purple-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN:        "bg-red-100 text-red-700",
      ADMIN:              "bg-orange-100 text-orange-700",
      EDITOR:             "bg-blue-100 text-blue-700",
      VIEWER:             "bg-emerald-100 text-emerald-700",
      GESTIONNAIRE_PROMO: "bg-violet-100 text-violet-700",
      API_CLIENT:         "bg-purple-100 text-purple-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      SUPER_ADMIN:        "Accès total + gestion utilisateurs",
      ADMIN:              "CRUD sur toutes ressources métier",
      EDITOR:             "Lecture + modification limitée",
      VIEWER:             "Lecture seule",
      GESTIONNAIRE_PROMO: "Participants scans + validation échanges",
      API_CLIENT:         "Accès API limité",
    };
    return descriptions[role] || "";
  };

  const getDisplayName = (user: AppUser) => {
    if (user.first_name || user.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vito Admin" subtitle="GESTION DES UTILISATEURS" />
      <Navigation />

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
            <div>
              <h2 className="text-2xl font-bold">Utilisateurs</h2>
              <p className="text-sm text-gray-500">{users.length} utilisateur(s) au total</p>
            </div>
          </div>
          {canManageUsers && (
            <Button onClick={() => { setShowForm(!showForm); setShowResetForm(null); }}
              className="gap-2 text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
              <Plus className="w-4 h-4" />
              {showForm ? "Annuler" : "Nouvel Utilisateur"}
            </Button>
          )}
        </div>

        {!canManageUsers && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Vous pouvez consulter la liste. Seul un <strong>Super Admin</strong> peut créer, modifier ou supprimer des comptes.</span>
          </div>
        )}

        {/* Info Box RBAC */}
        <Card className="mb-6" style={{ borderColor: "#b2dbd8", backgroundColor: "#f0faf9" }}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3" style={{ color: "#00534f" }}>🔐 Rôles RBAC disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-red-600 mt-0.5" /><div><div className="font-semibold text-red-700">SUPER_ADMIN</div><div className="text-gray-600">Accès total + gestion utilisateurs</div></div></div>
              <div className="flex items-start gap-2"><Shield className="w-4 h-4 text-orange-600 mt-0.5" /><div><div className="font-semibold text-orange-700">ADMIN</div><div className="text-gray-600">CRUD sur toutes ressources</div></div></div>
              <div className="flex items-start gap-2"><KeyRound className="w-4 h-4 text-blue-600 mt-0.5" /><div><div className="font-semibold text-blue-700">EDITOR</div><div className="text-gray-600">Lecture + modification limitée</div></div></div>
              <div className="flex items-start gap-2"><Eye className="w-4 h-4 text-emerald-600 mt-0.5" /><div><div className="font-semibold text-emerald-700">VIEWER</div><div className="text-gray-600">Lecture seule</div></div></div>
              <div className="flex items-start gap-2"><Star className="w-4 h-4 text-violet-600 mt-0.5" /><div><div className="font-semibold text-violet-700">GESTIONNAIRE_PROMO</div><div className="text-gray-600">Participants scans + échanges points</div></div></div>
              <div className="flex items-start gap-2"><User className="w-4 h-4 text-purple-600 mt-0.5" /><div><div className="font-semibold text-purple-700">API_CLIENT</div><div className="text-gray-600">Accès API limité</div></div></div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire */}
        {showForm && canManageUsers && (
          <Card className="mb-6">
            <CardHeader><CardTitle>{editingId ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!editingId ? (
                    <div className="md:col-span-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md">Email : <strong>{formData.email}</strong> (non modifiable)</p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input id="first_name" value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Jean" />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom</Label>
                    <Input id="last_name" value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Rakoto" />
                  </div>
                  <div>
                    <Label htmlFor="role">Rôle *</Label>
                    <select id="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Éditeur</option>
                      <option value="VIEWER">Lecteur</option>
                      <option value="GESTIONNAIRE_PROMO">Gestionnaire Promo</option>
                      <option value="API_CLIENT">Client API</option>
                    </select>
                  </div>
                  {!editingId && (
                    <div>
                      <Label htmlFor="password">Mot de passe *</Label>
                      <Input id="password" type="password" required value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Minimum 8 caractères" />
                    </div>
                  )}
                </div>
                {!editingId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    ⚠️ <strong>Important :</strong> L'utilisateur pourra se connecter avec ces identifiants.
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="submit" className="text-white" style={{ backgroundColor: VITOGAZ_GREEN }}>
                    {editingId ? "Mettre à jour" : "Créer"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset password */}
        {showResetForm && canManageUsers && (
          <Card className="mb-6 border-amber-200">
            <CardHeader><CardTitle className="text-base text-amber-800">🔑 Réinitialiser le mot de passe</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input type="password" placeholder="Nouveau mot de passe (min. 8 caractères)" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} className="flex-1" />
                <Button onClick={() => handleResetPassword(showResetForm)} disabled={resettingId === showResetForm}
                  className="text-white gap-2" style={{ backgroundColor: VITOGAZ_GREEN }}>
                  <RefreshCw className="w-4 h-4" />
                  {resettingId === showResetForm ? "En cours..." : "Réinitialiser"}
                </Button>
                <Button variant="outline" onClick={() => { setShowResetForm(null); setNewPassword(""); }}>Annuler</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input placeholder="Rechercher par email, nom ou rôle..." className="pl-10"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                {canManageUsers && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={canManageUsers ? 6 : 5} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={canManageUsers ? 6 : 5} className="text-center py-8">Aucun utilisateur trouvé</TableCell></TableRow>
              ) : filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.email}</span>
                      {getDisplayName(user) && <span className="text-xs text-gray-400">{getDisplayName(user)}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}{user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{getRoleDescription(user.role)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.status || 'ACTIVE'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(user.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  {canManageUsers && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" title="Réinitialiser le mot de passe"
                          onClick={() => { setShowResetForm(showResetForm === user.id ? null : user.id); setNewPassword(""); setShowForm(false); }}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)} title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}
                          disabled={user.role === "SUPER_ADMIN"} title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 min-h-[52px]">
            <p className="text-xs text-gray-400 italic">
              {canManageUsers ? "Connecté à l'API — données en temps réel" : "Vue en lecture seule"}
            </p>
            <p className="text-sm text-gray-500">{filteredUsers.length} utilisateur(s)</p>
          </div>
        </Card>
      </main>
    </div>
  );
}