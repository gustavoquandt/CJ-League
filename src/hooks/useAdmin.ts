/**
 * Hook para detectar modo admin
 * Verifica query parameter e atalho de teclado
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const searchParams = useSearchParams();

  // Verificar query parameter
  useEffect(() => {
    const adminParam = searchParams.get('admin');
    if (adminParam === ADMIN_SECRET) {
      setIsAdmin(true);
      console.log('🔓 Modo admin ativado via URL');
      
      // Salvar no sessionStorage
      sessionStorage.setItem('admin_auth', 'true');
    }
  }, [searchParams]);

  // Verificar sessionStorage
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // Detectar atalho Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Função para fazer login admin
  const adminLogin = (password: string) => {
    if (password === ADMIN_SECRET) {
      setIsAdmin(true);
      sessionStorage.setItem('admin_auth', 'true');
      // Keep modal open to show admin options
      console.log('🔓 Modo admin ativado via modal');
      return true;
    }
    return false;
  };

  // Função para fazer logout
  const adminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('admin_auth');
    setShowAdminModal(false);
    console.log('🔒 Modo admin desativado');
  };

  return {
    isAdmin,
    showAdminModal,
    setShowAdminModal,
    adminLogin,
    adminLogout,
  };
}