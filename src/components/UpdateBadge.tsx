'use client';

/**
 * Badge de atualização no header
 * Mostra status de atualização em tempo real + notificação de novos dados
 */

interface UpdateBadgeProps {
  isUpdating: boolean;
  progress: number;
  hasNewData?: boolean;
  onRefresh?: () => void;
}

export default function UpdateBadge({ 
  isUpdating, 
  progress, 
  hasNewData = false,
  onRefresh 
}: UpdateBadgeProps) {
  
  // Se está atualizando
  if (isUpdating) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-faceit-orange/10 border border-faceit-orange/30 rounded-lg">
        {/* Spinner */}
        <svg
          className="w-4 h-4 text-faceit-orange animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Text */}
        <span className="text-sm font-medium text-faceit-orange">
          Atualizando... {progress}%
        </span>
      </div>
    );
  }

  // Se tem novos dados disponíveis
  if (hasNewData) {
    return (
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
      >
        {/* Ícone de sino com animação */}
        <svg
          className="w-4 h-4 text-green-500 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Text */}
        <span className="text-sm font-medium text-green-500">
          Novos dados disponíveis
        </span>

        {/* Badge de ponto */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </button>
    );
  }

  return null;
}