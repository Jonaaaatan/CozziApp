begin;

do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipe_ingredients'
      and column_name = 'ingredient_id'
  ) then
    alter table public.recipe_ingredients add column if not exists name text;
    alter table public.recipe_ingredients add column if not exists allergen text;
    alter table public.recipe_ingredients add column if not exists substitutable boolean not null default false;
    alter table public.recipe_ingredients add column if not exists substitute text;

    update public.recipe_ingredients as recipe_ingredient
    set name = ingredient.name,
        allergen = ingredient.allergen,
        substitutable = lower(ingredient.substitutable::text) in ('true', 't', '1', 'yes'),
        substitute = ingredient.substitute
    from public.ingredients as ingredient
    where ingredient.id = recipe_ingredient.ingredient_id;

    alter table public.recipe_ingredients alter column name set not null;
    alter table public.recipe_ingredients drop constraint if exists recipe_ingredients_pkey;
    alter table public.recipe_ingredients drop column ingredient_id;
    alter table public.recipe_ingredients
      add constraint recipe_ingredients_pkey primary key (recipe_id, position);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shopping_list_items'
      and column_name = 'ingredient_id'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'shopping_list_items'
        and column_name = 'id'
        and data_type = 'text'
    ) then
      alter table public.shopping_list_items
        alter column id set default gen_random_uuid()::text;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'shopping_list_items'
        and column_name = 'done'
        and data_type in ('smallint', 'integer', 'bigint')
    ) then
      alter table public.shopping_list_items
        alter column done type boolean using (done <> 0);
    end if;

    alter table public.shopping_list_items drop column ingredient_id;
  end if;
end
$migration$;

