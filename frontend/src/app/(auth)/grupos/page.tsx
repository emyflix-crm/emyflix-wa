'use client';
export default function Grupos() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <button className="btn-secondary">Sincronizar Grupos</button>
      </div>
      <div className="card">
        <p className="text-[var(--text-muted)] text-center py-4">Nenhum grupo sincronizado ainda.</p>
      </div>
    </div>
  );
}
