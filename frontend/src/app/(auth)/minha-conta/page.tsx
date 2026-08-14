'use client';
export default function MinhaConta() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Minha Conta</h1>
      <div className="card max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Dados do Perfil</h2>
        <form className="space-y-4">
          <input type="text" placeholder="Nome" className="input-field" />
          <input type="email" placeholder="Email" className="input-field" />
          <button className="btn-primary">Salvar</button>
        </form>
      </div>
      <div className="card max-w-md border-[var(--danger-color)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--danger-color)]">Zona de Perigo</h2>
        <button className="btn-danger w-full">Excluir Conta</button>
      </div>
    </div>
  );
}
