'use client';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">WhatsApp Status</h3>
          <div className="text-xl font-semibold text-[var(--success-color)]">Conectado</div>
        </div>
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">Agendamentos Hoje</h3>
          <div className="text-2xl font-bold">12</div>
        </div>
        <div className="card">
          <h3 className="text-[var(--text-muted)] text-sm mb-2">Mensagens Enviadas Hoje</h3>
          <div className="text-2xl font-bold">450 / 1000</div>
          <div className="w-full bg-white/10 h-2 rounded-full mt-2">
            <div className="bg-[var(--primary-color)] h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Campanhas Recentes</h2>
          <Link href="/novo-agendamento" className="btn-primary">Novo Agendamento</Link>
        </div>
        <div className="text-[var(--text-muted)] py-4 text-center">Nenhuma campanha recente.</div>
      </div>
    </div>
  );
}
