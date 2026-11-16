-- Prompt AH · Empresa — diagnóstico SOMENTE LEITURA (nada aqui altera dado).
-- Rodar em produção antes do deploy da AH-1 e de novo depois (teste 23).

-- BAH-1 · quantos cadastros ficam com pendência nova quando a validação de CEP,
-- código IBGE e UF entrar no servidor. Dado inválido já gravado NÃO é tocado:
-- vira pendência na tela, editável, sem travar os demais campos.
SELECT id, name,
       cnpj,
       cep,        length(regexp_replace(coalesce(cep,''), '\D', '', 'g'))          AS cep_digitos,
       codigo_municipio,
       length(regexp_replace(coalesce(codigo_municipio,''), '\D', '', 'g'))         AS ibge_digitos,
       uf,
       aliquota_iss, item_lista_servico, inscricao_municipal, regime_tributario,
       fiscal_ambiente
  FROM tenant
 ORDER BY name;

-- BAH-1 · resumo: quem tem valor PREENCHIDO e inválido (vazio continua passando).
SELECT name,
       (cep IS NOT NULL AND length(regexp_replace(cep, '\D', '', 'g')) <> 8)                           AS cep_invalido,
       (codigo_municipio IS NOT NULL AND length(regexp_replace(codigo_municipio, '\D', '', 'g')) <> 7) AS ibge_invalido,
       (uf IS NOT NULL AND upper(trim(uf)) NOT IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')) AS uf_invalida
  FROM tenant
 ORDER BY name;

-- Parte 4 · os sete campos sem checagem hoje: quantos estão vazios por empresa.
SELECT name,
       nome_fantasia IS NULL AS sem_nome_fantasia,
       inscricao_estadual IS NULL AS sem_ie,
       regime_especial IS NULL AS sem_regime_especial,
       codigo_tributario_municipio IS NULL AS sem_cod_trib_municipio,
       municipio IS NULL AS sem_municipio,
       complemento IS NULL AS sem_complemento,
       telefone IS NULL AS sem_telefone
  FROM tenant
 ORDER BY name;

-- Parte 3 · renameTenant nunca auditou: nenhum evento esperado aqui antes da AH-1.
SELECT action, count(*) FROM audit_log WHERE entity = 'tenant' GROUP BY 1 ORDER BY 1;

-- 23 · antes/depois: a linha inteira de tenant (sem logo_key, que o upload muda de propósito).
SELECT id, name, nome_fantasia, cnpj, inscricao_municipal, inscricao_estadual, regime_tributario,
       regime_especial, item_lista_servico, codigo_tributario_municipio, cnae, aliquota_iss,
       logradouro, numero_endereco, complemento, bairro, codigo_municipio, municipio, uf, cep,
       telefone, email_fiscal, fiscal_ambiente
  FROM tenant
 ORDER BY name;
