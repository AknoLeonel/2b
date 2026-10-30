-- =====================================================================
-- Postos 2B — schema inicial
--
-- Modelo de segurança
--   * RLS habilitado em TODAS as tabelas.
--   * Usuários autenticados só LEEM dados dos postos a que têm acesso.
--   * Nenhuma tabela aceita INSERT/UPDATE/DELETE direto do navegador:
--     toda escrita passa por funções (security definer) que validam
--     papel, posto e valores antes de gravar.
--   * Lançamentos de estoque e leituras de encerrantes são imutáveis
--     (correções = novo lançamento), preservando o histórico do LMC.
--   * Alterações em cadastros e empréstimos ficam na tabela auditoria.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('gestor', 'gerente', 'caixa');
create type public.tipo_lancamento as enum ('fechamento', 'atualizacao');
create type public.status_emprestimo as enum ('pendente', 'pago', 'cancelado');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.tg_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Converte um valor JSON (número ou texto) em numeric validado.
-- Vazio/nulo => null. Negativo, não numérico ou acima do limite => erro.
create or replace function public.jsonb_para_numero(p_valor jsonb, p_campo text, p_maximo numeric default 99999999)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_texto text;
  v_numero numeric;
begin
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    return null;
  end if;

  v_texto := btrim(p_valor #>> '{}');
  if v_texto = '' then
    return null;
  end if;

  begin
    v_numero := v_texto::numeric;
  exception when others then
    raise exception 'Valor inválido em %.', p_campo using errcode = '22023';
  end;

  if v_numero = 'NaN'::numeric or v_numero < 0 or v_numero > p_maximo then
    raise exception 'Valor fora do intervalo permitido em %.', p_campo using errcode = '22023';
  end if;

  return v_numero;
end;
$$;

-- ---------------------------------------------------------------------
-- Cadastros: postos, produtos, tanques, bicos
-- ---------------------------------------------------------------------
create table public.postos (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome           text not null unique,              -- nome interno (ex.: POSTO DIVISA)
  nome_publico   text not null,                     -- nome exibido no site
  descricao      text,
  endereco       text,
  bairro         text,
  cidade         text,
  uf             char(2),
  cep            text,
  latitude       numeric(9, 6) check (latitude between -90 and 90),
  longitude      numeric(9, 6) check (longitude between -180 and 180),
  telefone       text,
  whatsapp       text,                              -- apenas dígitos com DDI, ex.: 5577999999999
  horario        text,                              -- texto livre exibido no site
  horario_schema text,                              -- formato schema.org, ex.: Mo-Su 06:00-22:00
  aberto_24h     boolean not null default false,
  servicos       text[] not null default '{}',
  ativo          boolean not null default true,
  ordem          integer not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.postos is 'Unidades da rede. Campos de endereço/contato alimentam o site público (SEO).';

create table public.produtos (
  codigo      text primary key check (codigo ~ '^[a-z0-9_]+$'),
  nome        text not null,
  descricao   text,
  unidade     text not null default 'L' check (unidade in ('L', 'un')),
  ordem       integer not null default 0
);
comment on table public.produtos is 'Combustíveis e itens controlados no estoque (L = litros, un = unidades).';

create table public.tanques (
  id                  uuid primary key default gen_random_uuid(),
  posto_id            uuid not null references public.postos (id) on delete cascade,
  produto_codigo      text not null references public.produtos (codigo),
  capacidade          numeric(12, 2) not null default 0 check (capacidade >= 0),
  alerta_critico_pct  numeric(5, 2) not null default 15 check (alerta_critico_pct between 0 and 100),
  alerta_atencao_pct  numeric(5, 2) not null default 30 check (alerta_atencao_pct between 0 and 100),
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  unique (posto_id, produto_codigo)
);
comment on table public.tanques is 'Estoque controlado por posto e produto (capacidade 0 = sem tanque, ex.: Arla em balde).';

create table public.bicos (
  id              uuid primary key default gen_random_uuid(),
  posto_id        uuid not null references public.postos (id) on delete cascade,
  numero          integer not null check (numero > 0),
  descricao       text not null,
  produto_codigo  text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (posto_id, numero),
  -- o produto do bico precisa existir como tanque do mesmo posto
  foreign key (posto_id, produto_codigo) references public.tanques (posto_id, produto_codigo)
);
comment on table public.bicos is 'Bicos de abastecimento; produto_codigo liga o bico ao tanque para calcular vendas pelos encerrantes.';

-- ---------------------------------------------------------------------
-- Usuários (perfis ligados ao Supabase Auth)
-- ---------------------------------------------------------------------
create table public.perfis (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text not null unique
                   check (char_length(username) between 3 and 40 and username ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  nome           text not null check (char_length(nome) between 2 and 80),
  papel          public.papel_usuario not null,
  posto_id       uuid references public.postos (id),
  acesso_total   boolean not null default false,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint perfis_posto_obrigatorio check (papel = 'gestor' or posto_id is not null),
  constraint perfis_gestor_sem_posto check (papel <> 'gestor' or posto_id is null),
  constraint perfis_acesso_total_so_gestor check (not acesso_total or papel = 'gestor')
);
comment on table public.perfis is 'Papel e escopo de cada usuário. Gerente/caixa: um posto. Gestor: acesso_total ou lista em perfil_postos.';

create table public.perfil_postos (
  perfil_id  uuid not null references public.perfis (id) on delete cascade,
  posto_id   uuid not null references public.postos (id) on delete cascade,
  primary key (perfil_id, posto_id)
);
comment on table public.perfil_postos is 'Postos visíveis para gestores sem acesso total.';

-- ---------------------------------------------------------------------
-- Funções de autorização (usadas pelas políticas RLS e pelas RPCs)
-- ---------------------------------------------------------------------
create or replace function public.posto_permitido(p_posto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = (select auth.uid())
      and p.ativo
      and (
        p.acesso_total
        or p.posto_id = p_posto_id
        or exists (
          select 1 from public.perfil_postos pp
          where pp.perfil_id = p.id and pp.posto_id = p_posto_id
        )
      )
  );
$$;

create or replace function public.eh_gestor_total()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.ativo and p.papel = 'gestor' and p.acesso_total
  );
$$;

-- Carrega o perfil ativo do usuário logado ou aborta.
create or replace function public.exigir_perfil()
returns public.perfis
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis;
begin
  select * into v_perfil from public.perfis where id = (select auth.uid()) and ativo;
  if v_perfil.id is null then
    raise exception 'Sessão inválida ou usuário inativo.' using errcode = '42501';
  end if;
  return v_perfil;
end;
$$;

-- ---------------------------------------------------------------------
-- Lançamentos de estoque (fechamento de turno e atualização rápida)
-- ---------------------------------------------------------------------
create table public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  posto_id         uuid not null references public.postos (id),
  tipo             public.tipo_lancamento not null,
  observacao       text check (char_length(observacao) <= 1000),
  criado_por       uuid references auth.users (id) on delete set null,
  criado_por_nome  text not null,
  criado_em        timestamptz not null default now(),
  id_externo       text unique  -- usado na importação do sistema antigo (Firebase)
);
create index lancamentos_posto_data_idx on public.lancamentos (posto_id, criado_em desc);
comment on table public.lancamentos is 'Cabeçalho de cada envio de estoque. Imutável.';

create table public.lancamento_itens (
  lancamento_id    uuid not null references public.lancamentos (id) on delete cascade,
  produto_codigo   text not null references public.produtos (codigo),
  estoque_inicial  numeric(12, 2) check (estoque_inicial >= 0),
  descarga         numeric(12, 2) check (descarga >= 0),
  vendido          numeric(12, 2) check (vendido >= 0),
  regua            numeric(12, 2) check (regua >= 0),
  estoque_final    numeric(12, 2) generated always as (
    case
      when estoque_inicial is null and descarga is null and vendido is null then null
      else coalesce(estoque_inicial, 0) + coalesce(descarga, 0) - coalesce(vendido, 0)
    end
  ) stored,
  diferenca        numeric(12, 2) generated always as (
    case
      when regua is null or (estoque_inicial is null and descarga is null and vendido is null) then null
      else regua - (coalesce(estoque_inicial, 0) + coalesce(descarga, 0) - coalesce(vendido, 0))
    end
  ) stored,
  primary key (lancamento_id, produto_codigo)
);
create index lancamento_itens_produto_idx on public.lancamento_itens (produto_codigo);
comment on column public.lancamento_itens.regua is 'Medição física do tanque (régua). Define o estoque atual.';
comment on column public.lancamento_itens.diferenca is 'Sobra (+) ou falta (-) = régua - (inicial + descarga - vendido).';

-- ---------------------------------------------------------------------
-- Leituras de encerrantes
-- ---------------------------------------------------------------------
create table public.leituras_encerrantes (
  id               uuid primary key default gen_random_uuid(),
  posto_id         uuid not null references public.postos (id),
  observacao       text check (char_length(observacao) <= 1000),
  criado_por       uuid references auth.users (id) on delete set null,
  criado_por_nome  text not null,
  criado_em        timestamptz not null default now(),
  id_externo       text unique
);
create index leituras_encerrantes_posto_data_idx on public.leituras_encerrantes (posto_id, criado_em desc);

create table public.leitura_itens (
  leitura_id  uuid not null references public.leituras_encerrantes (id) on delete cascade,
  bico_id     uuid not null references public.bicos (id),
  valor       numeric(14, 3) not null check (valor >= 0),
  primary key (leitura_id, bico_id)
);
create index leitura_itens_bico_idx on public.leitura_itens (bico_id);

-- ---------------------------------------------------------------------
-- Empréstimos (transferências de combustível entre postos)
-- ---------------------------------------------------------------------
create table public.emprestimos (
  id                   uuid primary key default gen_random_uuid(),
  data                 date not null,
  origem_posto_id      uuid not null references public.postos (id),
  destino_posto_id     uuid not null references public.postos (id),
  produto_codigo       text not null references public.produtos (codigo),
  volume               numeric(12, 2) not null check (volume > 0),
  devolvido            numeric(12, 2) not null default 0 check (devolvido >= 0),
  status               public.status_emprestimo not null default 'pendente',
  observacao           text check (char_length(observacao) <= 500),
  criado_por           uuid references auth.users (id) on delete set null,
  criado_por_nome      text not null,
  criado_em            timestamptz not null default now(),
  atualizado_por       uuid references auth.users (id) on delete set null,
  atualizado_por_nome  text,
  atualizado_em        timestamptz,
  quitado_em           timestamptz,
  id_externo           text unique,
  constraint emprestimos_postos_diferentes check (origem_posto_id <> destino_posto_id),
  constraint emprestimos_devolvido_ate_volume check (devolvido <= volume),
  constraint emprestimos_pago_quitado check (status <> 'pago' or devolvido = volume)
);
create index emprestimos_status_idx on public.emprestimos (status, data desc);
create index emprestimos_origem_idx on public.emprestimos (origem_posto_id);
create index emprestimos_destino_idx on public.emprestimos (destino_posto_id);

create table public.emprestimo_movimentos (
  id             bigint generated always as identity primary key,
  emprestimo_id  uuid not null references public.emprestimos (id) on delete cascade,
  tipo           text not null check (tipo in ('criacao', 'devolucao', 'quitacao', 'cancelamento')),
  volume         numeric(12, 2),
  observacao     text,
  usuario_id     uuid references auth.users (id) on delete set null,
  usuario_nome   text not null,
  criado_em      timestamptz not null default now()
);
create index emprestimo_movimentos_emprestimo_idx on public.emprestimo_movimentos (emprestimo_id, criado_em);

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create table public.auditoria (
  id             bigint generated always as identity primary key,
  tabela         text not null,
  registro_id    text,
  acao           text not null,
  usuario_id     uuid,
  usuario_nome   text,
  dados_antigos  jsonb,
  dados_novos    jsonb,
  criado_em      timestamptz not null default now()
);
create index auditoria_data_idx on public.auditoria (criado_em desc);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);

