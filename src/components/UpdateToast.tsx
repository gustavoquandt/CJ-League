'use client';

import { useEffect, useState } from 'react';

/**
 * Toast de atualização
 * Aparece quando dados novos estão prontos
 */

interface UpdateToastProps {
  show: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

export default function UpdateToast({ show, onApply, onDismiss }: UpdateToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  const handleApply = () => {
    setIsVisible(false);
    setTimeout(onApply, 300); // Delay para animação
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!show && !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`
          bg-faceit-gray border border-faceit-orange/30 rounded-lg shadow-2xl
          p-4 min-w-[300px] max-w-[400px]
          transform transition-all duration-300
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white">Dados Atualizados!</h4>
              <p className="text-xs text-text-secondary">Novas estatísticas disponíveis</p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar Agora
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-faceit-light-gray hover:bg-faceit-lighter-gray rounded-lg transition-colors text-sm font-medium"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}