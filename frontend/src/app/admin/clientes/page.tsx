'use client';
export default function AdminClientes() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gerenciar Clientes</h1>
      <div className="card">
        <input type="text" placeholder="Buscar clientes..." className="input-field mb-4 max-w-md" />
        <p className="text-[var(--text-muted)] text-center py-4">Tabela de clientes em construção.</p>
      </div>
    </div>
  );
}
