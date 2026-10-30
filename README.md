# Postos 2B — site e sistema interno

Site público da **Rede de Postos 2B** (com SEO) e sistema interno de **controle de estoque de combustível**, encerrantes, fechamento de turno e empréstimos entre postos.

Substitui o antigo `index.html`, que tinha as senhas escritas no próprio arquivo e gravava direto num Firebase aberto. Agora o login e o banco ficam no **Supabase**, cada usuário só enxerga o que pode, e o app roda na **Vercel**.

| Camada | Tecnologia |
| --- | --- |
| Site e sistema | Next.js 16 (App Router, Server Components, Server Actions), React 19, Tailwind CSS 4 |
| Banco e login | Supabase (Postgres + RLS, Auth, Realtime) |
| Hospedagem | Vercel |

---

## O que o sistema faz

**Site público** (`/` e `/postos/<posto>`)
- Página de cada posto com combustíveis, endereço, horário, botão "Como chegar" e WhatsApp.
- SEO técnico: dados estruturados `GasStation`, `Organization`, `FAQPage` e `BreadcrumbList`, `sitemap.xml`, `robots.txt`, canonical, Open Graph com imagem gerada, páginas estáticas com revalidação a cada hora.
- Feito para o celular primeiro, sem JavaScript desnecessário (carrega rápido no 4G da estrada).

**Sistema interno** (`/sistema`, instalável como app no celular)

Feito para quem tem pouca familiaridade com telas: **uma página só por perfil, para rolar de cima para baixo** (sem trocar de tela), com seções numeradas, uma barra de atalhos, letras e botões grandes e botões **A− / A+** para aumentar a letra. As tabelas seguem o **formato de planilha (Excel)** do sistema antigo: cabeçalho cinza, colunas calculadas em cinza, rodapé amarelo de total e **Enter descendo para a linha de baixo**.

- **Caixa / Pista**: 1) leitura dos encerrantes, onde os litros de cada bico são calculados enquanto se digita; 2) planilha de fechamento (Conteúdo · Est. inicial · Descarga · Vendido · Est. final · Régua · Diferença). O estoque inicial vem da última régua e o **vendido é preenchido sozinho pelos encerrantes** (em azul, editável). Há aviso de diferença acima de **0,6%** (tolerância usual do LMC) e o botão verde **Salvar planilha e enviar no WhatsApp**. Depois vêm a situação dos tanques e o histórico do dia.
- **Gerente**: situação dos tanques (nível, dias de cobertura e média de venda), atualização rápida da régua, fechamento de turno, empréstimos do posto e histórico.
- **Gestor**: planilha da rede (posto × produto, colorida por nível, com total da rede), empréstimos de todos os postos e histórico de qualquer posto. Clicar no posto abre os detalhes.
- **Empréstimos**: tabela de pendentes e quitados como no sistema antigo (no celular, cada empréstimo vira um quadro vertical), com devolução parcial, quitação, cancelamento (só gestor) e auditoria de cada ação.
- **Histórico**: navegação por dia (◀ Anterior · Hoje · Próximo ▶), planilha dos lançamentos e grade de encerrantes por bico, além da exportação **CSV** para o Excel.
- **Usuários** (gestor com acesso total) e **Minha senha**: links no rodapé.
- As telas se atualizam sozinhas quando alguém lança dados (Supabase Realtime).

### Perfis e permissões

| Ação | Caixa / Pista | Gerente | Gestor |
| --- | :---: | :---: | :---: |
| Ver estoque e histórico | o seu posto | o seu posto | postos liberados |
| Encerrantes e fechamento de turno | ✅ | ✅ | — |
| Atualização rápida de régua | — | ✅ | ✅ |
| Registrar e devolver empréstimos | — | envolvendo o seu posto | envolvendo postos liberados |
| Cancelar empréstimo | — | — | ✅ |
| Gerenciar usuários | — | — | só com acesso total |

As regras são aplicadas **no banco de dados**, pelo RLS e pelas funções do Postgres. A tela só esconde botões; mesmo que alguém altere o navegador, o banco recusa.

---

## Segurança da informação

