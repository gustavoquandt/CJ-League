// src/app/admin/page.tsx - EXEMPLO COMPLETO
// Página admin com todos os controles

import UpdateMapStatsButton from '@/components/admin/UpdateMapStatsButton';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">⚙️ Admin Panel</h1>
          <p className="text-gray-400">Controles administrativos do sistema</p>
        </div>

        {/* Grid de Cards */}
        <div className="grid gap-6">
          {/* Update Map Stats */}
          <UpdateMapStatsButton seasonId="SEASON_1" />

          {/* Outros controles que você já tem */}
          {/* <UpdateAllButton /> */}
          {/* <UpdateIncrementalButton /> */}
          {/* etc... */}
        </div>
      </div>
    </div>
  );
}