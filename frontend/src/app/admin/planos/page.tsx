'use client';
export default function AdminPlanos() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Planos</h1>
        <button className="btn-primary">Novo Plano</button>
      </div>
      <div className="card">
        <p className="text-[var(--text-muted)] text-center py-4">Tabela de planos em construção.</p>
      </div>
    </div>
  );
}
