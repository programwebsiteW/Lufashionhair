create index if not exists agendamentos_cliente_id_idx
  on public.agendamentos(cliente_id);

create index if not exists agendamentos_servico_id_idx
  on public.agendamentos(servico_id);

revoke execute on function public.formatar_nome(text) from public, anon;
revoke execute on function public.preparar_cliente() from public, anon;
revoke execute on function public.preparar_servico() from public, anon;
revoke execute on function public.preparar_agendamento() from public, anon;
revoke execute on function public.sincronizar_pagamento_agendamento() from public, anon;
revoke execute on function public.preparar_pagamento() from public, anon;
revoke execute on function public.refletir_cliente_agendamentos() from public, anon;
revoke execute on function public.refletir_servico_agendamentos() from public, anon;
