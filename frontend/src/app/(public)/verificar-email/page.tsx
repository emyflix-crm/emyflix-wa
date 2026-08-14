'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState('Verificando...');

  useEffect(() => {
    if (!token) return;
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('Email verificado com sucesso! Redirecionando...');
        toast.success('Email verificado!');
        setTimeout(() => router.push('/login'), 3000);
      })
      .catch(() => {
        setStatus('Erro ao verificar email. Token inválido ou expirado.');
        toast.error('Erro na verificação');
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{status}</h2>
      </div>
    </div>
  );
}