- **Sem senhas no código.** O login usa o Supabase Auth (senhas com hash bcrypt, limite de tentativas por IP e sessão em cookie `HttpOnly`, renovada no servidor).
- **RLS em todas as tabelas.** Cada consulta só devolve dados dos postos do usuário. Visitante anônimo não lê nenhuma tabela, só a função pública com dados do site.
- **Nenhuma escrita direta.** O navegador não consegue fazer `INSERT`, `UPDATE` ou `DELETE`. Tudo passa por funções que conferem papel, posto e valores (sem negativos e sem valores absurdos; o produto precisa pertencer ao posto).
- **Histórico imutável.** Fechamentos e leituras não podem ser editados nem apagados. Uma correção vira um novo lançamento.
- **Auditoria.** Alterações em usuários, cadastros e empréstimos ficam na tabela `auditoria`, com autor e dados antes e depois. Cada empréstimo também tem a sua própria linha do tempo.
- **Usuário desativado** perde o acesso aos dados na hora (RLS) e tem o login bloqueado.
- **Chave secreta só no servidor.** A `SUPABASE_SECRET_KEY` é usada apenas na tela de Usuários e no script de criação, e só depois de confirmar que quem pediu é um gestor com acesso total.
- **Cabeçalhos HTTP**: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`. A área interna leva `noindex` e `no-store`.
- O CSV exportado é protegido contra injeção de fórmulas.

> ⚠️ **O sistema antigo expôs as senhas.** O `index.html` antigo trazia todas as senhas em texto puro, e qualquer pessoa com o arquivo conseguia ler e alterar o Firebase. Considere essas senhas comprometidas: o script de criação gera **senhas novas** por padrão. Depois de migrar, **feche o Firebase** (veja o passo 6).

---

## Implantação passo a passo

### 1. Supabase: criar o banco

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Abra **SQL Editor** e execute, nesta ordem, o conteúdo de:
   1. `supabase/migrations/20261030120000_schema_inicial.sql`
   2. `supabase/migrations/20261030120100_dados_rede.sql` (os 7 postos, tanques, capacidades e bicos do sistema antigo)

   Se você usa a Supabase CLI, o equivalente é `supabase init` (só na primeira vez), `supabase link` e `supabase db push`.
3. Em **Authentication → Sign In / Providers**:
   - desligue **Allow new users to sign up**. Só a gestão cria usuários; isto é importante.
   - deixe o provedor **Email** ligado. A confirmação de e-mail não é usada, porque os usuários já são criados confirmados.
4. Em **Authentication → Policies / Passwords** (quando disponível no seu plano): tamanho mínimo de senha **10** e "leaked password protection" ligado.
5. Confira se o **Realtime** está ativo para `lancamentos`, `leituras_encerrantes` e `emprestimos`. A migração já faz isso; o caminho é **Database → Publications → supabase_realtime**.

### 2. Dados públicos dos postos (SEO)

Em **Table Editor → postos**, preencha para cada posto: `endereco`, `bairro`, `cidade`, `uf`, `cep`, `telefone`, `whatsapp` (só números, com DDD), `horario` (texto exibido, ex.: "Todos os dias, das 6h às 22h"), `aberto_24h`, `latitude` e `longitude` (copie do Google Maps), `servicos` (ex.: `{Conveniência,Calibragem,Troca de óleo}`) e, se quiser, uma `descricao`.

Esses campos aparecem no site e nos dados estruturados, e isso é o que mais pesa no SEO local. O site atualiza sozinho em até 1 hora.

### 3. Vercel: publicar

1. Na Vercel, **Add New → Project** e importe este repositório (o framework é detectado como Next.js).
2. Em **Environment Variables**, cadastre (os modelos estão em `.env.example`):

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave *publishable* (ou a antiga *anon*) |
| `SUPABASE_SECRET_KEY` | chave *secret* (ou a antiga *service_role*). **Nunca** com prefixo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN` | deixe `postos2b.internal` |
| `NEXT_PUBLIC_SITE_URL` | o domínio final, ex.: `https://www.postos2b.com.br` |
| `NEXT_PUBLIC_WHATSAPP_CONTATO`, `NEXT_PUBLIC_EMAIL_CONTATO`, `NEXT_PUBLIC_INSTAGRAM_URL` | opcionais (contatos do site) |

   A integração oficial **Supabase ↔ Vercel** (Marketplace) também cria as variáveis do Supabase automaticamente.
