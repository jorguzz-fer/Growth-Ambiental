-- Prompt M, 6.2 — valores de "Status do contrato" em uso (somente leitura).
-- Rode no Postgres de produção e cole o resultado na conversa.
SELECT t.name AS empresa,
       coalesce(nullif(trim(c.status_contrato), ''), '(em branco)') AS status,
       count(*) AS clientes
FROM cliente c
JOIN tenant t ON t.id = c.tenant_id
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
