'use client';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold mb-2">Erro ao Carregar Dados</h2>
        <p className="text-text-secondary mb-6">{error}</p>
        
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            Tentar Novamente
          </button>
        )}
      </div>
    </div>
  );
}
