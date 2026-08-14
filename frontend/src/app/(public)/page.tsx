import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="p-6 flex justify-between items-center border-b border-[var(--border-color)]">
        <h1 className="text-2xl font-bold neon-text">EMYFLIX WA</h1>
        <nav className="gap-4 hidden md:flex">
          <Link href="#como-funciona" className="hover:text-[var(--primary-color)] transition-colors">Como funciona</Link>
          <Link href="#recursos" className="hover:text-[var(--primary-color)] transition-colors">Recursos</Link>
          <Link href="#planos" className="hover:text-[var(--primary-color)] transition-colors">Planos</Link>
        </nav>
        <div className="gap-4 flex">
          <Link href="/login" className="btn-ghost px-4 py-2 rounded-lg">Entrar</Link>
          <Link href="/cadastro" className="btn-primary px-4 py-2 rounded-lg">Começar grátis</Link>
        </div>
      </header>
      <main className="flex flex-col items-center justify-center p-24 text-center relative overflow-hidden">
        <div className="particle-canvas"></div>
        <h2 className="text-5xl font-bold mb-6 animate-slide-up">Automatize seus envios no WhatsApp</h2>
        <p className="text-xl text-[var(--text-muted)] mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>Agende uma vez e deixe o EMYFLIX WA trabalhar por você.</p>
        <div className="flex gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link href="/cadastro" className="btn-primary px-8 py-3 text-lg rounded-lg glow-primary">Começar grátis (7 dias)</Link>
        </div>
      </main>
    </div>
  );
}
