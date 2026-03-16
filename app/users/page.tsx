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
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  ShieldCheck,
  User,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";

interface AppUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    role: "VIEWER",
    password: "",
  });

  useEffect(() => {
    // Pour l'instant, on utilise des données fictives
    // Dans une vraie implémentation, on appellerait l'API
    const mockUsers: AppUser[] = [
      {
        id: "1",
        email: "admin@vitogaz.mg",
        role: "SUPER_ADMIN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        email: "marketing@vitogaz.mg",
        role: "ADMIN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        email: "content@vitogaz.mg",
        role: "EDITOR",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    setTimeout(() => {
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simulation - dans une vraie implémentation, appeler l'API
    const newUser: AppUser = {
      id: Date.now().toString(),
      email: formData.email,
      role: formData.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? { ...u, email: formData.email, role: formData.role } : u));
      alert("Utilisateur modifié avec succès!");
    } else {
      setUsers([...users, newUser]);
      alert("Utilisateur créé avec succès!");
    }

    resetForm();
  };

  const handleEdit = (user: AppUser) => {
    setFormData({
      email: user.email,
      role: user.role,
      password: "",
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?"))
      return;

    setUsers(users.filter(u => u.id !== id));
    alert("Utilisateur supprimé!");
  };

  const resetForm = () => {
    setFormData({
      email: "",
      role: "VIEWER",
      password: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <ShieldCheck className="w-4 h-4 text-red-600" />;
      case "ADMIN":
        return <Shield className="w-4 h-4 text-orange-600" />;
      case "EDITOR":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "VIEWER":
        return <Eye className="w-4 h-4 text-green-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-red-100 text-red-700",
      ADMIN: "bg-orange-100 text-orange-700",
      EDITOR: "bg-blue-100 text-blue-700",
      VIEWER: "bg-green-100 text-green-700",
      API_CLIENT: "bg-purple-100 text-purple-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      SUPER_ADMIN: "Accès total + gestion utilisateurs",
      ADMIN: "CRUD sur toutes ressources métier",
      EDITOR: "Lecture + modification limitée",
      VIEWER: "Lecture seule",
      API_CLIENT: "Accès API limité",
    };
    return descriptions[role] || "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Gestion des Utilisateurs" />
      <Navigation />

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Utilisateurs</h2>
              <p className="text-sm text-gray-500">
                {users.length} utilisateur(s) au total
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Annuler" : "Nouvel Utilisateur"}
          </Button>
        </div>

        {/* Info Box RBAC */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              🔐 Rôles RBAC disponibles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-700">SUPER_ADMIN</div>
                  <div className="text-gray-600">
                    Accès total + gestion utilisateurs
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-700">ADMIN</div>
                  <div className="text-gray-600">
                    CRUD sur toutes ressources
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Edit className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-700">EDITOR</div>
                  <div className="text-gray-600">Modification limitée</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-700">VIEWER</div>
                  <div className="text-gray-600">Lecture seule</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-700">
                    API_CLIENT
                  </div>
                  <div className="text-gray-600">Accès API limité</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Rôle *</Label>
                    <select
                      id="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Éditeur</option>
                      <option value="VIEWER">Lecteur</option>
                      <option value="API_CLIENT">Client API</option>
                    </select>
                  </div>
                  {!editingId && (
                    <div>
                      <Label htmlFor="password">Mot de passe *</Label>
                      <Input
                        id="password"
                        type="password"
                        required={!editingId}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⚠️ <strong>Important :</strong> L'utilisateur recevra un email
                  avec ses identifiants de connexion.
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
                placeholder="Rechercher par email ou rôle..."
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
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Créé le</TableHead>
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getRoleDescription(user.role)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(user.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.role === "SUPER_ADMIN"}
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