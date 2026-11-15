create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Chef',
  allergies text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key,
  owner_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  category text not null default 'Otra',
  time integer not null default 0 check (time >= 0),
  difficulty text not null default 'Fácil',
  servings integer not null default 1 check (servings > 0),
  steps jsonb not null default '[]'::jsonb,
  timers jsonb not null default '{}'::jsonb,
  tips jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  recipe_id text not null references public.recipes (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  allergen text,
  substitutable boolean not null default false,
  substitute text,
  position integer not null default 0,
  primary key (recipe_id, position)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id text not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.recipe_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id text references public.recipes (id) on delete set null,
  recipe_title text not null,
  category text not null default 'Otra',
  completed_at timestamptz not null default now(),
  progress numeric not null default 1 check (progress >= 0 and progress <= 1)
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id text references public.recipes (id) on delete set null,
  label text not null,
  category text not null default 'Otros',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, allergies)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Chef'),
    array(
      select jsonb_array_elements_text(
        coalesce(new.raw_user_meta_data -> 'allergies', '[]'::jsonb)
      )
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, name, allergies)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'name', ''), 'Chef'),
  array(
    select jsonb_array_elements_text(
      case
        when jsonb_typeof(users.raw_user_meta_data -> 'allergies') = 'array'
          then users.raw_user_meta_data -> 'allergies'
        else '[]'::jsonb
      end
    )
  )
from auth.users as users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.recipe_history enable row level security;
alter table public.shopping_list_items enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can read visible recipes" on public.recipes;
create policy "Users can read visible recipes"
  on public.recipes for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

drop policy if exists "Users can create their recipes" on public.recipes;
create policy "Users can create their recipes"
  on public.recipes for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their recipes" on public.recipes;
create policy "Users can update their recipes"
  on public.recipes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their recipes" on public.recipes;
create policy "Users can delete their recipes"
  on public.recipes for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users can read ingredients for visible recipes" on public.recipe_ingredients;
create policy "Users can read ingredients for visible recipes"
  on public.recipe_ingredients for select to authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and (recipes.owner_id is null or recipes.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "Users can manage ingredients for their recipes" on public.recipe_ingredients;
create policy "Users can manage ingredients for their recipes"
  on public.recipe_ingredients for all to authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.owner_id = (select auth.uid())
    )
  );

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, delete on public.recipe_history to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

drop policy if exists "Users can manage their favorites" on public.favorites;
create policy "Users can manage their favorites"
  on public.favorites for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage their recipe history" on public.recipe_history;
create policy "Users can manage their recipe history"
  on public.recipe_history for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage their shopping list" on public.shopping_list_items;
create policy "Users can manage their shopping list"
  on public.shopping_list_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
