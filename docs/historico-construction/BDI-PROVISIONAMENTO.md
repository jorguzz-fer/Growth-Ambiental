# Medição, BDI e provisionamento — modelo derivado da planilha de referência

Documento de **especificação**, ainda não implementado. Registra o modelo de
cálculo extraído da planilha enviada pelo cliente
(`Provisionamento_de_receita_obra_25_1.xlsx`, aba `Calculo de medição obra 32`),
para que a implementação não dependa de suposições.

> **Identificação divergente:** o arquivo cita "obra 25" e a aba cita "obra 32".
> Conforme orientação do cliente, **essas identificações não são regra de
> sistema** — o cálculo deve ser genérico por projeto. Nenhum valor abaixo pode
> ser fixado em código (hardcode); todos são exemplos de validação.
> Os valores de exemplo abaixo são **sintéticos**, recalculados com as mesmas
> fórmulas; os valores reais da planilha do cliente foram removidos.

## 1. Parâmetros do projeto (entradas)

| Parâmetro | Exemplo (sintético) |
|---|---|
| Construção financiada | R$ 200.000,00 |
| Terreno financiado | R$ 100.000,00 |
| Entrada paga na assinatura | R$ 30.000,00 |
| Entrada parcelada | R$ 50.000,00 |
| **Total da aquisição** | **R$ 380.000,00** |
| CUB | R$ 2.500,00 |
| Metragem | 70,00 m² |
| **Custo referencial** (= CUB × metragem) | **R$ 175.000,00** |
| Parcela referência caixa | R$ 3.000,00 |
| Tipo de executor da obra | Profissional Autônomo |
| % BDI | 6,00 % |

**Total financiado** = construção financiada + terreno financiado
= 200.000 + 100.000 = **R$ 300.000,00** (base do % recebido).

Custos pagos antes do alvará (ITBI, registro, taxa Caixa, projeto/arquitetura,
vistoria) são listados à parte.

## 2. Serviços e incidência

Cada serviço (20 na planilha, do "Barracão" a "Outros") tem:

```
incidência_%  = custo_do_serviço / custo_total_dos_serviços × 100
```

Exemplo: Paredes e Painéis = 25.000 / 250.000 = **10,000 %**.

Colunas por serviço: descrição, custo proposto, incidência, % acumulado,
**limite mínimo [%]**, **limite máximo [%]** e status.

```
status = "OK"                 se  mínimo ≤ incidência ≤ máximo
         "Abaixo do mínimo"   se  incidência < mínimo
         "Acima do máximo"    se  incidência > máximo
```

Validado na planilha: os serviços com incidência menor que o limite mínimo
aparecem como *Abaixo do mínimo*; os demais como *OK*.

## 3. BDI

```
valor_do_BDI       = custo_total_dos_serviços × %BDI
custo_total_c_BDI  = custo_total_dos_serviços + valor_do_BDI
```

Exemplo: 250.000,00 × 6 % = **15.000,00** → total com BDI **265.000,00**.

> **Regra pendente de confirmação:** na planilha o %BDI (6 %) aparece ao lado do
> campo **"Executor obra: Profissional Autônomo"**, indicando que a alíquota
> depende do **tipo de executor** (construtora × profissional autônomo). A
> planilha só traz o caso do autônomo. **Não presumir a alíquota de construtora**
> — o %BDI deve ser configurável por projeto, com o tipo de executor registrado,
> e a regra confirmada com o cliente antes de qualquer validação automática.

## 4. Medição mensal por serviço

O usuário informa o **percentual executado acumulado** de cada serviço ao final
de cada mês. O sistema calcula o resto:

```
execução_acumulada_%  = incidência_% × %executado_do_serviço
variação_mensal_%     = execução_acumulada_atual − execução_acumulada_anterior
valor_medido          = variação_mensal_% × construção_financiada
```

Exemplo (Barracão, incidência 2,0000 %):
- Julho, 80 % executado → acumulado 1,6000 % → variação 1,6000 % →
  1,6000 % × 200.000 = **R$ 3.200,00**
- Agosto, 100 % executado → acumulado 2,0000 % → variação 0,4000 % →
  **R$ 800,00**

**Mensurado acumulado da obra** = soma das execuções acumuladas de todos os
serviços. Exemplo: jul 20,00 · ago 40,00 · set 60,00 · out 80,00 ·
nov 95,00 · dez 100,00 — com variações de 20,00 · 20,00 · 20,00 · 15,00 · 5,00,
confirmando `variação = acumulado_atual − acumulado_anterior`.

## 5. Liberação, custo e geração de caixa (quadro mensal)

Para cada mês de medição:

```
liberação_do_mês      = variação_mensal_% × construção_financiada
custo_estimado_do_mês = variação_mensal_% × custo_referencial(CUB × metragem)
geração_de_caixa      = liberação_do_mês − custo_estimado_do_mês
liberação_acumulada   = liberação_acumulada_anterior + liberação_do_mês
%_recebido            = liberação_acumulada / total_financiado
E.V.O                 = parcela_referência_caixa × %_recebido
taxa_1,5%             = 1,5 % × liberação_do_mês
soma_do_mês           = E.V.O + taxa_1,5%
```

Validação com julho (variação 20,00 %, valores sintéticos):
- liberação = 20,00 % × 200.000 = **R$ 40.000,00** ✔
- custo estimado = 20,00 % × 175.000,00 = **R$ 35.000,00** ✔
- caixa = 40.000,00 − 35.000,00 = **R$ 5.000,00** ✔
- acumulado = 100.000 + 40.000,00 = **R$ 140.000,00** ✔
- % recebido = 140.000,00 / 300.000 = **46,67 %** ✔
- E.V.O = 3.000,00 × 46,67 % = **R$ 1.400,00** ✔
- taxa = 1,5 % × 40.000,00 = **R$ 600,00** ✔
- soma = **R$ 2.000,00** ✔

A primeira linha do quadro é a **liberação do terreno** (no exemplo,
R$ 100.000,00), que entra no acumulado sem custo nem variação de obra associados.

`saldo de financiamento disponível` = total_financiado − liberação_acumulada.

## 6. Lacunas em relação ao sistema atual

A tabela `medicao` guarda hoje apenas `(versão, competência, grupo CEF, valor)` —
um valor medido por mês, sem percentuais. Para atender ao modelo acima serão
necessários (em migração **aditiva**, sem alterar os dados existentes):

- parâmetros por projeto: construção financiada, terreno financiado, CUB,
  metragem, parcela de referência, %BDI, tipo de executor;
- catálogo de **serviços** por projeto com custo proposto e limites mín./máx.;
- medição por **serviço × competência** com o **% executado acumulado**
  informado pelo usuário (a variação é derivada, nunca digitada).

Os registros de `medicao` já existentes continuam válidos e não devem ser
convertidos automaticamente — o novo modelo convive com o atual até que o
cliente valide a migração dos dados históricos.

## 7. Tipos de obra

O cliente pediu para diferenciar **construção individual** de **empreendimento**,
sem reaproveitar automaticamente a estrutura de um para o outro. O modelo acima
foi extraído de uma **construção individual financiada** (unidade única, CUB ×
metragem, financiamento Caixa). A estrutura para empreendimento **ainda não foi
especificada** e depende de confirmação do cliente.
