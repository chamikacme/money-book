import { createContext, useState, type ReactNode } from "react";

export const PageActionsContext = createContext<HTMLElement | null>(null);

export function PageFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  return <>
    <header className="page-header">
      <div><div className="eyebrow"><span className="eyebrow-dot" /> MONEYBOOK / WORKSPACE</div><h1>{title}</h1><p>{description}</p></div>
      <div className="page-actions" ref={setActionsTarget} />
    </header>
    <PageActionsContext.Provider value={actionsTarget}>{children}</PageActionsContext.Provider>
  </>;
}
