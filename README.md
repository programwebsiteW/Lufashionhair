# Lu Fashion Hair

Sistema privado para organizar clientes, serviços e agendamentos da Luciane.

## Estrutura atual

- Site estático publicado na Vercel.
- Banco e autenticação no projeto Supabase exclusivo `lu-fashion-hair`.
- Região do banco: São Paulo (`sa-east-1`).
- Tabelas protegidas por Row Level Security (RLS).
- Cada registro pertence ao usuário autenticado.
- A chave presente no navegador é pública/publishable e não permite ignorar as políticas do banco.
- Nenhuma chave secreta ou `service_role` fica no frontend.

O backend antigo em `backend/` foi mantido temporariamente apenas como histórico e apoio à migração do Render. O aplicativo novo não depende dele.

## Funcionalidades

- Login protegido.
- Painel com resumo do dia e previsão mensal.
- Agenda mensal e filtros de status.
- Alertas de atraso, próximo atendimento e confirmações pendentes.
- Cadastro e edição de clientes.
- Exclusão lógica de clientes para evitar perda acidental.
- Cadastro de serviços, preços e duração.
- Modelos de serviços de cabelo, unhas, sobrancelhas e spa dos pés.
- Status agendado, confirmado, em andamento, concluído, falta e cancelado.
- Confirmação pelo WhatsApp.
- Interface adaptada para celular e computador.

## Pastas importantes

- `docs/`: versão principal do site.
- `frontend/`: cópia da interface para manutenção.
- `supabase/schema.sql`: estrutura documentada do banco e políticas de segurança.
- `scripts/build-static.mjs`: prepara apenas os arquivos públicos na pasta `dist/`.
- `backend/`: servidor antigo do Render, fora do fluxo novo.

Os arquivos de `docs/` e `frontend/` devem permanecer iguais.

## Publicação

A Vercel executa:

```text
npm run build
```

O resultado público fica em `dist/`. A pasta é gerada automaticamente e não deve ser enviada ao GitHub.

## Segurança e dados

- Não enviar `.env`, senhas, tokens ou chaves secretas ao GitHub.
- O código e a infraestrutura permanecem sob controle do fornecedor.
- Os dados cadastrados pertencem à cliente.
- Sugestão contratual: suspender o acesso depois de dois meses sem pagamento, manter os dados por 90 dias para regularização ou exportação e depois excluir, salvo obrigação legal.
- Fazer exportação e teste de restauração antes de mudanças importantes.

## Testes antes de uma entrega

1. Abrir no celular e computador.
2. Fazer login e sair.
3. Criar e editar uma cliente de teste.
4. Criar e editar um serviço de teste.
5. Criar e editar um agendamento de teste.
6. Alterar todos os status.
7. Conferir o calendário mensal e seus filtros.
8. Testar o WhatsApp.
9. Confirmar que os dados permanecem após sair e entrar.
10. Conferir políticas RLS, logs e backup.
