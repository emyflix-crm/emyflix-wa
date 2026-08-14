'use client';
export default function WhatsAppPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Instâncias WhatsApp</h1>
      <div className="card flex flex-col items-center justify-center py-12">
        <h2 className="text-xl mb-4 text-[var(--text-muted)]">Conecte seu WhatsApp para começar</h2>
        <button className="btn-primary">Criar Nova Instância</button>
      </div>
    </div>
  );
}
