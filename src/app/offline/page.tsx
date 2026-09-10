export const metadata = {
  title: "Sem conexão · WillTreino",
};

export default function OfflinePage() {
  return (
    <main
      className="wt-page flex max-w-3xl flex-col justify-center gap-3"
      id="main-content"
    >
      <p className="wt-kicker">Modo offline</p>
      <h1 className="wt-section-title">Você está sem conexão</h1>
      <p className="wt-text-body text-wt-text-secondary">
        O treino em andamento continua salvo neste aparelho. Assim que a conexão voltar, as séries
        registradas são enviadas automaticamente, sem duplicar nem sobrescrever nada.
      </p>
    </main>
  );
}
