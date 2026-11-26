# Pendencias e limitacoes conhecidas

Este arquivo registra o que **nao** ficou pronto ou depende de ambiente externo.

## Depende de credenciais/configuracao

- Supabase/Postgres e Supabase Auth: migrations em `supabase/migrations/0001_init.sql` prontas, mas nao aplicadas. Sem variaveis de ambiente, a aplicacao usa SQLite local + autenticacao local (`data/smartdeals.db`).
- Worker de fila em producao: `npm run worker` roda localmente; em Vercel e necessario hospedar o worker em servico Node separado (Railway/Render/Fly/container). Rotas Cron apenas enfileiram trabalhos.
- `CRON_SECRET` precisa ser configurado no Vercel para autorizar `/api/cron/discover`.
- SMTP: com `SMTP_HOST` configurado, a recuperacao de senha envia e-mail real (nodemailer); sem ele, modo local devolve token na resposta da API.
- Sentry: com `SENTRY_DSN` configurado, o SDK captura erros via `instrumentation.ts`; sem DSN fica desativado.

## Fontes nao operacionais neste ambiente

- Mercado Livre: API publica respondeu 403 e paginas exibem verificacao de trafego. Conector implementado; requer credencial autorizada.
- Amazon (503), Shopee (CAPTCHA), TerabyteShop (403), Pichau (conexao recusada), Magazine Luiza (403), Americanas (redirect), Casas Bahia (403): conectores implementados com URLs e parsers proprios, porem sem validacao de consulta real. Status aparece em "Fontes de pesquisa".
- KaBuM! e AliExpress: conectores validados com paginas publicas reais (JSON-LD e dados embutidos). Coleta sujeita a mudancas de layout e robots.txt.

## Implementado

- Testes E2E (Playwright + Chromium headless): autenticacao completa, fluxo de descoberta/varredura via API.
- Envio real de e-mail (SMTP) para recuperacao de senha.
- Observabilidade (Sentry) e alertas de rate limit por loja (notificacao `store_error`).

## Nao implementado / a fazer

- Interface administrativa completa para edicao de reputacao declarada de vendedor (API admin criada; UI pendente).
- Testes E2E com navegador e mutacao de layout.
- Verificacao de afiliados e disclosure automatico por loja.
- Migracao de dados SQLite -> Postgres em producao.
- Validacao de coleta real das lojas bloqueadas apos liberacao de acesso.
- E2E de cadastro -> varredura no carrinho via worker em execucao continua.

## Decisoes

- Nenhuma compra/pagamento automatizado; carrinho e interno.
- Nunca se inventa preco, reputacao ou resultado: fonte bloqueada e registrada como erro/limitacao.
- Uma unica oferta vencedora por produto monitorado (`cart_items.monitored_product_id` UNIQUE), historico preservado em `cart_history`.