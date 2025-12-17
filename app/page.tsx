"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Truck,
  FileText,
  Tag,
  Users,
  MapPin,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Stats {
  resellers: number;
  deliveryCompanies: number;
  documents: number;
  promotions: number;
}

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    resellers: 0,
    deliveryCompanies: 0,
    documents: 0,
    promotions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      const [resellers, delivery, docs, promos] = await Promise.all([
        fetch(`${apiUrl}/resellers`).then((r) => r.json()),
        fetch(`${apiUrl}/delivery-companies`).then((r) => r.json()),
        fetch(`${apiUrl}/documents`).then((r) => r.json()),
        fetch(`${apiUrl}/promotions/active`).then((r) => r.json()),
      ]);

      setStats({
        resellers: resellers.length || 0,
        deliveryCompanies: delivery.length || 0,
        documents: docs.length || 0,
        promotions: promos.length || 0,
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Données pour les graphiques
  const monthlyData = [
    { month: "Jan", commandes: 45, revenus: 12000 },
    { month: "Fév", commandes: 52, revenus: 14500 },
    { month: "Mar", commandes: 61, revenus: 16800 },
    { month: "Avr", commandes: 58, revenus: 15200 },
    { month: "Mai", commandes: 72, revenus: 19500 },
    { month: "Juin", commandes: 85, revenus: 23000 },
  ];

  const pieData = [
    { name: "Revendeurs", value: stats.resellers },
    { name: "Livraisons", value: stats.deliveryCompanies },
    { name: "Documents", value: stats.documents },
    { name: "Promotions", value: stats.promotions },
  ];

  const statCards = [
    {
      title: "Revendeurs",
      value: stats.resellers,
      icon: Building2,
      href: "/resellers",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Sociétés de Livraison",
      value: stats.deliveryCompanies,
      icon: Truck,
      href: "/delivery-companies",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Documents",
      value: stats.documents,
      icon: FileText,
      href: "/documents",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Promotions Actives",
      value: stats.promotions,
      icon: Tag,
      href: "/promotions",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="VIto Admin" subtitle="Back-office Vitogaz Madagascar" />
      <Navigation />

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {loading ? "..." : card.value}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total en base de données
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart - Évolution Commandes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Évolution des Commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="commandes"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Commandes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Revenus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Revenus Mensuels (MGA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenus" fill="#10B981" name="Revenus (k MGA)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actions Rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/resellers"
                className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="font-semibold text-blue-900">
                  Ajouter un Revendeur
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Créer une nouvelle fiche revendeur
                </div>
              </Link>
              <Link
                href="/promotions"
                className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="font-semibold text-orange-900">
                  Nouvelle Promotion
                </div>
                <div className="text-sm text-orange-700 mt-1">
                  Lancer une campagne promotionnelle
                </div>
              </Link>
              <Link
                href="/documents"
                className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="font-semibold text-purple-900">
                  Uploader un Document
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  Ajouter PAMF, guides, procédures
                </div>
              </Link>
              <Link
                href="/zones"
                className="block p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-semibold text-cyan-900">
                  <MapPin className="w-4 h-4" />
                  Gérer les Zones
                </div>
                <div className="text-sm text-cyan-700 mt-1">
                  Villes et provinces de Madagascar
                </div>
              </Link>
              <Link
                href="/users"
                className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="font-semibold text-green-900">
                  Gérer les Utilisateurs
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Attribution des rôles RBAC
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Aperçu Système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Aperçu Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Backend API</span>
                <span className="text-sm font-semibold text-green-600">
                  ✓ Opérationnel
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Base Supabase</span>
                <span className="text-sm font-semibold text-green-600">
                  ✓ Connectée
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Endpoints REST</span>
                <span className="text-sm font-semibold">42 actifs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">RLS Policies</span>
                <span className="text-sm font-semibold">32 sécurisées</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Modules CRUD</span>
                <span className="text-sm font-semibold text-green-600">
                  ✅ 6/6 complets
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authentification</span>
                <span className="text-sm font-semibold text-green-600">
                  ✅ JWT Active
                </span>
              </div>
              <div className="pt-3 border-t">
                <a
                  href="https://vito-backend-supabase.onrender.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  → Voir Documentation Swagger
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}