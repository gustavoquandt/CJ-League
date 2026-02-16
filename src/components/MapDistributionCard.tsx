// MapDistributionCard.tsx - VERSÃO SEM PADDING (Full Width)

'use client';

import { MapStats } from '@/types/app.types';
import { useState } from 'react';

interface MapDistributionCardProps {
  mapStats: MapStats | null;
}

// Cores únicas para cada mapa (gradientes)
const MAP_COLORS: Record<string, string> = {
  'de_dust2': 'linear-gradient(135deg, #F59E0B, #D97706)',
  'de_mirage': 'linear-gradient(135deg, #0EA5E9, #0284C7)',
  'de_inferno': 'linear-gradient(135deg, #FF6B35, #EF4444)',
  'de_nuke': 'linear-gradient(135deg, #10B981, #059669)',
  'de_overpass': 'linear-gradient(135deg, #6B7280, #4B5563)',
  'de_ancient': 'linear-gradient(135deg, #A855F7, #9333EA)',
  'de_anubis': 'linear-gradient(135deg, #FBBF24, #F59E0B)',
};

const formatMapName = (mapName: string): string => {
  return mapName.replace('de_', '').replace('cs_', '').toUpperCase();
};

const getMapAbbreviation = (mapName: string): string => {
  const name = mapName.replace('de_', '').replace('cs_', '');
  const abbreviations: Record<string, string> = {
    'dust2': 'D2',
    'mirage': 'MR',
    'inferno': 'INF',
    'nuke': 'NK',
    'overpass': 'OV',
    'ancient': 'AN',
    'anubis': 'AB',
  };
  return abbreviations[name] || name.substring(0, 3).toUpperCase();
};

export default function MapDistributionCard({ mapStats }: MapDistributionCardProps) {
  const [hoveredMap, setHoveredMap] = useState<string | null>(null);

  if (!mapStats || !mapStats.mapDistribution) {
    return null;
  }

  const mapData = Object.entries(mapStats.mapDistribution || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7);

  const maxCount = Math.max(...mapData.map(([, count]) => count));

  return (
    <div className="relative h-40 bg-faceit-dark border border-faceit-light-gray rounded-lg overflow-hidden hover:border-[#0EA5E9] transition-all group">
      {/* Overlay escuro gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

      {/* Conteúdo SEM padding */}
      <div className="relative h-full flex flex-col">
       

        {/* Heatmap - Barras full width */}
        <div className="flex-1 flex flex-col justify-evenly">
          {mapData.map(([mapName, count]) => {
            const percentage = (count / maxCount) * 100;
            const isHovered = hoveredMap === mapName;

            return (
              <div 
                key={mapName} 
                className="flex items-stretch h-full relative"
                onMouseEnter={() => setHoveredMap(mapName)}
                onMouseLeave={() => setHoveredMap(null)}
              >
                {/* Sigla do mapa (lado esquerdo) */}
                <div className="w-8 flex items-center justify-center bg-black/30 border-r border-white/5">
                  <span className="text-[8px] text-white/90 font-mono font-semibold">
                    {getMapAbbreviation(mapName)}
                  </span>
                </div>

                {/* Barra (full width do restante) */}
                <div className="flex-1 relative cursor-pointer overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      background: MAP_COLORS[mapName] || MAP_COLORS['de_dust2'],
                      width: `${percentage}%`,
                      opacity: isHovered ? 0.9 : 1,
                    }}
                  />
                </div>

                {/* Número (lado direito) */}
                <div className="w-8 flex items-center justify-center bg-black/40 border-l border-white/5">
                  <span className="text-[9px] font-bold text-white/95">
                    {count}
                  </span>
                </div>

                {/* Tooltip no hover */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-10 pointer-events-none">
                    <div className="bg-black/90 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap">
                      {formatMapName(mapName)} - {count} partidas
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="border-4 border-transparent border-t-black/90" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

       
      </div>
    </div>
  );
}