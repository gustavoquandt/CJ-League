// MapDistributionCard.tsx - VERSÃO A (Nome dentro da barra)

'use client';

import { MapStats } from '@/types/app.types';

interface MapDistributionCardProps {
  mapStats: MapStats | null;
}

// Cores únicas para cada mapa (gradientes)
const MAP_COLORS: Record<string, string> = {
  'de_dust2': 'linear-gradient(135deg, #F59E0B, #D97706)',    // Amarelo/Areia
  'de_mirage': 'linear-gradient(135deg, #0EA5E9, #0284C7)',   // Azul
  'de_inferno': 'linear-gradient(135deg, #FF6B35, #EF4444)',  // Vermelho/Fogo
  'de_nuke': 'linear-gradient(135deg, #10B981, #059669)',     // Verde
  'de_overpass': 'linear-gradient(135deg, #6B7280, #4B5563)', // Cinza
  'de_ancient': 'linear-gradient(135deg, #A855F7, #9333EA)',  // Roxo
  'de_anubis': 'linear-gradient(135deg, #FBBF24, #F59E0B)',   // Dourado
};

const formatMapName = (mapName: string): string => {
  return mapName.replace('de_', '').replace('cs_', '').toUpperCase();
};

export default function MapDistributionCard({ mapStats }: MapDistributionCardProps) {
  // Se não tem dados, não renderizar
  if (!mapStats || !mapStats.mapDistribution) {
    return null;
  }

  // Pegar distribuição e ordenar
  const mapData = Object.entries(mapStats.mapDistribution || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7); // Top 7 mapas

  const maxCount = Math.max(...mapData.map(([, count]) => count));

  return (
    <div className="relative h-40 bg-faceit-dark border border-faceit-light-gray rounded-lg overflow-hidden hover:border-[#0EA5E9] transition-all group">
      {/* Overlay escuro gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col p-3">
        {/* Título */}
        <p className="text-xs font-semibold text-white/90 mb-2 text-center">
          DISTRIBUIÇÃO
        </p>

        {/* Heatmap - Nome dentro da barra */}
        <div className="flex-1 flex flex-col justify-center space-y-0.5">
          {mapData.map(([mapName, count]) => {
            const percentage = (count / maxCount) * 100;
            return (
              <div key={mapName} className="flex items-center">
                {/* Barra com nome e número dentro */}
                <div className="flex-1 h-4 bg-black/30 rounded-sm overflow-hidden">
                  <div
                    className="h-full flex items-center px-1.5 gap-1 transition-all"
                    style={{
                      background: MAP_COLORS[mapName] || MAP_COLORS['de_dust2'],
                      width: `${percentage}%`,
                    }}
                  >
                    {/* Nome do mapa */}
                    <span className="text-[9px] font-semibold text-white/95 whitespace-nowrap drop-shadow-md">
                      {formatMapName(mapName)}
                    </span>
                    
                    {/* Número (só mostra se tiver espaço - >30%) */}
                    {percentage > 30 && (
                      <span className="text-[9px] font-bold text-white/95 ml-auto drop-shadow-md">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Número fora (fallback para barras pequenas) */}
                {percentage <= 30 && (
                  <span className="text-[10px] font-bold text-white/80 ml-1 w-5 text-right">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <p className="text-[10px] text-white/50 text-center mt-2">
          Total: {mapStats.totalMatches}
        </p>
      </div>
    </div>
  );
}