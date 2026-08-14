import { Suspense } from 'react';
import VerifyEmailContent from './content';

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Verificando...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
