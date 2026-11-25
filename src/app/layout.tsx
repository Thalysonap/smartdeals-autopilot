import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartDeals — Agente autônomo de ofertas",
  description: "Monitoramento automático de preços, comparação confiável e carrinho com a melhor oferta válida.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('sd-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
