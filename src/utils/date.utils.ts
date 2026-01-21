/**
 * Utilitários para manipulação de datas
 * Focado no sistema de cache com atualização às 02:00
 */

import { CACHE_CONFIG } from '@/config/constants';

// ==================== CACHE DATE UTILITIES ====================

/**
 * Calcula a próxima data de atualização (sempre às 02:00)
 * Se já passou das 02:00 hoje, retorna amanhã às 02:00
 * Se ainda não passou, retorna hoje às 02:00
 */
export function getNextUpdateTime(now: Date = new Date()): Date {
  const next = new Date(now);
  
  // Define para 02:00:00.000 do dia atual
  next.setHours(CACHE_CONFIG.updateHour, CACHE_CONFIG.updateMinute, 0, 0);
  
  // Se já passou das 02:00 hoje, adiciona 1 dia
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Verifica se o cache precisa ser atualizado
 * Cache precisa ser atualizado se:
 * 1. Não existe lastUpdated
 * 2. lastUpdated é anterior à última vez que passou das 02:00
 */
export function shouldUpdateCache(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true;
  
  const lastUpdateDate = new Date(lastUpdated);
  const now = new Date();
  
  // Encontra a última vez que passou das 02:00
  const lastUpdateTarget = new Date(now);
  lastUpdateTarget.setHours(CACHE_CONFIG.updateHour, CACHE_CONFIG.updateMinute, 0, 0);
  
  // Se ainda não passou das 02:00 hoje, volta para ontem
  if (now < lastUpdateTarget) {
    lastUpdateTarget.setDate(lastUpdateTarget.getDate() - 1);
  }
  
  // Cache precisa atualizar se foi atualizado antes da última janela de 02:00
  return lastUpdateDate < lastUpdateTarget;
}

/**
 * Verifica se estamos na janela de atualização (02:00 - 02:30)
 * Útil para mostrar indicador de "atualizando" na UI
 */
export function isUpdateWindow(now: Date = new Date()): boolean {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  return hours === CACHE_CONFIG.updateHour && minutes < 30;
}

/**
 * Calcula quanto tempo falta para a próxima atualização
 * Retorna em milliseconds
 */
export function getTimeUntilNextUpdate(now: Date = new Date()): number {
  const nextUpdate = getNextUpdateTime(now);
  return nextUpdate.getTime() - now.getTime();
}

// ==================== FORMATTING UTILITIES ====================

/**
 * Formata data para display (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata data para display relativo ("há 2 horas", "amanhã às 02:00")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Passado
  if (diffMs < 0) {
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    
    if (absDiffMinutes < 1) return 'agora mesmo';
    if (absDiffMinutes < 60) return `há ${absDiffMinutes}min`;
    if (absDiffHours < 24) return `há ${absDiffHours}h`;
    if (absDiffDays === 1) return 'ontem';
    return `há ${absDiffDays} dias`;
  }
  
  // Futuro
  if (diffMinutes < 60) return `em ${diffMinutes}min`;
  if (diffHours < 24) return `em ${diffHours}h`;
  if (diffDays === 1) return 'amanhã às 02:00';
  return `em ${diffDays} dias`;
}

/**
 * Formata tempo restante para countdown (HH:mm:ss)
 */
export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Valida se uma data ISO é válida
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Converte timestamp Unix (segundos) para Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Converte Date para timestamp Unix (segundos)
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// ==================== TIMEZONE UTILITIES ====================

/**
 * Obtém timezone do usuário
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formata data respeitando timezone do usuário
 */
export function formatInUserTimezone(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

// ==================== DEBUG UTILITIES ====================

/**
 * Utilitário de debug para cache
 * Remove em produção
 */
export function debugCacheTiming(lastUpdated: string | null) {
  const now = new Date();
  const nextUpdate = getNextUpdateTime(now);
  const shouldUpdate = shouldUpdateCache(lastUpdated);
  const timeUntilUpdate = getTimeUntilNextUpdate(now);
  
  console.log('🕒 Cache Timing Debug:', {
    now: formatDateTime(now),
    lastUpdated: lastUpdated ? formatDateTime(lastUpdated) : 'never',
    nextUpdate: formatDateTime(nextUpdate),
    shouldUpdate,
    timeUntilUpdate: formatCountdown(timeUntilUpdate),
    isUpdateWindow: isUpdateWindow(now),
  });
}