insert into public.recipes (id, owner_id, title, category, time, difficulty, servings, steps, timers, tips)
values
  ('chilaquiles-rojos', null, 'Chilaquiles rojos', 'Desayuno', 25, 'Fácil', 2, '["Hierve los jitomates con los chiles guajillo durante 10 minutos.","Licúa los jitomates y los chiles con un poco del agua de cocción y sal.","Calienta la salsa en un sartén a fuego medio durante 5 minutos.","Agrega los totopos y mezcla hasta que se bañen bien.","Sirve con queso, crema y cebolla en rodajas."]'::jsonb, '{"1":600,"3":300}'::jsonb, '{"1":"Los jitomates están listos cuando la piel se abre y se ven suaves.","4":"No los dejes mucho tiempo en la salsa o se ablandan demasiado."}'::jsonb),
  ('hotcakes', null, 'Hotcakes esponjosos', 'Desayuno', 20, 'Fácil', 4, '["Mezcla la harina, el azúcar, el polvo para hornear y una pizca de sal.","Bate los huevos con la leche y la mantequilla derretida.","Une las dos mezclas sin batir de más; deben quedar grumos pequeños.","Deja reposar la masa 5 minutos.","Cocina cada hotcake en un sartén caliente hasta que salgan burbujas, voltea y dora 2 minutos más."]'::jsonb, '{"4":300}'::jsonb, '{"3":"Si bates mucho la masa los hotcakes quedan duros.","5":"Voltea cuando las burbujas de la superficie empiecen a reventar."}'::jsonb),
  ('huevos-rancheros', null, 'Huevos rancheros', 'Desayuno', 20, 'Fácil', 2, '["Licúa los jitomates con el chile serrano, la cebolla y sal.","Cocina la salsa en un sartén con una cucharada de aceite durante 8 minutos.","Fríe las tortillas ligeramente en aceite y colócalas en el plato.","Fríe los huevos al gusto.","Coloca un huevo sobre cada tortilla y báñalos con la salsa."]'::jsonb, '{"2":480}'::jsonb, '{"2":"La salsa debe cambiar de color a un rojo más oscuro y espesar un poco."}'::jsonb),
  ('pizza-3-quesos', null, 'Pizza 3 quesos', 'Comida', 30, 'Fácil', 4, '["Precalienta el horno a 220 °C y extiende la masa.","Unta la salsa de tomate y cubre con los quesos.","Hornea 15 minutos."]'::jsonb, '{"3":900}'::jsonb, '{"3":"Está lista cuando el queso burbujea y los bordes están dorados."}'::jsonb),
  ('arroz-con-pollo', null, 'Arroz con pollo', 'Comida', 30, 'Fácil', 4, '["Sazona y sella el pollo.","Sofríe el tomate.","Agrega la cebolla picada y cocina durante cinco minutos.","Añade el arroz.","Incorpora el caldo.","Cocina tapado 15 minutos.","Reposa 5 minutos.","Sirve caliente."]'::jsonb, '{"3":300,"6":900,"7":300}'::jsonb, '{"3":"La cebolla debe verse transparente y ligeramente dorada.","6":"No destapes la olla: el vapor es el que cuece el arroz."}'::jsonb),
  ('sopa-de-tomate', null, 'Sopa de tomate', 'Comida', 25, 'Fácil', 2, '["Acitrona la cebolla y el ajo picados en una olla con un poco de aceite.","Agrega los jitomates en cuartos y cocina 5 minutos.","Añade el caldo y cocina a fuego bajo durante 15 minutos.","Licúa la mezcla hasta que quede tersa.","Regresa a la olla, agrega la crema y sirve caliente."]'::jsonb, '{"2":300,"3":900}'::jsonb, '{"1":"Acitronar es cocinar hasta que se vea transparente, sin dorar."}'::jsonb),
  ('tacos-dorados', null, 'Tacos dorados', 'Comida', 40, 'Media', 4, '["Deshebra el pollo y sazónalo con sal.","Calienta las tortillas para que no se rompan al enrollar.","Rellena cada tortilla con pollo y enróllala; asegura con un palillo.","Calienta el aceite a fuego medio-alto.","Fríe los tacos 3 minutos por lado hasta que estén dorados.","Escurre sobre papel absorbente y sirve con lechuga, crema y queso."]'::jsonb, '{"5":360}'::jsonb, '{"4":"El aceite está listo si al meter un pedazo de tortilla burbujea de inmediato.","5":"Deben verse dorados y crujientes, no oscuros."}'::jsonb),
  ('espagueti-bolognesa', null, 'Espagueti a la boloñesa', 'Comida', 40, 'Media', 4, '["Sofríe la cebolla y el ajo picados durante 3 minutos.","Agrega la carne molida y cocina hasta que se dore.","Licúa los jitomates, agrégalos a la carne y cocina a fuego bajo durante 20 minutos.","Mientras tanto, hierve agua con sal y cuece el espagueti durante 10 minutos.","Escurre la pasta, mézclala con la salsa y sirve con queso parmesano."]'::jsonb, '{"1":180,"3":1200,"4":600}'::jsonb, '{"2":"Desmenuza la carne con la cuchara para que no queden bolas grandes.","4":"Debe estar al dente: firme al morder pero sin centro crudo."}'::jsonb),
  ('enchiladas-verdes', null, 'Enchiladas verdes', 'Comida', 45, 'Media', 4, '["Hierve los tomates verdes y los chiles serranos durante 10 minutos.","Licúa con ajo, cilantro y sal para hacer la salsa.","Cocina la salsa en un sartén durante 8 minutos.","Pasa cada tortilla por la salsa, rellénala con pollo y enróllala.","Acomoda las enchiladas en un platón y báñalas con más salsa.","Termina con crema y queso fresco."]'::jsonb, '{"1":600,"3":480}'::jsonb, '{"1":"Los tomates cambian de verde brillante a verde olivo cuando están cocidos."}'::jsonb),
  ('caldo-de-pollo', null, 'Caldo de pollo', 'Comida', 60, 'Fácil', 6, '["Coloca el pollo, la cebolla y 2 litros de agua en una olla grande.","Cuando hierva, retira la espuma de la superficie.","Cocina a fuego bajo y tapado durante 30 minutos.","Agrega las zanahorias y las papas en cubos y cocina 15 minutos.","Añade las calabazas y el cilantro y cocina 10 minutos más.","Prueba la sal y sirve bien caliente con limón."]'::jsonb, '{"3":1800,"4":900,"5":600}'::jsonb, '{"2":"La espuma gris es grasa y proteína; quitarla deja el caldo más claro.","4":"Las verduras están listas cuando un tenedor las atraviesa sin esfuerzo."}'::jsonb),
  ('quesadillas', null, 'Quesadillas de queso', 'Cena', 15, 'Fácil', 2, '["Calienta un comal o sartén a fuego medio.","Coloca una tortilla y reparte el queso sobre la mitad.","Dobla la tortilla y cocina 2 minutos por lado hasta que el queso se derrita.","Sirve con salsa verde."]'::jsonb, '{"3":240}'::jsonb, '{"3":"Si el queso no se derrite, baja el fuego y tapa un minuto."}'::jsonb),
  ('ensalada-cesar', null, 'Ensalada César', 'Cena', 20, 'Fácil', 2, '["Sazona la pechuga con sal y pimienta.","Cocina la pechuga en un sartén 6 minutos por lado.","Deja reposar el pollo 5 minutos y córtalo en tiras.","Lava y trocea la lechuga y mézclala con el aderezo.","Agrega el pollo, los crutones y el queso parmesano."]'::jsonb, '{"2":360,"3":300}'::jsonb, '{"2":"El pollo está listo cuando por dentro ya no está rosado y los jugos salen claros."}'::jsonb),
  ('tarta-vasca', null, 'Tarta Vasca', 'Postre', 45, 'Media', 8, '["Precalienta el horno a 200 °C.","Mezcla el queso crema con el azúcar.","Agrega los huevos uno a uno.","Incorpora la crema y vierte en el molde forrado.","Hornea a 200 °C durante 40 minutos.","Enfría completamente antes de desmoldar."]'::jsonb, '{"5":2400}'::jsonb, '{"5":"Debe quedar muy dorada arriba y temblar en el centro; se firma al enfriar."}'::jsonb),
  ('flan-napolitano', null, 'Flan napolitano', 'Postre', 75, 'Media', 8, '["Derrite el azúcar en un sartén hasta obtener un caramelo dorado y vacíalo en el molde.","Licúa las leches, los huevos y el queso crema hasta que no haya grumos.","Vierte la mezcla sobre el caramelo y tapa el molde con papel aluminio.","Hornea a baño María a 180 °C durante 60 minutos.","Deja enfriar y refrigera mínimo 4 horas antes de desmoldar."]'::jsonb, '{"4":3600}'::jsonb, '{"1":"Retira el caramelo del fuego cuando tenga color ámbar; si se oscurece amarga.","4":"Está listo si al insertar un palillo sale limpio."}'::jsonb),
  ('brownies', null, 'Brownies de chocolate', 'Postre', 40, 'Fácil', 9, '["Precalienta el horno a 180 °C y engrasa un molde cuadrado.","Derrite el chocolate con la mantequilla a baño María y deja templar.","Bate los huevos con el azúcar e incorpora el chocolate.","Agrega la harina y las nueces con movimientos envolventes.","Vierte en el molde y hornea durante 25 minutos.","Deja enfriar 10 minutos antes de cortar."]'::jsonb, '{"5":1500,"6":600}'::jsonb, '{"5":"Un palillo debe salir con migas húmedas, no limpio: así quedan jugosos."}'::jsonb),
  ('arroz-con-leche', null, 'Arroz con leche', 'Postre', 50, 'Fácil', 6, '["Hierve el arroz con 2 tazas de agua y la canela durante 15 minutos.","Agrega la leche y el azúcar y cocina a fuego bajo durante 25 minutos, moviendo seguido.","Añade la leche condensada y cocina 5 minutos más.","Retira la canela y sirve tibio o frío con canela en polvo."]'::jsonb, '{"1":900,"2":1500,"3":300}'::jsonb, '{"2":"Mueve con frecuencia para que no se pegue; espesa más al enfriar."}'::jsonb),
  ('galletas-chispas', null, 'Galletas con chispas de chocolate', 'Postre', 30, 'Fácil', 12, '["Precalienta el horno a 180 °C.","Acrema la mantequilla con el azúcar y agrega el huevo.","Incorpora la harina y las chispas de chocolate.","Forma bolitas y colócalas separadas en una charola.","Hornea durante 12 minutos y deja enfriar en la charola."]'::jsonb, '{"5":720}'::jsonb, '{"5":"Los bordes deben verse dorados y el centro aún suave; se terminan de cocinar al enfriar."}'::jsonb)
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, name, quantity, allergen, substitutable, substitute, position)
values
  ('chilaquiles-rojos', 'Totopos', '200 g', null, false, null, 0),
  ('chilaquiles-rojos', 'Jitomate', '3', null, false, null, 1),
  ('chilaquiles-rojos', 'Chile guajillo', '2', null, false, null, 2),
  ('chilaquiles-rojos', 'Queso fresco', '100 g', 'lácteos', true, 'queso vegano o aguacate', 3),
  ('chilaquiles-rojos', 'Crema', '4 cucharadas', 'lácteos', true, 'yogur natural sin azúcar', 4),
  ('chilaquiles-rojos', 'Cebolla', '1/2', null, false, null, 5),
  ('hotcakes', 'Harina', '2 tazas', 'gluten', false, null, 0),
  ('hotcakes', 'Leche', '1 1/2 tazas', 'lácteos', true, 'bebida de avena o de almendra', 1),
  ('hotcakes', 'Huevos', '2', 'huevo', false, null, 2),
  ('hotcakes', 'Azúcar', '3 cucharadas', null, false, null, 3),
  ('hotcakes', 'Polvo para hornear', '2 cucharaditas', null, false, null, 4),
  ('hotcakes', 'Mantequilla', '2 cucharadas', 'lácteos', true, 'aceite en la misma cantidad', 5),
  ('huevos-rancheros', 'Huevos', '4', 'huevo', false, null, 0),
  ('huevos-rancheros', 'Tortillas de maíz', '4', null, false, null, 1),
  ('huevos-rancheros', 'Jitomate', '3', null, false, null, 2),
  ('huevos-rancheros', 'Chile serrano', '1', null, false, null, 3),
  ('huevos-rancheros', 'Cebolla', '1/4', null, false, null, 4),
  ('huevos-rancheros', 'Aceite', '3 cucharadas', null, false, null, 5),
  ('pizza-3-quesos', 'Masa de pizza', '1', 'gluten', false, null, 0),
  ('pizza-3-quesos', 'Queso mozzarella', '200 g', 'lácteos', false, null, 1),
  ('pizza-3-quesos', 'Queso parmesano', '50 g', 'lácteos', false, null, 2),
  ('pizza-3-quesos', 'Queso gouda', '100 g', 'lácteos', false, null, 3),
  ('pizza-3-quesos', 'Salsa de tomate', '1/2 taza', null, false, null, 4),
  ('arroz-con-pollo', 'Pollo', '500 g', null, false, null, 0),
  ('arroz-con-pollo', 'Arroz', '2 tazas', null, true, 'quinoa o cuscús', 1),
  ('arroz-con-pollo', 'Queso', '200 g', 'lácteos', false, null, 2),
  ('arroz-con-pollo', 'Jitomate', '2', null, false, null, 3),
  ('arroz-con-pollo', 'Cebolla', '1', null, false, null, 4),
  ('arroz-con-pollo', 'Caldo de pollo', '4 tazas', null, false, null, 5),
  ('sopa-de-tomate', 'Jitomate', '6', null, false, null, 0),
  ('sopa-de-tomate', 'Cebolla', '1/2', null, false, null, 1),
  ('sopa-de-tomate', 'Ajo', '2 dientes', null, false, null, 2),
  ('sopa-de-tomate', 'Caldo de verduras', '2 tazas', null, false, null, 3),
  ('sopa-de-tomate', 'Crema', '2 cucharadas', 'lácteos', true, 'leche de coco', 4),
  ('tacos-dorados', 'Tortillas de maíz', '12', null, false, null, 0),
  ('tacos-dorados', 'Pechuga de pollo cocida', '300 g', null, false, null, 1),
  ('tacos-dorados', 'Aceite', '1 taza', null, false, null, 2),
  ('tacos-dorados', 'Lechuga', '1/2', null, false, null, 3),
  ('tacos-dorados', 'Crema', '4 cucharadas', 'lácteos', true, 'aguacate machacado', 4),
  ('tacos-dorados', 'Queso fresco', '100 g', 'lácteos', false, null, 5),
  ('espagueti-bolognesa', 'Espagueti', '400 g', 'gluten', true, 'pasta sin gluten', 0),
  ('espagueti-bolognesa', 'Carne molida de res', '400 g', null, false, null, 1),
  ('espagueti-bolognesa', 'Jitomate', '4', null, false, null, 2),
  ('espagueti-bolognesa', 'Cebolla', '1', null, false, null, 3),
  ('espagueti-bolognesa', 'Ajo', '2 dientes', null, false, null, 4),
  ('espagueti-bolognesa', 'Queso parmesano', '50 g', 'lácteos', false, null, 5),
  ('enchiladas-verdes', 'Tortillas de maíz', '12', null, false, null, 0),
  ('enchiladas-verdes', 'Pechuga de pollo cocida', '300 g', null, false, null, 1),
  ('enchiladas-verdes', 'Tomate verde', '500 g', null, false, null, 2),
  ('enchiladas-verdes', 'Chile serrano', '2', null, false, null, 3),
  ('enchiladas-verdes', 'Crema', '1/2 taza', 'lácteos', true, 'yogur natural sin azúcar', 4),
  ('enchiladas-verdes', 'Queso fresco', '150 g', 'lácteos', false, null, 5),
  ('caldo-de-pollo', 'Piezas de pollo', '1000 g', null, false, null, 0),
  ('caldo-de-pollo', 'Zanahoria', '3', null, false, null, 1),
  ('caldo-de-pollo', 'Papa', '3', null, false, null, 2),
  ('caldo-de-pollo', 'Calabaza', '2', null, false, null, 3),
  ('caldo-de-pollo', 'Cebolla', '1', null, false, null, 4),
  ('caldo-de-pollo', 'Cilantro', '1 manojo', null, false, null, 5),
  ('quesadillas', 'Tortillas de harina', '4', 'gluten', true, 'tortillas de maíz', 0),
  ('quesadillas', 'Queso Oaxaca', '200 g', 'lácteos', false, null, 1),
  ('quesadillas', 'Salsa verde', '1/2 taza', null, false, null, 2),
  ('ensalada-cesar', 'Lechuga romana', '1', null, false, null, 0),
  ('ensalada-cesar', 'Pechuga de pollo', '250 g', null, false, null, 1),
  ('ensalada-cesar', 'Crutones', '1 taza', 'gluten', false, null, 2),
  ('ensalada-cesar', 'Queso parmesano', '40 g', 'lácteos', false, null, 3),
  ('ensalada-cesar', 'Aderezo César', '4 cucharadas', 'huevo', false, null, 4),
  ('tarta-vasca', 'Queso crema', '600 g', 'lácteos', false, null, 0),
  ('tarta-vasca', 'Azúcar', '200 g', null, false, null, 1),
  ('tarta-vasca', 'Huevos', '5', 'huevo', false, null, 2),
  ('tarta-vasca', 'Crema para batir', '200 ml', 'lácteos', false, null, 3),
  ('flan-napolitano', 'Leche', '1 taza', 'lácteos', false, null, 0),
  ('flan-napolitano', 'Leche condensada', '1 lata', 'lácteos', false, null, 1),
  ('flan-napolitano', 'Leche evaporada', '1 lata', 'lácteos', false, null, 2),
  ('flan-napolitano', 'Huevos', '5', 'huevo', false, null, 3),
  ('flan-napolitano', 'Queso crema', '200 g', 'lácteos', false, null, 4),
  ('flan-napolitano', 'Azúcar para caramelo', '1 taza', null, false, null, 5),
  ('brownies', 'Chocolate amargo', '200 g', null, false, null, 0),
  ('brownies', 'Mantequilla', '150 g', 'lácteos', true, 'aceite de coco', 1),
  ('brownies', 'Azúcar', '150 g', null, false, null, 2),
  ('brownies', 'Huevos', '3', 'huevo', false, null, 3),
  ('brownies', 'Harina', '100 g', 'gluten', false, null, 4),
  ('brownies', 'Nueces', '80 g', 'nueces', true, 'chispas de chocolate', 5),
  ('arroz-con-leche', 'Arroz', '1 taza', null, false, null, 0),
  ('arroz-con-leche', 'Leche', '1 litro', 'lácteos', true, 'bebida de coco', 1),
  ('arroz-con-leche', 'Azúcar', '1/2 taza', null, false, null, 2),
  ('arroz-con-leche', 'Canela en rajas', '2', null, false, null, 3),
  ('arroz-con-leche', 'Leche condensada', '1/2 lata', 'lácteos', false, null, 4),
  ('galletas-chispas', 'Harina', '250 g', 'gluten', false, null, 0),
  ('galletas-chispas', 'Mantequilla', '125 g', 'lácteos', true, 'margarina vegetal', 1),
  ('galletas-chispas', 'Azúcar morena', '100 g', null, false, null, 2),
  ('galletas-chispas', 'Huevo', '1', 'huevo', false, null, 3),
  ('galletas-chispas', 'Chispas de chocolate', '150 g', null, false, null, 4)
