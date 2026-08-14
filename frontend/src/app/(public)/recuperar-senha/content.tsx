'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function RecuperarSenhaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Link enviado para o seu email!');
    } catch (err) {
      toast.error('Erro ao solicitar recuperação');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error('Erro ao alterar senha');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md p-8 glass-card">
        <h2 className="text-2xl font-bold mb-6 text-center">{token ? 'Nova Senha' : 'Recuperar Senha'}</h2>
        {!token ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="input-field" required />
            <button type="submit" className="btn-primary w-full">Enviar Link</button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input type="password" placeholder="Nova Senha" value={password} onChange={(e)=>setPassword(e.target.value)} className="input-field" required />
            <button type="submit" className="btn-primary w-full">Salvar Nova Senha</button>
          </form>
        )}
      </div>
    </div>
  );
}