create or replace function public.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_antigo jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_nome text;
begin
  select p.nome into v_nome from public.perfis p where p.id = (select auth.uid());
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, usuario_nome, dados_antigos, dados_novos)
  values (
    tg_table_name,
    coalesce(v_novo ->> 'id', v_antigo ->> 'id', v_novo ->> 'perfil_id', v_antigo ->> 'perfil_id'),
    lower(tg_op),
    (select auth.uid()),
    v_nome,
    v_antigo,
    v_novo
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create trigger postos_atualizado_em before update on public.postos
  for each row execute function public.tg_atualizado_em();
create trigger tanques_atualizado_em before update on public.tanques
  for each row execute function public.tg_atualizado_em();
create trigger bicos_atualizado_em before update on public.bicos
  for each row execute function public.tg_atualizado_em();
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tg_atualizado_em();

create trigger postos_auditoria after insert or update or delete on public.postos
  for each row execute function public.tg_auditoria();
create trigger tanques_auditoria after insert or update or delete on public.tanques
  for each row execute function public.tg_auditoria();
create trigger bicos_auditoria after insert or update or delete on public.bicos
  for each row execute function public.tg_auditoria();
create trigger perfis_auditoria after insert or update or delete on public.perfis
  for each row execute function public.tg_auditoria();
create trigger perfil_postos_auditoria after insert or update or delete on public.perfil_postos
  for each row execute function public.tg_auditoria();
create trigger emprestimos_auditoria after insert or update or delete on public.emprestimos
  for each row execute function public.tg_auditoria();

-- ---------------------------------------------------------------------
-- Views de leitura (security_invoker => respeitam o RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.v_estoque_atual
with (security_invoker = true)
as
select
  t.id                  as tanque_id,
  t.posto_id,
  t.produto_codigo,
  pr.nome               as produto_nome,
  pr.unidade,
  pr.ordem,
  t.capacidade,
  t.alerta_critico_pct,
  t.alerta_atencao_pct,
  u.regua               as estoque,
  u.criado_em           as medido_em,
  u.tipo                as medido_tipo,
  u.criado_por_nome     as medido_por,
  m.media_diaria
from public.tanques t
join public.produtos pr on pr.codigo = t.produto_codigo
left join lateral (
  select li.regua, l.criado_em, l.tipo, l.criado_por_nome
  from public.lancamentos l
  join public.lancamento_itens li
    on li.lancamento_id = l.id and li.produto_codigo = t.produto_codigo
  where l.posto_id = t.posto_id and li.regua is not null
  order by l.criado_em desc
  limit 1
) u on true
left join lateral (
  select round(
           sum(li.vendido)
           / nullif(count(distinct (l.criado_em at time zone 'America/Sao_Paulo')::date), 0),
           2
         ) as media_diaria
  from public.lancamentos l
  join public.lancamento_itens li
    on li.lancamento_id = l.id and li.produto_codigo = t.produto_codigo
  where l.posto_id = t.posto_id
    and l.tipo = 'fechamento'
    and li.vendido is not null
    and l.criado_em >= now() - interval '7 days'
) m on true
where t.ativo;
comment on view public.v_estoque_atual is 'Estoque atual (última régua) e média diária de vendas dos últimos 7 dias por tanque.';

create view public.v_encerrantes_atuais
with (security_invoker = true)
as
select
  b.id              as bico_id,
  b.posto_id,
  b.numero,
  b.descricao,
  b.produto_codigo,
  atual.valor,
  atual.lido_em,
  atual.lido_por,
  anterior.valor    as valor_anterior,
  anterior.lido_em  as lido_em_anterior
from public.bicos b
left join lateral (
  select li.valor, l.criado_em as lido_em, l.criado_por_nome as lido_por
  from public.leitura_itens li
  join public.leituras_encerrantes l on l.id = li.leitura_id
  where li.bico_id = b.id
  order by l.criado_em desc
  limit 1
) atual on true
left join lateral (
  select li.valor, l.criado_em as lido_em
  from public.leitura_itens li
  join public.leituras_encerrantes l on l.id = li.leitura_id
  where li.bico_id = b.id
  order by l.criado_em desc
  offset 1
  limit 1
) anterior on true
where b.ativo;
comment on view public.v_encerrantes_atuais is 'Última e penúltima leitura de cada bico (base para calcular litros vendidos).';

create view public.v_emprestimos
with (security_invoker = true)
as
select
  e.*,
  o.nome      as origem_nome,
  d.nome      as destino_nome,
  pr.nome     as produto_nome,
  e.volume - e.devolvido as saldo
from public.emprestimos e
join public.postos o on o.id = e.origem_posto_id
join public.postos d on d.id = e.destino_posto_id
join public.produtos pr on pr.codigo = e.produto_codigo;

-- ---------------------------------------------------------------------
-- RPCs de escrita
-- ---------------------------------------------------------------------

-- Fechamento de turno (caixa/gerente) ou atualização rápida de régua (gerente/gestor).
-- p_itens: [{ "produto": "s10", "inicial": 1000, "descarga": 0, "vendido": 200, "regua": 798 }, ...]
create or replace function public.registrar_lancamento(
  p_posto_id   uuid,
  p_tipo       public.tipo_lancamento,
  p_itens      jsonb,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil   public.perfis := public.exigir_perfil();
  v_id       uuid;
  v_item     jsonb;
  v_produto  text;
  v_inicial  numeric;
  v_descarga numeric;
  v_vendido  numeric;
  v_regua    numeric;
  v_qtd      integer := 0;
begin
  if not public.posto_permitido(p_posto_id) then
    raise exception 'Você não tem acesso a este posto.' using errcode = '42501';
  end if;

  if p_tipo = 'fechamento' and v_perfil.papel not in ('caixa', 'gerente') then
    raise exception 'Somente caixa ou gerente podem lançar fechamento de turno.' using errcode = '42501';
  end if;
  if p_tipo = 'atualizacao' and v_perfil.papel not in ('gerente', 'gestor') then
    raise exception 'Somente gerente ou gestor podem fazer atualização rápida.' using errcode = '42501';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 20 then
    raise exception 'Lista de produtos inválida.' using errcode = '22023';
  end if;

  if char_length(p_observacao) > 1000 then
    raise exception 'Observação muito longa (máx. 1000 caracteres).' using errcode = '22023';
  end if;

  insert into public.lancamentos (posto_id, tipo, observacao, criado_por, criado_por_nome)
  values (p_posto_id, p_tipo, nullif(btrim(p_observacao), ''), v_perfil.id, v_perfil.nome)
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto := v_item ->> 'produto';

    if not exists (
      select 1 from public.tanques t
      where t.posto_id = p_posto_id and t.produto_codigo = v_produto and t.ativo
    ) then
      raise exception 'Produto "%" não pertence a este posto.', coalesce(v_produto, '?') using errcode = '22023';
    end if;

    v_regua := public.jsonb_para_numero(v_item -> 'regua', 'régua de ' || v_produto);
    if p_tipo = 'fechamento' then
      v_inicial  := public.jsonb_para_numero(v_item -> 'inicial', 'estoque inicial de ' || v_produto);
      v_descarga := public.jsonb_para_numero(v_item -> 'descarga', 'descarga de ' || v_produto);
      v_vendido  := public.jsonb_para_numero(v_item -> 'vendido', 'vendido de ' || v_produto);
    else
      v_inicial := null; v_descarga := null; v_vendido := null;
    end if;

    continue when v_inicial is null and v_descarga is null and v_vendido is null and v_regua is null;

    if exists (select 1 from public.lancamento_itens where lancamento_id = v_id and produto_codigo = v_produto) then
      raise exception 'Produto "%" informado mais de uma vez.', v_produto using errcode = '22023';
    end if;

    insert into public.lancamento_itens (lancamento_id, produto_codigo, estoque_inicial, descarga, vendido, regua)
    values (v_id, v_produto, v_inicial, v_descarga, v_vendido, v_regua);
    v_qtd := v_qtd + 1;
  end loop;

  if v_qtd = 0 then
    raise exception 'Informe ao menos um valor.' using errcode = '22023';
  end if;

  return v_id;
end;
$$;

-- Leitura de encerrantes (caixa/gerente).
-- p_itens: [{ "bico_id": "<uuid>", "valor": 123456.789 }, ...]
create or replace function public.registrar_encerrantes(
  p_posto_id   uuid,
  p_itens      jsonb,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfis := public.exigir_perfil();
  v_id      uuid;
  v_item    jsonb;
  v_bico    public.bicos;
  v_valor   numeric;
  v_qtd     integer := 0;
begin
  if not public.posto_permitido(p_posto_id) then
    raise exception 'Você não tem acesso a este posto.' using errcode = '42501';
  end if;
  if v_perfil.papel not in ('caixa', 'gerente') then
    raise exception 'Somente caixa ou gerente podem lançar encerrantes.' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 100 then
    raise exception 'Lista de bicos inválida.' using errcode = '22023';
  end if;
  if char_length(p_observacao) > 1000 then
    raise exception 'Observação muito longa (máx. 1000 caracteres).' using errcode = '22023';
  end if;

  insert into public.leituras_encerrantes (posto_id, observacao, criado_por, criado_por_nome)
  values (p_posto_id, nullif(btrim(p_observacao), ''), v_perfil.id, v_perfil.nome)
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    select * into v_bico
    from public.bicos b
    where b.id = case when (v_item ->> 'bico_id') ~* '^[0-9a-f-]{36}$' then (v_item ->> 'bico_id')::uuid end
      and b.posto_id = p_posto_id
      and b.ativo;
    if v_bico.id is null then
      raise exception 'Bico inválido para este posto.' using errcode = '22023';
    end if;

    v_valor := public.jsonb_para_numero(v_item -> 'valor', 'bico ' || v_bico.numero, 99999999999);
    continue when v_valor is null;

    if exists (select 1 from public.leitura_itens where leitura_id = v_id and bico_id = v_bico.id) then
      raise exception 'Bico % informado mais de uma vez.', v_bico.numero using errcode = '22023';
    end if;

    insert into public.leitura_itens (leitura_id, bico_id, valor) values (v_id, v_bico.id, v_valor);
    v_qtd := v_qtd + 1;
  end loop;

  if v_qtd = 0 then
    raise exception 'Informe a leitura de ao menos um bico.' using errcode = '22023';
  end if;

  return v_id;
end;
$$;

-- Novo empréstimo (gestor/gerente). Precisa envolver um posto do usuário.
create or replace function public.registrar_emprestimo(
  p_data       date,
  p_origem     uuid,
  p_destino    uuid,
  p_produto    text,
  p_volume     numeric,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis := public.exigir_perfil();
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_id     uuid;
begin
  if v_perfil.papel not in ('gestor', 'gerente') then
    raise exception 'Somente gestor ou gerente podem registrar empréstimos.' using errcode = '42501';
  end if;
  if p_origem is null or p_destino is null or p_origem = p_destino then
    raise exception 'Origem e destino devem ser postos diferentes.' using errcode = '22023';
  end if;
  if not (public.posto_permitido(p_origem) or public.posto_permitido(p_destino)) then
    raise exception 'O empréstimo precisa envolver um posto sob sua responsabilidade.' using errcode = '42501';
  end if;
  if (select count(*) from public.postos where id in (p_origem, p_destino) and ativo) <> 2 then
    raise exception 'Posto de origem ou destino inválido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.produtos where codigo = p_produto and unidade = 'L') then
    raise exception 'Produto inválido para empréstimo.' using errcode = '22023';
  end if;
  if p_volume is null or p_volume <= 0 or p_volume > 1000000 then
    raise exception 'Volume deve ser maior que zero (máx. 1.000.000 L).' using errcode = '22023';
  end if;
  if p_data is null or p_data > v_hoje or p_data < v_hoje - 366 then
    raise exception 'Data inválida (não pode ser futura nem ter mais de 1 ano).' using errcode = '22023';
  end if;
  if char_length(p_observacao) > 500 then
    raise exception 'Observação muito longa (máx. 500 caracteres).' using errcode = '22023';
  end if;

  insert into public.emprestimos (
    data, origem_posto_id, destino_posto_id, produto_codigo, volume, observacao,
    criado_por, criado_por_nome, atualizado_por, atualizado_por_nome, atualizado_em
  )
  values (
    p_data, p_origem, p_destino, p_produto, round(p_volume, 2), nullif(btrim(p_observacao), ''),
    v_perfil.id, v_perfil.nome, v_perfil.id, v_perfil.nome, now()
  )
  returning id into v_id;

  insert into public.emprestimo_movimentos (emprestimo_id, tipo, volume, observacao, usuario_id, usuario_nome)
  values (v_id, 'criacao', round(p_volume, 2), nullif(btrim(p_observacao), ''), v_perfil.id, v_perfil.nome);

  return v_id;
end;
$$;

-- Trava o empréstimo e confere permissão para movimentá-lo.
create or replace function public.travar_emprestimo(p_id uuid, p_perfil public.perfis)
returns public.emprestimos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emp public.emprestimos;
begin
  select * into v_emp from public.emprestimos where id = p_id for update;
  if v_emp.id is null
     or not (public.posto_permitido(v_emp.origem_posto_id) or public.posto_permitido(v_emp.destino_posto_id)) then
    raise exception 'Empréstimo não encontrado.' using errcode = 'P0002';
  end if;
  if p_perfil.papel not in ('gestor', 'gerente') then
    raise exception 'Sem permissão para movimentar empréstimos.' using errcode = '42501';
  end if;
  if v_emp.status <> 'pendente' then
    raise exception 'Este empréstimo não está mais pendente.' using errcode = '22023';
  end if;
  return v_emp;
end;
$$;

-- Devolução parcial. Retorna o saldo restante.
create or replace function public.registrar_devolucao(
  p_id         uuid,
  p_volume     numeric,
  p_observacao text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis := public.exigir_perfil();
  v_emp    public.emprestimos := public.travar_emprestimo(p_id, v_perfil);
  v_saldo  numeric := v_emp.volume - v_emp.devolvido;
  v_volume numeric := round(p_volume, 2);
begin
  if v_volume is null or v_volume <= 0 then
    raise exception 'Informe um volume maior que zero.' using errcode = '22023';
  end if;
  if v_volume > v_saldo then
    raise exception 'Volume maior que o saldo pendente (% L).', v_saldo using errcode = '22023';
  end if;
  if char_length(p_observacao) > 500 then
    raise exception 'Observação muito longa (máx. 500 caracteres).' using errcode = '22023';
  end if;

  update public.emprestimos
  set devolvido = devolvido + v_volume,
      status = case when devolvido + v_volume >= volume then 'pago'::public.status_emprestimo else 'pendente' end,
      quitado_em = case when devolvido + v_volume >= volume then now() end,
      atualizado_por = v_perfil.id,
      atualizado_por_nome = v_perfil.nome,
      atualizado_em = now()
  where id = v_emp.id;

  insert into public.emprestimo_movimentos (emprestimo_id, tipo, volume, observacao, usuario_id, usuario_nome)
  values (
    v_emp.id,
    case when v_volume = v_saldo then 'quitacao' else 'devolucao' end,
    v_volume, nullif(btrim(p_observacao), ''), v_perfil.id, v_perfil.nome
  );

  return v_saldo - v_volume;
end;
$$;

-- Quitação total do saldo.
create or replace function public.quitar_emprestimo(p_id uuid, p_observacao text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis := public.exigir_perfil();
  v_emp    public.emprestimos := public.travar_emprestimo(p_id, v_perfil);
begin
  if char_length(p_observacao) > 500 then
    raise exception 'Observação muito longa (máx. 500 caracteres).' using errcode = '22023';
  end if;

  update public.emprestimos
  set devolvido = volume,
      status = 'pago',
      quitado_em = now(),
      atualizado_por = v_perfil.id,
      atualizado_por_nome = v_perfil.nome,
      atualizado_em = now()
  where id = v_emp.id;

  insert into public.emprestimo_movimentos (emprestimo_id, tipo, volume, observacao, usuario_id, usuario_nome)
  values (v_emp.id, 'quitacao', v_emp.volume - v_emp.devolvido, nullif(btrim(p_observacao), ''), v_perfil.id, v_perfil.nome);
end;
$$;

-- Cancelamento (lançado por engano). Apenas gestor; o registro é mantido para auditoria.
create or replace function public.cancelar_emprestimo(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis := public.exigir_perfil();
  v_emp    public.emprestimos;
begin
  if v_perfil.papel <> 'gestor' then
    raise exception 'Somente gestores podem cancelar empréstimos.' using errcode = '42501';
  end if;
  v_emp := public.travar_emprestimo(p_id, v_perfil);
  if p_motivo is null or char_length(btrim(p_motivo)) < 3 or char_length(p_motivo) > 500 then
    raise exception 'Informe o motivo do cancelamento (3 a 500 caracteres).' using errcode = '22023';
  end if;

  update public.emprestimos
  set status = 'cancelado',
      atualizado_por = v_perfil.id,
      atualizado_por_nome = v_perfil.nome,
      atualizado_em = now()
  where id = v_emp.id;

  insert into public.emprestimo_movimentos (emprestimo_id, tipo, volume, observacao, usuario_id, usuario_nome)
  values (v_emp.id, 'cancelamento', null, btrim(p_motivo), v_perfil.id, v_perfil.nome);
end;
$$;

-- ---------------------------------------------------------------------
-- Dados públicos para o site (sem login)
-- ---------------------------------------------------------------------
create or replace function public.postos_publicos()
returns table (
  slug           text,
  nome           text,
  descricao      text,
  endereco       text,
  bairro         text,
  cidade         text,
  uf             text,
  cep            text,
  latitude       numeric,
  longitude      numeric,
  telefone       text,
  whatsapp       text,
  horario        text,
  horario_schema text,
  aberto_24h     boolean,
  servicos       text[],
  produtos       jsonb,
  atualizado_em  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.slug, p.nome_publico, p.descricao, p.endereco, p.bairro, p.cidade, p.uf::text, p.cep,
    p.latitude, p.longitude, p.telefone, p.whatsapp, p.horario, p.horario_schema, p.aberto_24h,
    p.servicos,
    coalesce((
      select jsonb_agg(jsonb_build_object('codigo', pr.codigo, 'nome', pr.nome) order by pr.ordem)
      from public.tanques t
      join public.produtos pr on pr.codigo = t.produto_codigo
      where t.posto_id = p.id and t.ativo
    ), '[]'::jsonb),
    p.atualizado_em
  from public.postos p
  where p.ativo
  order by p.ordem, p.nome_publico;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.postos                enable row level security;
alter table public.produtos              enable row level security;
alter table public.tanques               enable row level security;
alter table public.bicos                 enable row level security;
alter table public.perfis                enable row level security;
alter table public.perfil_postos         enable row level security;
alter table public.lancamentos           enable row level security;
alter table public.lancamento_itens      enable row level security;
alter table public.leituras_encerrantes  enable row level security;
alter table public.leitura_itens         enable row level security;
alter table public.emprestimos           enable row level security;
alter table public.emprestimo_movimentos enable row level security;
alter table public.auditoria             enable row level security;

create policy "postos: leitura autenticada" on public.postos
  for select to authenticated using (true);

create policy "produtos: leitura autenticada" on public.produtos
  for select to authenticated using (true);

create policy "tanques: postos permitidos" on public.tanques
  for select to authenticated using (public.posto_permitido(posto_id));

create policy "bicos: postos permitidos" on public.bicos
  for select to authenticated using (public.posto_permitido(posto_id));

create policy "perfis: o próprio ou gestor total" on public.perfis
  for select to authenticated using (id = (select auth.uid()) or (select public.eh_gestor_total()));

create policy "perfil_postos: o próprio ou gestor total" on public.perfil_postos
  for select to authenticated using (perfil_id = (select auth.uid()) or (select public.eh_gestor_total()));

create policy "lancamentos: postos permitidos" on public.lancamentos
  for select to authenticated using (public.posto_permitido(posto_id));

create policy "lancamento_itens: postos permitidos" on public.lancamento_itens
  for select to authenticated using (
    exists (select 1 from public.lancamentos l where l.id = lancamento_id and public.posto_permitido(l.posto_id))
  );

create policy "leituras: postos permitidos" on public.leituras_encerrantes
  for select to authenticated using (public.posto_permitido(posto_id));

create policy "leitura_itens: postos permitidos" on public.leitura_itens
  for select to authenticated using (
    exists (select 1 from public.leituras_encerrantes l where l.id = leitura_id and public.posto_permitido(l.posto_id))
  );

create policy "emprestimos: postos envolvidos" on public.emprestimos
  for select to authenticated using (
    public.posto_permitido(origem_posto_id) or public.posto_permitido(destino_posto_id)
  );

create policy "emprestimo_movimentos: postos envolvidos" on public.emprestimo_movimentos
  for select to authenticated using (
    exists (
      select 1 from public.emprestimos e
      where e.id = emprestimo_id
        and (public.posto_permitido(e.origem_posto_id) or public.posto_permitido(e.destino_posto_id))
    )
  );

create policy "auditoria: gestor total" on public.auditoria
  for select to authenticated using ((select public.eh_gestor_total()));

-- ---------------------------------------------------------------------
-- Privilégios (defesa em profundidade além do RLS)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.postos_publicos() to anon, authenticated;
grant execute on function public.posto_permitido(uuid) to authenticated;
grant execute on function public.eh_gestor_total() to authenticated;
grant execute on function public.registrar_lancamento(uuid, public.tipo_lancamento, jsonb, text) to authenticated;
grant execute on function public.registrar_encerrantes(uuid, jsonb, text) to authenticated;
grant execute on function public.registrar_emprestimo(date, uuid, uuid, text, numeric, text) to authenticated;
grant execute on function public.registrar_devolucao(uuid, numeric, text) to authenticated;
grant execute on function public.quitar_emprestimo(uuid, text) to authenticated;
grant execute on function public.cancelar_emprestimo(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime (painéis atualizam sozinhos quando chega lançamento novo)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.lancamentos, public.leituras_encerrantes, public.emprestimos;
  end if;
end;
$$;
