'use client';

/**
 * Badge de atualização no header
 * Mostra status de atualização em tempo real
 */

interface UpdateBadgeProps {
  isUpdating: boolean;
  progress: number;
}

export default function UpdateBadge({ isUpdating, progress }: UpdateBadgeProps) {
  if (!isUpdating) return null;

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