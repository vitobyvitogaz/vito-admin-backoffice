'use client'

import { useState, useEffect } from 'react'
import { Package, Save, Loader2, CheckCircle, Zap, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { apiGet, apiPost } from '@/lib/api'
import { toast } from '@/lib/use-toast'

interface Product {
  id: string
  name: string
  category: string
  product_code: string
  price?: number  // ✅ Optionnel
  is_active: boolean
}

interface ResellerProduct {
  product_id: string
  products: Product
}

interface Props {
  resellerId: string
  resellerType: string
}

// Règles métier par type de revendeur
const BUSINESS_RULES: Record<string, string[]> = {
  'Station Service': [], // Tous les produits
  'Épicerie': ['B04', 'B09', 'B12'],
  'Quincaillerie': [], // Tous sauf B39
  'Libre service': [], // Tous sauf B39
  'Maison du gaz': [], // Tous sauf B39
}

export default function ProductsManager({ resellerId, resellerType }: Props) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [initialProductIds, setInitialProductIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const hasChanges = JSON.stringify(selectedProductIds.sort()) !== JSON.stringify(initialProductIds.sort())

  useEffect(() => {
    fetchData()
  }, [resellerId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Charger tous les produits
      const productsData = await apiGet<Product[]>('/products')
      setAllProducts(productsData.filter(p => p.is_active))

      // Charger les produits du revendeur
      const resellerProductsData = await apiGet<ResellerProduct[]>(`/resellers/${resellerId}/products`)
      const productIds = resellerProductsData.map(item => item.product_id)
      setSelectedProductIds(productIds)
      setInitialProductIds(productIds)
      
    } catch (error) {
      console.error('Erreur chargement produits:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const applyBusinessRules = () => {
    const rules = BUSINESS_RULES[resellerType]
    
    if (!rules) {
      toast({
        title: 'Information',
        description: 'Aucune règle métier définie pour ce type de revendeur',
      })
      return
    }

    let filteredProducts: Product[] = []

    if (resellerType === 'Station Service') {
      // Tous les produits
      filteredProducts = allProducts
    } else if (resellerType === 'Épicerie') {
      // Seulement B04, B09, B12
      filteredProducts = allProducts.filter(p => rules.includes(p.product_code))
    } else if (['Quincaillerie', 'Libre service', 'Maison du gaz'].includes(resellerType)) {
      // Tous sauf B39
      filteredProducts = allProducts.filter(p => p.product_code !== 'B39')
    } else {
      // Tous les produits par défaut
      filteredProducts = allProducts
    }

    setSelectedProductIds(filteredProducts.map(p => p.id))
    
    toast({
      title: 'Règles appliquées',
      description: `${filteredProducts.length} produit(s) sélectionné(s) selon les règles métier`,
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      await apiPost(`/resellers/${resellerId}/products/assign`, {
        productIds: selectedProductIds,
      })

      toast({
        title: 'Succès !',
        description: 'Produits mis à jour avec succès',
      })

      setInitialProductIds(selectedProductIds)
      
    } catch (error) {
      console.error('Erreur sauvegarde produits:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour des produits',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const categories = ['all', ...new Set(allProducts.map(p => p.category))]
  
  const filteredProducts = selectedCategory === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.category === selectedCategory)

  const selectedByCategory = categories.reduce((acc, cat) => {
    const productsInCat = cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat)
    const selectedCount = productsInCat.filter(p => selectedProductIds.includes(p.id)).length
    acc[cat] = selectedCount
    return acc
  }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Produits disponibles</h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedProductIds.length} produit(s) sélectionné(s) sur {allProducts.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={applyBusinessRules}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Appliquer les règles
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : hasChanges ? (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Sauvegardé
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Règles métier */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Règles métier pour : {resellerType}</p>
              <p className="text-sm text-blue-700 mt-1">
                {resellerType === 'Station Service' && 'Tous les produits disponibles'}
                {resellerType === 'Épicerie' && 'Uniquement B04, B09, B12'}
                {['Quincaillerie', 'Libre service', 'Maison du gaz'].includes(resellerType) && 'Tous les produits sauf B39'}
                {!BUSINESS_RULES[resellerType] && 'Aucune règle spécifique'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres par catégorie */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {categories.map(cat => {
          const count = selectedByCategory[cat] || 0
          const total = cat === 'all' ? allProducts.length : allProducts.filter(p => p.category === cat).length
          
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'Tous' : cat}
              <span className="ml-1.5 opacity-75">
                ({count}/{total})
              </span>
            </button>
          )
        })}
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const isSelected = selectedProductIds.includes(product.id)
          
          return (
            <Card
              key={product.id}
              onClick={() => toggleProduct(product.id)}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {product.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {product.product_code}
                      </span>
                    </div>
                    {product.price && (
                      <p className="text-sm font-semibold text-blue-600 mt-2">
                        {product.price.toLocaleString()} Ar
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit dans cette catégorie</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}