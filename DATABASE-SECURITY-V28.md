# Moto Tudo — preparação para banco de dados e segurança (v28)

## Estado atual
O app continua funcionando offline com cache local, mas todo acesso persistente deve passar por `MotoTudoData`. Isso permite substituir o armazenamento local por um adaptador remoto sem espalhar credenciais ou chamadas de banco pela interface.

## Contrato de entidades
- products
- movements
- suppliers
- orders
- store_settings
- credit_customers

## Regras obrigatórias quando o banco for conectado
1. Nunca colocar chave de administrador/service-role no navegador.
2. Todo usuário deve autenticar antes de ler ou alterar dados da loja.
3. Toda tabela deve ter autorização por loja/tenant e política de linha (RLS ou equivalente).
4. Escritas de estoque, baixa de venda e pagamento de fiado devem ocorrer em transação atômica no servidor/banco.
5. Valores financeiros e estoque devem ser validados no servidor; o cliente nunca é fonte de verdade.
6. Registrar auditoria de operações críticas: usuário, data, entidade, ação, antes/depois.
7. Preferir IDs UUID gerados no banco e timestamps do servidor.
8. Backups automáticos e teste periódico de restauração.
9. Rate limit em login e operações sensíveis.
10. Segredos somente no backend/secret manager.

## Migração
`MotoTudoData.snapshot()` gera o pacote atual para importação controlada. O cache local deve deixar de ser a fonte de verdade depois da migração.
