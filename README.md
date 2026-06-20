# Misso Sushi

Sistema de pedidos e administracao do Misso Sushi, feito com Next.js, Supabase e Mercado Pago.

## Scripts

- `npm run dev`: inicia o servidor local.
- `npm run build`: gera a build de producao.
- `npm run start`: roda a build gerada.
- `npm run lint`: executa o ESLint.

## Estrutura

- `app/`: rotas, telas e APIs do Next.js.
- `lib/`: clientes e utilitarios compartilhados.
- `types/`: declaracoes TypeScript locais.
- `supabase-*.sql`: scripts de schema, permissoes e politicas do Supabase.

## Ambiente

Configure `.env.local` com as chaves do Supabase, Mercado Pago e WhatsApp antes de rodar localmente.
