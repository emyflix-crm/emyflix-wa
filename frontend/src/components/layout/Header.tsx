'use client';
import { useAuthStore } from '@/store/authStore';

export default function Header() {
  const { user } = useAuthStore();
  
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface-color)]">
      <div className="font-semibold text-lg">Olá, {user?.name || 'Usuário'}</div>
      <div className="flex items-center gap-4">
        <div className="badge badge-primary">Plano Ativo</div>
      </div>
    </header>
  );
}
