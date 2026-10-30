-- =====================================================================
-- Postos 2B — dados da rede (extraídos do sistema antigo index.html)
-- Idempotente: pode ser executado mais de uma vez.
--
-- Depois de aplicar, complete no Table Editor do Supabase (tabela
-- "postos") endereço, cidade, UF, telefone, WhatsApp, horário e
-- coordenadas — esses campos alimentam o site e o SEO local.
-- =====================================================================

insert into public.produtos (codigo, nome, descricao, unidade, ordem) values
  ('comum',       'Gasolina Comum',     'Gasolina tipo C, com etanol anidro na proporção definida pela legislação vigente.', 'L', 1),
  ('aditivada',   'Gasolina Aditivada', 'Gasolina com aditivos detergentes e dispersantes que ajudam a manter limpo o sistema de alimentação do motor.', 'L', 2),
  ('etanol',      'Etanol',             'Etanol hidratado, combustível renovável para veículos flex e a etanol.', 'L', 3),
  ('s500',        'Diesel S-500',       'Diesel com até 500 mg/kg de enxofre, para veículos e máquinas em que o fabricante permite o seu uso.', 'L', 4),
  ('s10',         'Diesel S-10',        'Diesel com até 10 mg/kg de enxofre, exigido nos veículos a diesel fabricados a partir de 2012 (Proconve P7) e posteriores.', 'L', 5),
  ('arla_granel', 'Arla 32 a granel',   'Agente redutor líquido (solução de ureia a 32,5%) para veículos a diesel com sistema SCR.', 'L', 6),
  ('arla_balde',  'Arla 32 em balde',   'Arla 32 embalado, vendido por unidade.', 'un', 7)
on conflict (codigo) do update
  set nome = excluded.nome, descricao = excluded.descricao, unidade = excluded.unidade, ordem = excluded.ordem;

insert into public.postos (slug, nome, nome_publico, ordem) values
  ('gomes-serpa', 'GOMES SERPA',    'Posto Gomes Serpa', 1),
  ('caripare',    'POSTO CARIPARE', 'Posto Caripare',    2),
  ('nosso-posto', 'NOSSO POSTO',    'Nosso Posto',       3),
  ('matopiba',    'POSTO MATOPIBA', 'Posto Matopiba',    4),
  ('flex',        'POSTO FLEX',     'Posto Flex',        5),
  ('divisa',      'POSTO DIVISA',   'Posto Divisa',      6),
  ('urucuia',     'POSTO URUCUIA',  'Posto Urucuia',     7)
on conflict (slug) do nothing;

-- Capacidades (litros). Arla em balde: capacidade 0 (controle por unidade).
insert into public.tanques (posto_id, produto_codigo, capacidade)
select p.id, v.produto, v.capacidade
from (values
  ('gomes-serpa', 'comum', 10000), ('gomes-serpa', 's500', 10000), ('gomes-serpa', 's10', 10000),

  ('caripare', 'comum', 10000), ('caripare', 's500', 10000), ('caripare', 's10', 10000),

  ('nosso-posto', 'comum', 15000), ('nosso-posto', 'aditivada', 10000), ('nosso-posto', 'etanol', 10000),
  ('nosso-posto', 's500', 10000), ('nosso-posto', 's10', 30000),
  ('nosso-posto', 'arla_granel', 3000), ('nosso-posto', 'arla_balde', 0),

  ('matopiba', 'comum', 15000), ('matopiba', 'etanol', 7500), ('matopiba', 's500', 7500),
  ('matopiba', 's10', 15000), ('matopiba', 'arla_granel', 3000), ('matopiba', 'arla_balde', 0),

  ('flex', 'comum', 15000), ('flex', 'aditivada', 15000), ('flex', 'etanol', 7500),
  ('flex', 's500', 7500), ('flex', 's10', 15000),

  ('divisa', 'comum', 20000), ('divisa', 'aditivada', 10000), ('divisa', 'etanol', 10000),
  ('divisa', 's500', 20000), ('divisa', 's10', 45000),
  ('divisa', 'arla_granel', 9000), ('divisa', 'arla_balde', 0),

  ('urucuia', 'comum', 20000), ('urucuia', 'aditivada', 10000), ('urucuia', 'etanol', 10000),
  ('urucuia', 's500', 20000), ('urucuia', 's10', 30000),
  ('urucuia', 'arla_granel', 3000), ('urucuia', 'arla_balde', 0)
) as v (slug, produto, capacidade)
join public.postos p on p.slug = v.slug
on conflict (posto_id, produto_codigo) do nothing;

