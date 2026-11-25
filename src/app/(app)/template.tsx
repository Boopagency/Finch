/** Remonta a cada navegação: a tela nova entra com animação (ver .page-enter). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
