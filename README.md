# Lu Fashion Hair

Sistema privado para organizar a rotina profissional da Luciane.

## O que o sistema faz

- Login protegido para a profissional.
- Painel com resumo do dia e do mês.
- Agenda mensal com quantidade de atendimentos por dia.
- Filtros por agendado, confirmado, concluído, falta e cancelado.
- Alertas do dia para atrasos, próximo atendimento e confirmações pendentes.
- Cadastro e edição de agendamentos.
- Status: agendado, confirmado, em andamento, concluído, falta e cancelado.
- Cadastro e edição de clientes, telefone e observações.
- Atalho para confirmar horários pelo WhatsApp.
- Cadastro de serviços com nome, duração, valor e situação ativa/desativada.
- Catálogo inicial ampliado com serviços de cabelo, unhas, sobrancelhas e spa dos pés.
- Previsão mensal baseada nos valores dos serviços vinculados aos agendamentos.
- Uso em celular, tablet e computador.

## Estrutura

- `backend/`: API Node.js, autenticação e conexão PostgreSQL.
- `docs/`: versão publicada no GitHub Pages.
- `frontend/`: cópia do frontend para manutenção e futura migração.

Os arquivos de `docs/` e `frontend/` devem permanecer iguais.

## Publicação atual

- Site: `https://programwebsitew.github.io/Lufashionhair/`
- API: `https://agenda-luciane-api.onrender.com`
- No Render, `FRONTEND_URL` deve ser `https://programwebsitew.github.io`.

## Atualizar o sistema

Ao alterar o frontend, envie ao GitHub os arquivos modificados dentro de `docs/` e repita as mesmas alterações em `frontend/`.

Ao alterar o backend, envie os arquivos modificados dentro de `backend/`. O Render deve iniciar um novo deploy automaticamente após o envio ao GitHub.

Nunca envie um arquivo `.env`, senha, token, `DATABASE_URL` ou `JWT_SECRET` ao GitHub. O arquivo `.env.example` contém apenas exemplos e pode permanecer no repositório.

## Dados e cancelamento da assinatura

O código e a infraestrutura ficam sob controle do fornecedor do sistema. Os dados cadastrados pertencem à cliente.

Se a mensalidade ficar dois meses em atraso, o acesso poderá ser suspenso. A suspensão não deve apagar os dados imediatamente. Antes da exclusão definitiva, deve existir um prazo contratual para a cliente solicitar exportação dos próprios dados.

Sugestão de regra contratual: manter os dados por 90 dias após a suspensão, permitir uma exportação em CSV ou Excel durante esse prazo e excluir os dados depois, salvo obrigação legal de conservação.

## Limitações que precisam ser acompanhadas

- A hospedagem gratuita do backend pode adormecer após ficar sem uso, deixando o primeiro login mais lento.
- Banco gratuito não deve ser tratado como armazenamento permanente sem conferir prazo de validade e backups.
- GitHub Pages não é a hospedagem indicada para oferecer um SaaS comercial por tempo indeterminado.
- Antes de iniciar a cobrança comercial, migrar o frontend para hospedagem permitida para uso comercial e confirmar um banco permanente com backup.

## Testes antes de cada entrega

1. Abrir o site no celular e no computador.
2. Fazer login.
3. Criar e editar uma cliente de teste.
4. Criar e editar um serviço de teste.
5. Criar e editar um agendamento de teste.
6. Marcar como concluído e cancelado.
7. Testar o botão do WhatsApp.
8. Confirmar que o calendário troca de mês.
9. Conferir os dados após sair e entrar novamente.
10. Conferir os logs do Render e fazer backup do banco.