-- Bicos. A coluna "produto" liga o bico ao tanque (cálculo de vendas pelos encerrantes).
-- Revise: "Diesel Comum" do Posto Matopiba foi ligado ao Diesel S-500.
insert into public.bicos (posto_id, numero, descricao, produto_codigo)
select p.id, v.numero, v.descricao, v.produto
from (values
  ('gomes-serpa', 1, 'Gasolina Comum', 'comum'),
  ('gomes-serpa', 2, 'Diesel S10', 's10'),
  ('gomes-serpa', 3, 'Diesel S500 Comum', 's500'),

  ('caripare', 1, 'Gasolina Comum', 'comum'),
  ('caripare', 2, 'Diesel S-10', 's10'),
  ('caripare', 3, 'Gasolina Comum', 'comum'),
  ('caripare', 4, 'Diesel S500', 's500'),

  ('nosso-posto', 1, 'Gasolina Comum', 'comum'),
  ('nosso-posto', 2, 'Gasolina Comum', 'comum'),
  ('nosso-posto', 3, 'Etanol Comum', 'etanol'),
  ('nosso-posto', 4, 'Gasolina Aditivada', 'aditivada'),
  ('nosso-posto', 5, 'Shell V-Power Diesel S10', 's10'),
  ('nosso-posto', 6, 'Shell V-Power Diesel S10', 's10'),
  ('nosso-posto', 7, 'Diesel S500', 's500'),
  ('nosso-posto', 8, 'Diesel S500', 's500'),
  ('nosso-posto', 9, 'Shell V-Power Diesel S10', 's10'),
  ('nosso-posto', 10, 'Shell V-Power Diesel S10', 's10'),
  ('nosso-posto', 11, 'Diesel S500', 's500'),
  ('nosso-posto', 12, 'Diesel S500', 's500'),

  ('matopiba', 1, 'Gasolina Comum', 'comum'),
  ('matopiba', 2, 'Gasolina Comum', 'comum'),
  ('matopiba', 3, 'Gasolina Comum', 'comum'),
  ('matopiba', 4, 'Gasolina Comum', 'comum'),
  ('matopiba', 5, 'Etanol', 'etanol'),
  ('matopiba', 6, 'Etanol', 'etanol'),
  ('matopiba', 7, 'Diesel Comum', 's500'),
  ('matopiba', 8, 'Diesel Comum', 's500'),
  ('matopiba', 9, 'Diesel S10', 's10'),
  ('matopiba', 10, 'Diesel S10', 's10'),

  ('flex', 1, 'Gasolina Comum', 'comum'),
  ('flex', 2, 'V-Power Etanol Aditivado', 'etanol'),
  ('flex', 3, 'Diesel S500 Comum', 's500'),
  ('flex', 4, 'Gasolina Aditivada V-Power', 'aditivada'),
  ('flex', 5, 'Evolux Diesel S10 Aditivado', 's10'),
  ('flex', 6, 'Gasolina Aditivada V-Power', 'aditivada'),
  ('flex', 7, 'Gasolina Comum', 'comum'),
  ('flex', 8, 'V-Power Etanol Aditivado', 'etanol'),

  ('divisa', 1, 'V-Power Diesel S-10', 's10'),
  ('divisa', 2, 'V-Power Diesel S-10', 's10'),
  ('divisa', 3, 'V-Power Diesel S-10', 's10'),
  ('divisa', 4, 'Diesel S500 Comum', 's500'),
  ('divisa', 5, 'Gasolina Comum', 'comum'),
  ('divisa', 6, 'Gasolina Comum', 'comum'),
  ('divisa', 7, 'V-Power Gasolina Aditivada', 'aditivada'),
  ('divisa', 8, 'Etanol Hidratado', 'etanol'),
  ('divisa', 9, 'V-Power Diesel S-10', 's10'),
  ('divisa', 10, 'V-Power Diesel S-10', 's10'),
  ('divisa', 11, 'V-Power Diesel S-10', 's10'),
  ('divisa', 12, 'Diesel S500 Comum', 's500'),
  ('divisa', 13, 'Diesel S500 Comum', 's500'),

  ('urucuia', 1, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 2, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 3, 'Diesel S500', 's500'),
  ('urucuia', 4, 'Diesel S500', 's500'),
  ('urucuia', 5, 'Diesel S500', 's500'),
  ('urucuia', 6, 'V-Power Etanol Aditivado', 'etanol'),
  ('urucuia', 7, 'Gasolina Comum', 'comum'),
  ('urucuia', 8, 'Gasolina Aditivada', 'aditivada'),
  ('urucuia', 9, 'V-Power Etanol Aditivado', 'etanol'),
  ('urucuia', 10, 'Gasolina Comum', 'comum'),
  ('urucuia', 11, 'Gasolina Aditivada', 'aditivada'),
  ('urucuia', 12, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 13, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 14, 'Gasolina Comum', 'comum'),
  ('urucuia', 15, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 16, 'Gasolina Comum', 'comum'),
  ('urucuia', 17, 'V-Power Diesel S-10', 's10'),
  ('urucuia', 18, 'V-Power Diesel S-10', 's10')
) as v (slug, numero, descricao, produto)
join public.postos p on p.slug = v.slug
on conflict (posto_id, numero) do nothing;
