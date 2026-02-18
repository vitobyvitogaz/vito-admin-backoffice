"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Image as ImageIcon, X, Upload, Save, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/use-toast";
import Image from "next/image";

const API_URL = 'https://vito-backend-supabase.onrender.com/api/v1';

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string | null;
  is_active: boolean;
}

export default function SettingsPage() {
  // Bannières
  const [heroBannerDesktop, setHeroBannerDesktop] = useState<string>("");
  const [heroBannerMobile, setHeroBannerMobile] = useState<string>("");
  const [previewDesktop, setPreviewDesktop] = useState<string>("");
  const [previewMobile, setPreviewMobile] = useState<string>("");
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  
  // Textes
  const [heroTitle, setHeroTitle] = useState<string>("");
  const [heroSubtitle, setHeroSubtitle] = useState<string>("");
  const [heroDescription, setHeroDescription] = useState<string>("");
  
  // Stats
  const [stat1Value, setStat1Value] = useState<string>("");
  const [stat1Label, setStat1Label] = useState<string>("");
  const [stat2Value, setStat2Value] = useState<string>("");
  const [stat2Label, setStat2Label] = useState<string>("");
  const [stat3Value, setStat3Value] = useState<string>("");
  const [stat3Label, setStat3Label] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      
      const data: AppSetting[] = await response.json();
      
      // Mapper les settings
      data.forEach(setting => {
        switch(setting.setting_key) {
          case 'hero_banner_url':
            setHeroBannerDesktop(setting.setting_value);
            setPreviewDesktop(setting.setting_value);
            break;
          case 'hero_banner_url_mobile':
            setHeroBannerMobile(setting.setting_value);
            setPreviewMobile(setting.setting_value);
            break;
          case 'hero_title':
            setHeroTitle(setting.setting_value);
            break;
          case 'hero_subtitle':
            setHeroSubtitle(setting.setting_value);
            break;
          case 'hero_description':
            setHeroDescription(setting.setting_value);
            break;
          case 'stat_1_value':
            setStat1Value(setting.setting_value);
            break;
          case 'stat_1_label':
            setStat1Label(setting.setting_value);
            break;
          case 'stat_2_value':
            setStat2Value(setting.setting_value);
            break;
          case 'stat_2_label':
            setStat2Label(setting.setting_value);
            break;
          case 'stat_3_value':
            setStat3Value(setting.setting_value);
            break;
          case 'stat_3_label':
            setStat3Label(setting.setting_value);
            break;
        }
      });
      
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'desktop' | 'mobile'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image (JPG, PNG, WebP, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 MB",
        variant: "destructive",
      });
      return;
    }

    try {
      if (type === 'desktop') {
        setUploadingDesktop(true);
      } else {
        setUploadingMobile(true);
      }

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'desktop' 
        ? `${API_URL}/settings/upload-hero-banner`
        : `${API_URL}/settings/upload-hero-banner-mobile`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur upload');
      }

      const data = await response.json();

      if (type === 'desktop') {
        setHeroBannerDesktop(data.file_url);
        setPreviewDesktop(data.file_url);
      } else {
        setHeroBannerMobile(data.file_url);
        setPreviewMobile(data.file_url);
      }

      toast({
        title: "Succès !",
        description: `Bannière ${type === 'desktop' ? 'Desktop' : 'Mobile'} uploadée avec succès`,
      });

      await fetchSettings();

    } catch (error) {
      console.error("Erreur upload:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload de la bannière",
        variant: "destructive",
      });
    } finally {
      if (type === 'desktop') {
        setUploadingDesktop(false);
      } else {
        setUploadingMobile(false);
      }
    }
  };

  const handleSaveTexts = async () => {
    try {
      setSaving(true);

      // Mettre à jour tous les textes (même si vides)
      const updates = [
        { key: 'hero_title', value: heroTitle },
        { key: 'hero_subtitle', value: heroSubtitle },
        { key: 'hero_description', value: heroDescription },
      ];

      for (const update of updates) {
        const response = await fetch(`${API_URL}/settings/key/${update.key}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ setting_value: update.value }),
        });

        if (!response.ok) {
          throw new Error(`Erreur mise à jour ${update.key}`);
        }
      }

      toast({
        title: "Succès !",
        description: "Textes mis à jour avec succès",
      });

    } catch (error) {
      console.error("Erreur sauvegarde textes:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des textes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStats = async () => {
    try {
      setSaving(true);

      const updates = [
        { key: 'stat_1_value', value: stat1Value },
        { key: 'stat_1_label', value: stat1Label },
        { key: 'stat_2_value', value: stat2Value },
        { key: 'stat_2_label', value: stat2Label },
        { key: 'stat_3_value', value: stat3Value },
        { key: 'stat_3_label', value: stat3Label },
      ];

      for (const update of updates) {
        const response = await fetch(`${API_URL}/settings/key/${update.key}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ setting_value: update.value }),
        });

        if (!response.ok) {
          throw new Error(`Erreur mise à jour ${update.key}`);
        }
      }

      toast({
        title: "Succès !",
        description: "Statistiques mises à jour avec succès",
      });

    } catch (error) {
      console.error("Erreur sauvegarde stats:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des statistiques",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePreview = (type: 'desktop' | 'mobile') => {
    if (type === 'desktop') {
      setPreviewDesktop("");
      setHeroBannerDesktop("");
    } else {
      setPreviewMobile("");
      setHeroBannerMobile("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vito Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Paramètres de l'application
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
              href="/admin/settings"
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Paramètres
            </Link>
          </div>
        </div>
      </nav>

      <main className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Contenu de la page d'accueil</h2>
            <p className="text-sm text-gray-500">
              Gérer les bannières, les textes et les statistiques
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              Chargement...
            </CardContent>
          </Card>
        ) : (
          <>
            {/* SECTION 1: BANNIÈRES (Desktop + Mobile) */}
            <Card>
              <CardHeader>
                <CardTitle>🖼️ Bannières de la page d'accueil (Art Direction)</CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  💡 Utilisez 2 images différentes pour une expérience optimale : paysage pour desktop, portrait pour mobile
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* BANNIÈRE DESKTOP */}
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">Bannière Desktop (Paysage)</h3>
                  </div>
                  
                  {previewDesktop ? (
                    <div className="space-y-2">
                      <Label>Aperçu actuel</Label>
                      <div className="relative w-full aspect-video border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={previewDesktop}
                          alt="Bannière desktop"
                          fill
                          className="object-cover"
                          priority
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePreview('desktop')}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                          title="Supprimer et changer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        💡 Cliquez sur X pour changer l'image
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="banner-desktop">
                        Sélectionner une image paysage (16:9)
                      </Label>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id="banner-desktop"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerUpload(e, 'desktop')}
                            disabled={uploadingDesktop}
                            className="flex-1"
                          />
                          {uploadingDesktop && (
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                              <Upload className="w-4 h-4 animate-pulse" />
                              Upload...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Format 16:9 (paysage), max 5 MB, résolution 1920x1080px recommandée
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* BANNIÈRE MOBILE */}
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-lg">Bannière Mobile (Portrait)</h3>
                  </div>
                  
                  {previewMobile ? (
                    <div className="space-y-2">
                      <Label>Aperçu actuel</Label>
                      <div className="relative w-full max-w-sm mx-auto aspect-[4/5] border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={previewMobile}
                          alt="Bannière mobile"
                          fill
                          className="object-cover"
                          priority
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePreview('mobile')}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                          title="Supprimer et changer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        💡 Cliquez sur X pour changer l'image
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="banner-mobile">
                        Sélectionner une image portrait (4:5)
                      </Label>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id="banner-mobile"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerUpload(e, 'mobile')}
                            disabled={uploadingMobile}
                            className="flex-1"
                          />
                          {uploadingMobile && (
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                              <Upload className="w-4 h-4 animate-pulse" />
                              Upload...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Format 4:5 (portrait), max 5 MB, résolution 1080x1350px recommandée
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: TEXTES HERO */}
            <Card>
              <CardHeader>
                <CardTitle>✏️ Textes de la Glass Card</CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Si vous laissez un champ vide, rien ne s'affichera sur le frontend
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre principal</Label>
                  <Input
                    id="title"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Ex: VITO BY VITOGAZ"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Laisser vide = rien ne s'affiche
                  </p>
                </div>

                <div>
                  <Label htmlFor="subtitle">Sous-titre</Label>
                  <Input
                    id="subtitle"
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Ex: Rapide. Fiable. Centré sur l'essentiel."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Laisser vide = rien ne s'affiche
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    placeholder="VITO transforme votre expérience Vitogaz..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Laisser vide = rien ne s'affiche
                  </p>
                </div>

                <Button
                  onClick={handleSaveTexts}
                  disabled={saving}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Sauvegarde..." : "Sauvegarder les textes"}
                </Button>
              </CardContent>
            </Card>

            {/* SECTION 3: STATISTIQUES */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Statistiques (affichées dans la Glass Card)</CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Si vous laissez vides, rien ne s'affichera
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stat 1 */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-3">Statistique 1</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stat1value">Valeur</Label>
                      <Input
                        id="stat1value"
                        value={stat1Value}
                        onChange={(e) => setStat1Value(e.target.value)}
                        placeholder="95%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat1label">Label</Label>
                      <Input
                        id="stat1label"
                        value={stat1Label}
                        onChange={(e) => setStat1Label(e.target.value)}
                        placeholder="Points de vente couverts"
                      />
                    </div>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-3">Statistique 2</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stat2value">Valeur</Label>
                      <Input
                        id="stat2value"
                        value={stat2Value}
                        onChange={(e) => setStat2Value(e.target.value)}
                        placeholder="24/7"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat2label">Label</Label>
                      <Input
                        id="stat2label"
                        value={stat2Label}
                        onChange={(e) => setStat2Label(e.target.value)}
                        placeholder="Service client"
                      />
                    </div>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-3">Statistique 3</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stat3value">Valeur</Label>
                      <Input
                        id="stat3value"
                        value={stat3Value}
                        onChange={(e) => setStat3Value(e.target.value)}
                        placeholder="100%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat3label">Label</Label>
                      <Input
                        id="stat3label"
                        value={stat3Label}
                        onChange={(e) => setStat3Label(e.target.value)}
                        placeholder="Sécurité garantie"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveStats}
                  disabled={saving}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Sauvegarde..." : "Sauvegarder les statistiques"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}