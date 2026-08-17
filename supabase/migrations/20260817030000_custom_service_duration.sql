alter table public.servicos
  drop constraint if exists servicos_duracao_minutos_check,
  add constraint servicos_duracao_minutos_check
    check (duracao_minutos between 1 and 1440);

alter table public.agendamentos
  drop constraint if exists agendamentos_duracao_minutos_check,
  add constraint agendamentos_duracao_minutos_check
    check (duracao_minutos between 1 and 1440);
