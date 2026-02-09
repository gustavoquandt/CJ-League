/**
 * UpdateBadge - Badge flutuante de novos dados
 * Desktop: Canto superior direito
 * Mobile: Canto inferior direito (para facilitar clique)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface UpdateBadgeProps {
  hasNewData: boolean;
  onRefresh: () => void;
  isUpdating?: boolean;
}

export default function UpdateBadge({ hasNewData, onRefresh, isUpdating = false }: UpdateBadgeProps) {
  if (!hasNewData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed z-50
          top-4 right-4 md:top-4 md:right-4
          sm:bottom-20 sm:right-4 sm:top-auto
        "
      >
        <motion.button
          onClick={onRefresh}
          disabled={isUpdating}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(255, 85, 0, 0.7)',
              '0 0 0 10px rgba(255, 85, 0, 0)',
              '0 0 0 0 rgba(255, 85, 0, 0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          className="
            relative
            bg-gradient-to-r from-green-500 to-green-600
            hover:from-green-600 hover:to-green-700
            text-white
            px-4 py-3
            rounded-full
            shadow-lg
            flex items-center gap-2
            font-semibold
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
          "
        >
          {/* Pulse indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>

          {isUpdating ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="hidden sm:inline">Atualizando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Novos dados!</span>
              <span className="sm:hidden">Atualizar</span>
            </>
          )}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}