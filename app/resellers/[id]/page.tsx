'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Package, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { toast } from '@/lib/use-toast'
import BusinessHoursManager from '@/components/resellers/BusinessHoursManager'
import ProductsManager from '@/components/resellers/ProductsManager'

type Tab = 'hours' | 'products'

interface Reseller {
  id: string
  name: string
  type: string
  city: string
  address: string
  phone: string
  hours?: any
}

export default function ResellerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const resellerId = params.id as string

  const [activeTab, setActiveTab] = useState<Tab>('hours')
  const [reseller, setReseller] = useState<Reseller | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReseller()
  }, [resellerId])

  const fetchReseller = async () => {
    try {
      setIsLoading(true)
      const data = await apiGet<Reseller>(`/resellers/${resellerId}`)
      setReseller(data)
    } catch (err) {
      setError('Impossible de charger le revendeur')
      console.error(err)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le revendeur',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !reseller) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">{error || 'Revendeur introuvable'}</p>
            <Link href="/resellers" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link 
            href="/resellers"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {reseller.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">
                  {reseller.type}
                </span>
                <span>•</span>
                <span>{reseller.city}</span>
                <span>•</span>
                <span>{reseller.phone}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('hours')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'hours'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Horaires d'ouverture
              {activeTab === 'hours' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'products'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              Produits disponibles
              {activeTab === 'products' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'hours' && (
          <BusinessHoursManager 
            resellerId={resellerId} 
            initialHours={reseller.hours}
            onUpdate={fetchReseller}
          />
        )}
        
        {activeTab === 'products' && (
          <ProductsManager 
            resellerId={resellerId}
            resellerType={reseller.type}
          />
        )}
      </div>
    </div>
  )
}