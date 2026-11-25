# SmartDeals Autopilot

Agente autônomo de pesquisa de preços: cadastre um produto uma vez e o sistema descobre ofertas reais, valida correspondência, calcula confiabilidade e mantém no carrinho interno somente a melhor oferta válida. Nunca finaliza compras.

## Rodar localmente

```bash
npm install
npm run dev      # app em http://localhost:3000
npm run worker   # em outro terminal: processa a fila de pesquisas
npm test
npm run typecheck
```

Sem credenciais do Supabase, usa SQLite em `data/smartdeals.db` e autenticação local. Para produção, configure `.env.example`, aplique `supabase/migrations/0001_init.sql` e rode o worker em serviço Node separado.

## Arquitetura

- `src/integrations/`: conectores independentes por loja, com capacidades declaradas, robots.txt, timeout e limites de requisição.
- `src/engines/`: discovery, matching, validação, confiabilidade, melhor oferta, carrinho e monitoramento.
- `src/lib/db/`: backend SQLite (dev) e Supabase (produção) atrás da mesma interface.
- `src/worker/`: fila persistente com tentativas e concorrência.
- `src/app/`: interface Next.js (dashboard, carrinho, oportunidades, monitorados, histórico, fontes, configurações).

## Status real das fontes

KaBuM! e AliExpress validados com consultas reais. Demais lojas estão implementadas, mas bloqueadas neste ambiente — ver `PENDENCIAS.md` e a tela "Fontes de pesquisa".

## Testes

`npm test` (16 passando). `RUN_LIVE_TESTS=1 npm test` executa também coleta real contra KaBuM!/AliExpress.
