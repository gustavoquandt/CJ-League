'use client';

/**
 * Componente de Cards de Premiação
 * Mostra os prêmios da liga (1º, 2º e 3º lugar)
 */

interface Prize {
  position: number;
  weapon: string;
  skin: string;
  condition: string;
  color: string;
  gradient: string;
}

const PRIZES: Prize[] = [
  {
    position: 1,
    weapon: 'USP-S',
    skin: 'Jawbreaker',
    condition: 'Field-Tested',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
  },
  {
    position: 2,
    weapon: 'USP-S',
    skin: 'Tropical Breeze',
    condition: 'Minimal Wear',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 100%)'
  },
  {
    position: 3,
    weapon: 'USP-S',
    skin: 'Ticket to Hell',
    condition: 'Minimal Wear',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)'
  }
];

function PrizeCard({ prize }: { prize: Prize }) {
  return (
    <div className="prize-card">
      {/* Medalha de posição */}
      <div className="prize-medal" style={{ background: prize.gradient }}>
        <span className="prize-position">{prize.position}º</span>
      </div>

      {/* Conteúdo do prêmio */}
      <div className="prize-content">
        <div className="prize-weapon">{prize.weapon}</div>
        <div className="prize-skin">{prize.skin}</div>
        <div className="prize-condition">({prize.condition})</div>
      </div>

    </div>
  );
}

export default function PrizeCards() {
  return (
    <div className="prizes-section">
           
      <div className="prizes-grid">
        {PRIZES.map((prize) => (
          <PrizeCard key={prize.position} prize={prize} />
        ))}
      </div>
    </div>
  );
}