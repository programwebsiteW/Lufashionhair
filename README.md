# Lu Fashion Hair

Sistema privado para organizar o dia da Luciane. A versão publicada usa a interface da pasta `docs/` e um projeto Supabase exclusivo.

## O que está funcionando

- Login administrativo protegido.
- Painel com resumo do dia, próximos atendimentos e pagamentos.
- Agenda mensal conectada a clientes, serviços e pagamentos.
- Cadastro de clientes com nomes corrigidos automaticamente.
- Lixeira de clientes com restauração e exclusão automática após 3 dias.
- Serviços com preço em reais, duração em formato fácil e exclusão definitiva.
- Pagamentos, despesas, saldo e formas de pagamento.
- Resumos mensais com atendimentos, faturamento, despesas, faltas e rankings.
- Botões de WhatsApp e atalhos para criar agendamentos.
- Banco protegido por autenticação e políticas RLS.

## Dados e segurança

- Clientes, serviços, agenda, pagamentos e despesas ficam no Supabase.
- Cada registro pertence ao usuário autenticado.
- O navegador usa somente a chave pública do Supabase.
- Senhas e chaves secretas não ficam no GitHub.
- A limpeza diária da lixeira é executada pelo banco, mesmo sem o site aberto.

## Estrutura

- `docs/`: site usado pela Vercel.
- `supabase/migrations/`: histórico das mudanças do banco.
- `scripts/build-static.mjs`: verificação/geração estática local.
- `frontend/` e `backend/`: versões antigas mantidas apenas como histórico; não são usadas na publicação atual.

## Conferência antes de cada entrega

1. Testar login e saída.
2. Criar, editar, excluir e restaurar uma cliente de teste.
3. Criar, editar e excluir um serviço de teste.
4. Criar um agendamento escolhendo cliente, serviço, dia e hora.
5. Alterar status e registrar pagamento.
6. Conferir Financeiro, Resumos e Lixeira.
7. Sair, entrar novamente e confirmar que os dados continuam salvos.
8. Conferir o site publicado, logs, RLS e backups.
