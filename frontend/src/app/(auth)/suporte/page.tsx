'use client';
export default function Suporte() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Suporte</h1>
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Fale Conosco</h2>
        <button className="btn-primary mb-4">Contato via WhatsApp</button>
        <p className="text-[var(--text-muted)]">Ou envie um email para suporte@emyflix.com</p>
      </div>
    </div>
  );
}
