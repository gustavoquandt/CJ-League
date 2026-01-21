'use client';

export default function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-faceit-orange/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-faceit-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg text-text-secondary animate-pulse">
          Carregando estatísticas...
        </p>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton w-16 h-16 rounded-full"></div>
        <div className="flex-1">
          <div className="skeleton h-6 w-32 mb-2 rounded"></div>
          <div className="skeleton h-4 w-24 rounded"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-full rounded"></div>
        <div className="skeleton h-4 w-3/4 rounded"></div>
        <div className="skeleton h-4 w-5/6 rounded"></div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th className="skeleton h-10"></th>
            <th className="skeleton h-10"></th>
            <th className="skeleton h-10"></th>
            <th className="skeleton h-10"></th>
          </tr>
        </thead>
        <tbody>
          {[...Array(10)].map((_, i) => (
            <tr key={i}>
              <td><div className="skeleton h-8 w-full rounded"></div></td>
              <td><div className="skeleton h-8 w-full rounded"></div></td>
              <td><div className="skeleton h-8 w-full rounded"></div></td>
              <td><div className="skeleton h-8 w-full rounded"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
