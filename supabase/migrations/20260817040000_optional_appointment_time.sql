alter table public.agendamentos alter column hora drop not null;

create or replace function public.preparar_agendamento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  inicio_novo timestamp;
  fim_novo timestamp;
begin
  if new.cliente_id is not null then
    select c.nome into new.cliente_nome
    from public.clientes c
    where c.id = new.cliente_id and c.owner_id = new.owner_id;
  else
    new.cliente_nome := public.formatar_nome(new.cliente_nome);
  end if;

  if new.servico_id is not null and (tg_op = 'INSERT' or new.servico_id is distinct from old.servico_id) then
    select s.nome, s.duracao_minutos, s.preco
      into new.servico_nome, new.duracao_minutos, new.valor_servico
    from public.servicos s
    where s.id = new.servico_id and s.owner_id = new.owner_id;
  end if;

  new.updated_at := now();

  if new.hora is not null and new.status not in ('cancelado','faltou') then
    inicio_novo := new.data + new.hora;
    fim_novo := inicio_novo + make_interval(mins => new.duracao_minutos);
    if exists (
      select 1
      from public.agendamentos a
      where a.owner_id = new.owner_id
        and a.id <> coalesce(new.id, 0)
        and a.hora is not null
        and a.status not in ('cancelado','faltou')
        and tsrange(a.data + a.hora, a.data + a.hora + make_interval(mins => a.duracao_minutos), '[)')
            && tsrange(inicio_novo, fim_novo, '[)')
    ) then
      raise exception 'Esse horario conflita com outro atendimento. Escolha outro horario.';
    end if;
  end if;
  return new;
end;
$$;
