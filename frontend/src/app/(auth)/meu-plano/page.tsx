'use client';
export default function MeuPlano() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Meu Plano</h1>
      <div className="card max-w-md">
        <h2 className="text-xl font-semibold mb-2">Plano Trial</h2>
        <p className="text-[var(--text-muted)] mb-4">Seu plano expira em 7 dias.</p>
        <button className="btn-primary w-full">Fazer Upgrade</button>
      </div>
    </div>
  );
}
