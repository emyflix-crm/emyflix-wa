import { Suspense } from 'react';
import RecuperarSenhaContent from './content';

export default function RecuperarSenha() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>}>
      <RecuperarSenhaContent />
    </Suspense>
  );
}
