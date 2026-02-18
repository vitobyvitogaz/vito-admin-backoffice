'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, Save, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPatch } from '@/lib/api'
import { toast } from '@/lib/use-toast'

interface Break {
  start: string
  end: string
}

interface DaySchedule {
  open: string | null
  close: string | null
  breaks: Break[]
  closed: boolean
}

interface DefaultSchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

interface BusinessHours {
  timezone: string
  default_schedule: DefaultSchedule
  holidays?: Array<{ date: string; name: string }>
}

interface Props {
  resellerId: string
  initialHours?: BusinessHours
  onUpdate: () => void
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
]

const DEFAULT_DAY: DaySchedule = {
  open: '08:00',
  close: '17:00',
  breaks: [],
  closed: false,
}

export default function BusinessHoursManager({ resellerId, initialHours, onUpdate }: Props) {
  const [hours, setHours] = useState<BusinessHours>({
    timezone: 'Indian/Antananarivo',
    default_schedule: {
      monday: { ...DEFAULT_DAY },
      tuesday: { ...DEFAULT_DAY },
      wednesday: { ...DEFAULT_DAY },
      thursday: { ...DEFAULT_DAY },
      friday: { ...DEFAULT_DAY },
      saturday: { ...DEFAULT_DAY },
      sunday: { ...DEFAULT_DAY, closed: true },
    },
    holidays: [],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (initialHours) {
      setHours(initialHours)
    }
  }, [initialHours])

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: any) => {
    setHours(prev => ({
      ...prev,
      default_schedule: {
        ...prev.default_schedule,
        [day]: {
          ...prev.default_schedule[day as keyof DefaultSchedule],
          [field]: value,
        },
      },
    }))
    setHasChanges(true)
  }

  const addBreak = (day: string) => {
    const currentBreaks = hours.default_schedule[day as keyof DefaultSchedule].breaks
    updateDaySchedule(day, 'breaks', [
      ...currentBreaks,
      { start: '12:00', end: '14:00' },
    ])
  }

  const removeBreak = (day: string, index: number) => {
    const currentBreaks = hours.default_schedule[day as keyof DefaultSchedule].breaks
    updateDaySchedule(
      day,
      'breaks',
      currentBreaks.filter((_, i) => i !== index)
    )
  }

  const updateBreak = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const currentBreaks = [...hours.default_schedule[day as keyof DefaultSchedule].breaks]
    currentBreaks[index] = {
      ...currentBreaks[index],
      [field]: value,
    }
    updateDaySchedule(day, 'breaks', currentBreaks)
  }

  const toggleClosed = (day: string) => {
    const currentClosed = hours.default_schedule[day as keyof DefaultSchedule].closed
    updateDaySchedule(day, 'closed', !currentClosed)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await apiPatch(`/resellers/${resellerId}/hours`, hours)
      
      toast({
        title: 'Succès !',
        description: 'Horaires mis à jour avec succès',
      })
      
      setHasChanges(false)
      onUpdate()
    } catch (error) {
      console.error('Erreur sauvegarde horaires:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour des horaires',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Horaires d'ouverture</h2>
          <p className="text-sm text-gray-500 mt-1">
            Définissez les horaires d'ouverture pour chaque jour de la semaine
          </p>
        </div>
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

      {/* Days */}
      <div className="space-y-4">
        {DAYS.map(({ key, label }) => {
          const daySchedule = hours.default_schedule[key as keyof DefaultSchedule]
          
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{label}</h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={daySchedule.closed}
                        onChange={() => toggleClosed(key)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">Fermé</span>
                    </label>
                  </div>

                  {!daySchedule.closed && (
                    <>
                      {/* Horaires */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Ouverture</Label>
                          <Input
                            type="time"
                            value={daySchedule.open || ''}
                            onChange={(e) => updateDaySchedule(key, 'open', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Fermeture</Label>
                          <Input
                            type="time"
                            value={daySchedule.close || ''}
                            onChange={(e) => updateDaySchedule(key, 'close', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Pauses */}
                      {daySchedule.breaks.length > 0 && (
                        <div className="space-y-3">
                          <Label>Pauses</Label>
                          {daySchedule.breaks.map((breakItem, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <Input
                                type="time"
                                value={breakItem.start}
                                onChange={(e) => updateBreak(key, index, 'start', e.target.value)}
                                className="flex-1"
                              />
                              <span className="text-gray-400">—</span>
                              <Input
                                type="time"
                                value={breakItem.end}
                                onChange={(e) => updateBreak(key, index, 'end', e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeBreak(key, index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ajouter pause */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBreak(key)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une pause
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}