on conflict (recipe_id, position) do nothing;

create or replace function public.save_user_recipe(recipe_data jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recipe_id text;
begin
  recipe_id := recipe_data ->> 'id';
  if nullif(btrim(recipe_id), '') is null then
    raise exception 'Recipe id is required';
  end if;

  insert into public.recipes (
    id, owner_id, title, category, time, difficulty, servings, steps, timers, tips
  )
  values (
    recipe_id,
    auth.uid(),
    btrim(recipe_data ->> 'title'),
    coalesce(nullif(recipe_data ->> 'category', ''), 'Otra'),
    coalesce(nullif(recipe_data ->> 'time', '')::integer, 0),
    coalesce(nullif(recipe_data ->> 'difficulty', ''), 'Fácil'),
    coalesce(nullif(recipe_data ->> 'servings', '')::integer, 1),
    coalesce(recipe_data -> 'steps', '[]'::jsonb),
    coalesce(recipe_data -> 'timers', '{}'::jsonb),
    coalesce(recipe_data -> 'tips', '{}'::jsonb)
  )
  on conflict (id) do update set
    title = excluded.title,
    category = excluded.category,
    time = excluded.time,
    difficulty = excluded.difficulty,
    servings = excluded.servings,
    steps = excluded.steps,
    timers = excluded.timers,
    tips = excluded.tips,
    updated_at = now()
  where public.recipes.owner_id = auth.uid();

  if not found then
    raise exception 'Recipe does not exist or is not owned by the current user'
      using errcode = '42501';
  end if;

  delete from public.recipe_ingredients
  where public.recipe_ingredients.recipe_id = recipe_id;

  insert into public.recipe_ingredients (
    recipe_id, name, quantity, allergen, substitutable, substitute, position
  )
  select
    recipe_id,
    btrim(item.ingredient ->> 'name'),
    coalesce(item.ingredient ->> 'qty', ''),
    nullif(item.ingredient ->> 'allergen', ''),
    coalesce((item.ingredient ->> 'substitutable')::boolean, false),
    nullif(item.ingredient ->> 'substitute', ''),
    (item.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(recipe_data -> 'ingredients', '[]'::jsonb))
    with ordinality as item(ingredient, ordinality)
  where nullif(btrim(item.ingredient ->> 'name'), '') is not null;
end;
$$;

revoke all on function public.save_user_recipe(jsonb) from public;
grant execute on function public.save_user_recipe(jsonb) to authenticated;

commit;