3. Faça o deploy e, em **Settings → Domains**, ligue o domínio da rede.

### 4. Criar os usuários

Os usuários são os mesmos do sistema antigo:

| Perfil | Login (aba do formulário) | Usuário |
| --- | --- | --- |
| Gestor (rede toda) | Gestor | `zico`, `gilmacio`, `sabino` |
| Gestor (Gomes Serpa, Matopiba e Caripare) | Gestor | `marcos-henrique` |
| Gerente | Gerente → escolher o posto | `gerente-<posto>` (automático) |
| Caixa / Pista | Caixa / Pista → escolher o posto | `caixa-<posto>` (automático) |

Os postos são `gomes-serpa`, `caripare`, `nosso-posto`, `matopiba`, `flex`, `divisa` e `urucuia`.

No seu computador (Node 22 ou mais novo):

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SECRET_KEY` no `.env.local` e rode:

```bash
npm run usuarios:criar
```

> Se o Supabase recusar o e-mail técnico (`Unable to validate email address`), troque `NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN` por um subdomínio seu, como `usuarios.seudominio.com.br`, nos dois lugares (Vercel e `.env.local`). Nenhum e-mail é enviado para esse domínio.

O script cria os 18 usuários e mostra **uma única vez** a senha gerada de cada um. Entregue cada senha pessoalmente e peça que a pessoa troque em **Conta**. Para escolher as senhas, crie `scripts/senhas.local.json` (ex.: `{ "zico": "uma-senha-com-10+" }`); esse arquivo é ignorado pelo git. Outras opções: `-- --redefinir` (gera senhas novas para todos) e `-- --somente=zico,caixa-divisa`.

Depois disso, os gestores com acesso total criam e gerenciam usuários pela tela **Usuários**.

### 5. (Opcional) Trazer o histórico do Firebase

1. No Firebase Console, vá em **Realtime Database → ⋮ → Exportar JSON**.
2. Gere o SQL:

```bash
npm run firebase:sql -- rede-2b-export.json importacao-firebase.sql
```

3. Cole o conteúdo de `importacao-firebase.sql` no **SQL Editor** do Supabase e execute.

O script importa fechamentos, atualizações, encerrantes e empréstimos. Pode rodar mais de uma vez sem duplicar. Não versione esses arquivos: eles contêm dados operacionais.

### 6. Desligar o sistema antigo

1. No Firebase, em **Realtime Database → Regras**, publique:
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
2. Apague o `index.html` antigo de onde ele estiver publicado e dos e-mails e grupos onde circulou.

---

## Desenvolvimento local

```bash
npm install
```

```bash
npm run dev
```

O site abre em http://localhost:3000 e o sistema em http://localhost:3000/login. Sem as variáveis do Supabase, o site público usa os dados estáticos da rede (`src/lib/rede.ts`).

Outros comandos: `npm run typecheck` e `npm run build`.

## Estrutura

```
supabase/migrations/   schema, RLS, funções e dados da rede
scripts/               criação de usuários e importação do Firebase
src/proxy.ts           renova a sessão e protege /sistema
src/app/(site)/        site público: início e páginas dos postos
src/app/login/         acesso restrito
src/app/sistema/       painel, lançamentos, empréstimos, histórico, usuários, conta
src/app/sistema/acoes.ts  Server Actions (validação com zod → funções do banco)
src/lib/               clientes Supabase, sessão, consultas, formatação
src/components/        componentes de interface
```

## Ajustes comuns

- **Capacidade de tanque ou alertas**: tabela `tanques` (`capacidade`, `alerta_critico_pct`, `alerta_atencao_pct`).
- **Bico novo ou trocado de produto**: tabela `bicos` (`numero`, `descricao`, `produto_codigo`). O `produto_codigo` liga o bico ao tanque, o que permite calcular as vendas pelos encerrantes. Revise o "Diesel Comum" do Posto Matopiba, que foi ligado ao Diesel S-500.
- **Posto novo**: insira em `postos` e `tanques` (e `bicos`). Ele aparece no site e no sistema; depois crie os usuários pela tela **Usuários**.
- **Exportações grandes**: o Supabase limita as consultas a 1.000 linhas por padrão (Settings → API → Max rows).
