'use client';
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">Total Clientes</h3>
          <div className="text-2xl font-bold">1,234</div>
        </div>
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">WhatsApps Conectados</h3>
          <div className="text-2xl font-bold">892</div>
        </div>
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">Mensagens Enviadas</h3>
          <div className="text-2xl font-bold">45.2M</div>
        </div>
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">Receita Mensal</h3>
          <div className="text-2xl font-bold text-[var(--success-color)]">R$ 15.420</div>
        </div>
      </div>
    </div>
  );
}
