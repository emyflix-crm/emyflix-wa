'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Novo Agendamento', path: '/novo-agendamento' },
    { name: 'Agendamentos', path: '/agendamentos' },
    { name: 'Histórico', path: '/historico' },
    { name: 'WhatsApp', path: '/whatsapp' },
    { name: 'Grupos', path: '/grupos' },
    { name: 'Minha Conta', path: '/minha-conta' },
    { name: 'Meu Plano', path: '/meu-plano' },
    { name: 'Suporte', path: '/suporte' },
  ];

  return (
    <aside className="w-64 h-screen bg-[var(--surface-color)] border-r border-[var(--border-color)] p-4 flex flex-col hidden md:flex">
      <h2 className="text-2xl font-bold mb-8 neon-text text-center">EMYFLIX WA</h2>
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path} className={`block px-4 py-2 rounded-lg transition-colors ${pathname === item.path ? 'bg-[var(--primary-color)] text-white glow-primary' : 'hover:bg-white/5 text-[var(--text-muted)]'}`}>
            {item.name}
          </Link>
        ))}
        {isAdmin && (
          <>
            <div className="mt-8 mb-2 px-4 text-xs uppercase text-[var(--text-muted)] font-bold">Admin</div>
            <Link href="/admin/dashboard" className="block px-4 py-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)]">Admin Dashboard</Link>
            <Link href="/admin/clientes" className="block px-4 py-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)]">Clientes</Link>
            <Link href="/admin/planos" className="block px-4 py-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)]">Planos</Link>
          </>
        )}
      </nav>
      <div className="pt-4 border-t border-[var(--border-color)]">
        <button onClick={logout} className="w-full text-left px-4 py-2 text-[var(--danger-color)] hover:bg-red-500/10 rounded-lg">Sair</button>
      </div>
    </aside>
  );
}
