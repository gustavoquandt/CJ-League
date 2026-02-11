'use client';

import { MapStats } from '@/types/app.types';
import Image from 'next/image';

interface MapStatsCardsProps {
    mapStats: MapStats | null;
    isLoading?: boolean;
    isVisible?: boolean;
}

// Pool de mapas CS2 competitivo
const CS2_MAP_POOL = [
    'de_dust2',
    'de_mirage',
    'de_inferno',
    'de_nuke',
    'de_overpass',
    'de_ancient',
    'de_anubis',
    'de_cache',
];

// URLs de imagens dos mapas (da API FACEIT)
const MAP_IMAGES: Record<string, string> = {
    'de_dust2': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/7c17caa9-64a6-4496-8a0b-885e0f038d79_1695819126962.jpeg',
    'de_mirage': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/7fb7d725-e44d-4e3c-b557-e1d19b260ab8_1695819144685.jpeg',
    'de_inferno': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/993380de-bb5b-4aa1-ada9-a0c1741dc475_1695819220797.jpeg',
    'de_nuke': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/7197a969-81e4-4fef-8764-55f46c7cec6e_1695819158849.jpeg',
    'de_overpass': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/058c4eb3-dac4-441c-a810-70afa0f3022c_1695819170133.jpeg',
    'de_ancient': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/5b844241-5b15-45bf-a304-ad6df63b5ce5_1695819190976.jpeg',
    'de_anubis': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/31f01daf-e531-43cf-b949-c094ebc9b3ea_1695819235255.jpeg',
    'de_cache': 'https://assets.faceit-cdn.net/third_party/games/ce652bd4-0abb-4c90-9936-1133965ca38b/assets/votables/84fdec54-0c4b-424b-860d-7477495ea026_1741030140483.jpeg',
};

// Ícones oficiais da Valve (https://developer.valvesoftware.com/wiki/)
const MAP_ICONS: Record<string, string> = {
    'de_dust2': 'https://developer.valvesoftware.com/w/images/f/f4/De_dust2.png?20220405152933',
    'de_mirage': 'https://developer.valvesoftware.com/w/images/6/68/De_mirage.png?20220405153133',
    'de_inferno': 'https://developer.valvesoftware.com/w/images/b/be/De_inferno.png',
    'de_nuke': 'https://developer.valvesoftware.com/w/images/5/57/De_nuke.png?20220405153156',
    'de_overpass': 'https://developer.valvesoftware.com/w/images/d/dc/De_overpass.png',
    'de_ancient': 'https://developer.valvesoftware.com/w/images/9/94/De_ancient.png',
    'de_anubis': 'https://developer.valvesoftware.com/w/images/5/54/De_anubis.png?20221119084421',
    'de_cache': 'https://developer.valvesoftware.com/w/images/5/5b/De_cache.png',
};

const formatMapName = (mapName: string): string => {
    return mapName.replace('de_', '').replace('cs_', '').toUpperCase();
};

export default function MapStatsCards({ mapStats, isLoading = false, isVisible = true }: MapStatsCardsProps) {
    // Se não for visível, não renderizar
    if (!isVisible) {
        return null;
    }

    // Se está carregando
    if (isLoading) {
        return (
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Partidas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {CS2_MAP_POOL.map((mapName) => (
                        <div
                            key={mapName}
                            className="h-40 bg-faceit-dark border border-faceit-light-gray rounded-lg overflow-hidden animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Se não tem dados
    if (!mapStats || !mapStats.mapDistribution) {
        return null;
    }

    // Criar array com todos os mapas e suas contagens
    const mapData = CS2_MAP_POOL.map((mapName) => ({
        name: mapName,
        count: mapStats.mapDistribution[mapName] || 0,
        image: MAP_IMAGES[mapName],
        icon: MAP_ICONS[mapName],
    }));

    // Ordenar por contagem (maior para menor)
    const sortedMaps = mapData.sort((a, b) => b.count - a.count);

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Partidas: {mapStats.totalMatches}</h2>

            {/* Container com toda a largura */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {sortedMaps.map((map) => (
                    <div
                        key={map.name}
                        className="relative h-40 bg-faceit-dark border border-faceit-light-gray rounded-lg overflow-hidden hover:border-[#0EA5E9] transition-all group cursor-pointer"
                    >
                        {/* Imagem de fundo */}
                        {map.image && (
                            <Image
                                src={map.image}
                                alt={formatMapName(map.name)}
                                fill
                                className="object-cover opacity-30 group-hover:opacity-50 transition-opacity"
                                unoptimized
                            />
                        )}

                        {/* Overlay escuro gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

                        {/* Conteúdo */}
                        <div className="relative h-full flex flex-col items-center justify-center gap-2 p-3">
                            {/* Ícone do mapa (sem fundo, acima do texto) */}
                            {map.icon && (
                                <div className="w-16 h-16 flex-shrink-0">
                                    <Image
                                        src={map.icon}
                                        alt={`${formatMapName(map.name)} icon`}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-contain drop-shadow-lg"
                                        unoptimized
                                    />
                                </div>
                            )}

                            {/* Número grande */}
                            <p className="text-4xl font-bold text-[#0EA5E9] drop-shadow-lg">
                                {map.count}
                            </p>

                            {/* Nome do mapa */}
                            <p className="text-xs font-semibold text-white/90 text-center leading-tight drop-shadow-lg">
                                {formatMapName(map.name)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}