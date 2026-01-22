'use client';

/**
 * Cards de Premiação - Full Width
 * - Mesma largura dos outros elementos
 * - Sem ícone
 * - Sem fundo laranja
 * - USPs originais
 */

export default function PrizeCards() {
  const prizes = [
    {
      position: '1º',
      weapon: 'USP-S',
      skin: 'Jawbreaker',
      condition: 'Field-Tested',
    },
    {
      position: '2º',
      weapon: 'USP-S',
      skin: 'Tropical Breeze',
      condition: 'Minimal Wear',
    },
    {
      position: '3º',
      weapon: 'USP-S',
      skin: 'Ticket to Hell',
      condition: 'Minimal Wear',
    },
  ];

  return (
    <div className="mt-6">
      {/* SEM max-width - usa largura total do container pai */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {prizes.map((item) => (
          <div
            key={item.position}
            className="card hover:scale-105 transition-transform duration-300"
          >
            <div className="text-center">
              {/* Posição */}
              <p className="text-sm text-text-secondary font-medium mb-1">
                {item.position} Lugar
              </p>

              {/* Arma */}
              <p className="text-lg font-bold text-white">
                {item.weapon}
              </p>

              {/* Skin */}
              <p className="text-base text-faceit-orange font-semibold">
                {item.skin}
              </p>

              {/* Condição */}
              <p className="text-xs text-text-secondary mt-1">
                ({item.condition})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}