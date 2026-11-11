-- Gallery Delivered requires a gallery link. A check constraint (not the
-- trigger) so it also holds when only gallery_url is changed, e.g. cleared.
-- The https:// format is already checked by the column constraint.
alter table public.projects
  add constraint projects_gallery_delivered_needs_url
  check (status <> 'gallery_delivered' or gallery_url is not null);

-- Status rule: a new project starts as inquiry; afterwards the status may move
-- only one step forward or back in the enum order
-- (inquiry, consultation, retainer_paid, awaiting_event, gallery_delivered).
-- Empty search_path: every name is schema-qualified (pg_catalog is always searched).
create function public.projects_check_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- Position of a status in the enum: inquiry = 1 ... gallery_delivered = 5.
  old_pos int;
  new_pos int;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'inquiry' then
      raise exception 'a new project must start with status inquiry'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- UPDATE: no status change (e.g. only location edited) is always fine.
  if new.status = old.status then
    return new;
  end if;

  old_pos := array_position(enum_range(null::public.project_status), old.status);
  new_pos := array_position(enum_range(null::public.project_status), new.status);

  if abs(new_pos - old_pos) <> 1 then
    raise exception 'status can only move one step forward or back'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- "update of status": the trigger fires only when an UPDATE names the status
-- column, so edits of other fields skip it entirely.
create trigger projects_status_transition
  before insert or update of status on public.projects
  for each row
  execute function public.projects_check_status_transition();
