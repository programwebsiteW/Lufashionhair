alter table public.despesas
  drop constraint if exists despesas_valor_check,
  add constraint despesas_valor_check check (valor >= 0);
