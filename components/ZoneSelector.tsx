"use client";

import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/api";

interface Zone {
  id: string;
  name: string;
  province: string;
  code: string;
}

interface ZoneSelectorProps {
  selectedZones: string[];
  onChange: (zones: string[]) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function ZoneSelector({
  selectedZones,
  onChange,
  label = "Zones",
  required = false,
  placeholder = "Sélectionner des zones...",
}: ZoneSelectorProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const data = await apiGet<Zone[]>("/zones");
      setZones(data || []);
    } catch (error) {
      console.error("Erreur chargement zones:", error);
      // Si l'endpoint n'existe pas encore, utiliser des zones par défaut
      setZones([
        { id: "1", name: "Antananarivo", province: "Antananarivo", code: "TNR" },
        { id: "2", name: "Toamasina", province: "Atsinanana", code: "TMM" },
        { id: "3", name: "Antsirabe", province: "Vakinankaratra", code: "ATB" },
        { id: "4", name: "Mahajanga", province: "Boeny", code: "MJN" },
        { id: "5", name: "Toliara", province: "Atsimo-Andrefana", code: "TLE" },
        { id: "6", name: "Fianarantsoa", province: "Haute Matsiatra", code: "FNR" },
      ]);
    }
  };

  const filteredZones = zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(search.toLowerCase()) ||
      zone.province.toLowerCase().includes(search.toLowerCase())
  );

  const toggleZone = (zoneName: string) => {
    if (selectedZones.includes(zoneName)) {
      onChange(selectedZones.filter((z) => z !== zoneName));
    } else {
      onChange([...selectedZones, zoneName]);
    }
  };

  const removeZone = (zoneName: string) => {
    onChange(selectedZones.filter((z) => z !== zoneName));
  };

  const groupedZones = filteredZones.reduce((acc, zone) => {
    if (!acc[zone.province]) {
      acc[zone.province] = [];
    }
    acc[zone.province].push(zone);
    return acc;
  }, {} as Record<string, Zone[]>);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Selected Zones Tags */}
      {selectedZones.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedZones.map((zoneName) => (
            <span
              key={zoneName}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
            >
              {zoneName}
              <button
                type="button"
                onClick={() => removeZone(zoneName)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {selectedZones.length === 0
            ? placeholder
            : `${selectedZones.length} zone(s) sélectionnée(s)`}
          <span className="ml-2">▼</span>
        </Button>

        {/* Dropdown Content */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
            {/* Search */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une zone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Zones List */}
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(groupedZones).map(([province, provinceZones]) => (
                <div key={province} className="px-2 py-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    {province}
                  </div>
                  {provinceZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.name)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedZones.includes(zone.name)}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <span>{zone.name}</span>
                      <span className="text-xs text-gray-400">({zone.code})</span>
                    </button>
                  ))}
                </div>
              ))}

              {filteredZones.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucune zone trouvée
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowDropdown(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Click Outside to Close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}