# Pendências e limitações conhecidas

Este arquivo registra o que **não** ficou pronto ou depende de ambiente externo.

## Depende de credenciais/configuração
- Supabase/Postgres e Supabase Auth: migrations em `supabase/migrations/0001_init.sql` prontas, mas não aplicadas. Sem variáveis de ambiente, a aplicação usa SQLite local + autenticação local (`data/smartdeals.db`).
- Worker de fila em produção: `npm run worker` roda localmente; em Vercel é necessário hospedar o worker em serviço Node separado ( Railway/Render/Fly/container). Rotas Cron apenas enfileiram trabalhos.
- `CRON_SECRET` precisa ser configurado no Vercel paraAutorizar `/api/cron/discover`.
- Playwright: não instalado. Nenhum conector depende dele atualmente; páginas dinâmicas não coletadas ficam marcadas como bloqueadas/não validadas.

## Fontes não operacionais neste ambiente
- Mercado Livre: API pública respondeu 403 e páginas exibem verificação de tráfego. Conector implementado; requer credencial autorizada.
- Amazon (503), Shopee (CAPTCHA), TerabyteShop (403), Pichau (conexão recusada), Magazine Luiza (403), Americanas (redirect), Casas Bahia (403): conectores implementados com URLs e parsers próprios, porém sem validação de consulta real. Status aparece em "Fontes de pesquisa".
- KaBuM! e AliExpress: conectores validados com páginas públicas reais (JSON-LD e dados embutidos). Coleta sujeita a mudanças de layout e robots.txt.

## Não implementado / a fazer
- Testes ponta a ponta com navegador (Playwright) e testes de mutação de layout.
- Envio real de e-mail para recuperação de senha (modo local devolve token na resposta da API).
- Observabilidade externa (Sentry/OpenTelemetry) e alertas de rate limit por loja.
- Interface administrativa completa para edição de reputação declarada de vendedor.
- Verificação de afiliados e disclousure automático por loja.
- Migração de dados SQLite → Postgres em produção.
- Validação de coleta real das lojas bloqueadas após liberação de acesso.
- E2E de cadastro → varredura → carrinho via worker em execução contínua.

## Decisões
- Nenhuma compra/pagamento é automatizado; carrinho é interno.
- Nunca se inventa preço, reputação ou resultado: fonte bloqueada é registrada como erro/limitação.
- Uma única oferta vencedora por produto monitorado (`cart_items.monitored_product_id` UNIQUE), histórico preservado em `cart_history`.
