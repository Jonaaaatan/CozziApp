// Recetas iniciales que se cargan en SQLite en el primer inicio.
//
// Formato de receta:
//  - ingredients: { name, qty, allergen?, substitutable?, substitute? }
//  - steps: lista de instrucciones
//  - timers: { [paso (1-based)]: segundos } -> temporizador que arranca solo al llegar al paso
//  - tips: { [paso (1-based)]: texto } -> respuesta a "¿cómo sé cuándo está listo?" / "explícame"
export const recipes = [
  // ───────────── Desayunos ─────────────
  {
    id: 'chilaquiles-rojos', title: 'Chilaquiles rojos', category: 'Desayuno', time: 25,
    difficulty: 'Fácil', servings: 2,
    ingredients: [
      { name: 'Totopos', qty: '200 g' },
      { name: 'Jitomate', qty: '3' },
      { name: 'Chile guajillo', qty: '2' },
      { name: 'Queso fresco', qty: '100 g', allergen: 'lácteos', substitutable: true, substitute: 'queso vegano o aguacate' },
      { name: 'Crema', qty: '4 cucharadas', allergen: 'lácteos', substitutable: true, substitute: 'yogur natural sin azúcar' },
      { name: 'Cebolla', qty: '1/2' },
    ],
    steps: [
      'Hierve los jitomates con los chiles guajillo durante 10 minutos.',
      'Licúa los jitomates y los chiles con un poco del agua de cocción y sal.',
      'Calienta la salsa en un sartén a fuego medio durante 5 minutos.',
      'Agrega los totopos y mezcla hasta que se bañen bien.',
      'Sirve con queso, crema y cebolla en rodajas.',
    ],
    timers: { 1: 600, 3: 300 },
    tips: { 1: 'Los jitomates están listos cuando la piel se abre y se ven suaves.', 4: 'No los dejes mucho tiempo en la salsa o se ablandan demasiado.' },
  },
  {
    id: 'hotcakes', title: 'Hotcakes esponjosos', category: 'Desayuno', time: 20,
    difficulty: 'Fácil', servings: 4,
    ingredients: [
      { name: 'Harina', qty: '2 tazas', allergen: 'gluten' },
      { name: 'Leche', qty: '1 1/2 tazas', allergen: 'lácteos', substitutable: true, substitute: 'bebida de avena o de almendra' },
      { name: 'Huevos', qty: '2', allergen: 'huevo' },
      { name: 'Azúcar', qty: '3 cucharadas' },
      { name: 'Polvo para hornear', qty: '2 cucharaditas' },
      { name: 'Mantequilla', qty: '2 cucharadas', allergen: 'lácteos', substitutable: true, substitute: 'aceite en la misma cantidad' },
    ],
    steps: [
      'Mezcla la harina, el azúcar, el polvo para hornear y una pizca de sal.',
      'Bate los huevos con la leche y la mantequilla derretida.',
      'Une las dos mezclas sin batir de más; deben quedar grumos pequeños.',
      'Deja reposar la masa 5 minutos.',
      'Cocina cada hotcake en un sartén caliente hasta que salgan burbujas, voltea y dora 2 minutos más.',
    ],
    timers: { 4: 300 },
    tips: { 3: 'Si bates mucho la masa los hotcakes quedan duros.', 5: 'Voltea cuando las burbujas de la superficie empiecen a reventar.' },
  },
  {
    id: 'huevos-rancheros', title: 'Huevos rancheros', category: 'Desayuno', time: 20,
    difficulty: 'Fácil', servings: 2,
    ingredients: [
      { name: 'Huevos', qty: '4', allergen: 'huevo' },
      { name: 'Tortillas de maíz', qty: '4' },
      { name: 'Jitomate', qty: '3' },
      { name: 'Chile serrano', qty: '1' },
      { name: 'Cebolla', qty: '1/4' },
      { name: 'Aceite', qty: '3 cucharadas' },
    ],
    steps: [
      'Licúa los jitomates con el chile serrano, la cebolla y sal.',
      'Cocina la salsa en un sartén con una cucharada de aceite durante 8 minutos.',
      'Fríe las tortillas ligeramente en aceite y colócalas en el plato.',
      'Fríe los huevos al gusto.',
      'Coloca un huevo sobre cada tortilla y báñalos con la salsa.',
    ],
    timers: { 2: 480 },
    tips: { 2: 'La salsa debe cambiar de color a un rojo más oscuro y espesar un poco.' },
  },

  // ───────────── Comidas ─────────────
  {
    id: 'pizza-3-quesos', title: 'Pizza 3 quesos', category: 'Comida', time: 30,
    difficulty: 'Fácil', servings: 4,
    ingredients: [
      { name: 'Masa de pizza', qty: '1', allergen: 'gluten' },
      { name: 'Queso mozzarella', qty: '200 g', allergen: 'lácteos' },
      { name: 'Queso parmesano', qty: '50 g', allergen: 'lácteos' },
      { name: 'Queso gouda', qty: '100 g', allergen: 'lácteos' },
      { name: 'Salsa de tomate', qty: '1/2 taza' },
    ],
    steps: ['Precalienta el horno a 220 °C y extiende la masa.', 'Unta la salsa de tomate y cubre con los quesos.', 'Hornea 15 minutos.'],
    timers: { 3: 900 },
    tips: { 3: 'Está lista cuando el queso burbujea y los bordes están dorados.' },
  },
  {
    id: 'arroz-con-pollo', title: 'Arroz con pollo', category: 'Comida', time: 30,
    difficulty: 'Fácil', servings: 4,
    ingredients: [
      { name: 'Pollo', qty: '500 g' },
      { name: 'Arroz', qty: '2 tazas', substitutable: true, substitute: 'quinoa o cuscús' },
      { name: 'Queso', qty: '200 g', allergen: 'lácteos' },
      { name: 'Jitomate', qty: '2' },
      { name: 'Cebolla', qty: '1' },
      { name: 'Caldo de pollo', qty: '4 tazas' },
    ],
    steps: [
      'Sazona y sella el pollo.', 'Sofríe el tomate.',
      'Agrega la cebolla picada y cocina durante cinco minutos.',
      'Añade el arroz.', 'Incorpora el caldo.', 'Cocina tapado 15 minutos.',
      'Reposa 5 minutos.', 'Sirve caliente.',
    ],
    timers: { 3: 300, 6: 900, 7: 300 }, // paso (1-based) -> segundos
    tips: { 3: 'La cebolla debe verse transparente y ligeramente dorada.', 6: 'No destapes la olla: el vapor es el que cuece el arroz.' },
  },
  {
    id: 'sopa-de-tomate', title: 'Sopa de tomate', category: 'Comida', time: 25,
    difficulty: 'Fácil', servings: 2,
    ingredients: [
      { name: 'Jitomate', qty: '6' },
      { name: 'Cebolla', qty: '1/2' },
      { name: 'Ajo', qty: '2 dientes' },
      { name: 'Caldo de verduras', qty: '2 tazas' },
      { name: 'Crema', qty: '2 cucharadas', allergen: 'lácteos', substitutable: true, substitute: 'leche de coco' },
    ],
    steps: [
      'Acitrona la cebolla y el ajo picados en una olla con un poco de aceite.',
      'Agrega los jitomates en cuartos y cocina 5 minutos.',
      'Añade el caldo y cocina a fuego bajo durante 15 minutos.',
      'Licúa la mezcla hasta que quede tersa.',
      'Regresa a la olla, agrega la crema y sirve caliente.',
    ],
    timers: { 2: 300, 3: 900 },
    tips: { 1: 'Acitronar es cocinar hasta que se vea transparente, sin dorar.' },
  },
  {
    id: 'tacos-dorados', title: 'Tacos dorados', category: 'Comida', time: 40,
    difficulty: 'Media', servings: 4,
    ingredients: [
      { name: 'Tortillas de maíz', qty: '12' },
      { name: 'Pechuga de pollo cocida', qty: '300 g' },
      { name: 'Aceite', qty: '1 taza' },
      { name: 'Lechuga', qty: '1/2' },
      { name: 'Crema', qty: '4 cucharadas', allergen: 'lácteos', substitutable: true, substitute: 'aguacate machacado' },
      { name: 'Queso fresco', qty: '100 g', allergen: 'lácteos' },
    ],
    steps: [
      'Deshebra el pollo y sazónalo con sal.',
      'Calienta las tortillas para que no se rompan al enrollar.',
      'Rellena cada tortilla con pollo y enróllala; asegura con un palillo.',
      'Calienta el aceite a fuego medio-alto.',
      'Fríe los tacos 3 minutos por lado hasta que estén dorados.',
      'Escurre sobre papel absorbente y sirve con lechuga, crema y queso.',
    ],
    timers: { 5: 360 },
    tips: { 4: 'El aceite está listo si al meter un pedazo de tortilla burbujea de inmediato.', 5: 'Deben verse dorados y crujientes, no oscuros.' },
  },
  {
    id: 'espagueti-bolognesa', title: 'Espagueti a la boloñesa', category: 'Comida', time: 40,
    difficulty: 'Media', servings: 4,
    ingredients: [
      { name: 'Espagueti', qty: '400 g', allergen: 'gluten', substitutable: true, substitute: 'pasta sin gluten' },
      { name: 'Carne molida de res', qty: '400 g' },
      { name: 'Jitomate', qty: '4' },
      { name: 'Cebolla', qty: '1' },
      { name: 'Ajo', qty: '2 dientes' },
      { name: 'Queso parmesano', qty: '50 g', allergen: 'lácteos' },
    ],
    steps: [
      'Sofríe la cebolla y el ajo picados durante 3 minutos.',
      'Agrega la carne molida y cocina hasta que se dore.',
      'Licúa los jitomates, agrégalos a la carne y cocina a fuego bajo durante 20 minutos.',
      'Mientras tanto, hierve agua con sal y cuece el espagueti durante 10 minutos.',
      'Escurre la pasta, mézclala con la salsa y sirve con queso parmesano.',
    ],
    timers: { 1: 180, 3: 1200, 4: 600 },
    tips: { 2: 'Desmenuza la carne con la cuchara para que no queden bolas grandes.', 4: 'Debe estar al dente: firme al morder pero sin centro crudo.' },
  },
  {
    id: 'enchiladas-verdes', title: 'Enchiladas verdes', category: 'Comida', time: 45,
    difficulty: 'Media', servings: 4,
    ingredients: [
      { name: 'Tortillas de maíz', qty: '12' },
      { name: 'Pechuga de pollo cocida', qty: '300 g' },
      { name: 'Tomate verde', qty: '500 g' },
      { name: 'Chile serrano', qty: '2' },
      { name: 'Crema', qty: '1/2 taza', allergen: 'lácteos', substitutable: true, substitute: 'yogur natural sin azúcar' },
      { name: 'Queso fresco', qty: '150 g', allergen: 'lácteos' },
    ],
    steps: [
      'Hierve los tomates verdes y los chiles serranos durante 10 minutos.',
      'Licúa con ajo, cilantro y sal para hacer la salsa.',
      'Cocina la salsa en un sartén durante 8 minutos.',
      'Pasa cada tortilla por la salsa, rellénala con pollo y enróllala.',
      'Acomoda las enchiladas en un platón y báñalas con más salsa.',
      'Termina con crema y queso fresco.',
    ],
    timers: { 1: 600, 3: 480 },
    tips: { 1: 'Los tomates cambian de verde brillante a verde olivo cuando están cocidos.' },
  },
  {
    id: 'caldo-de-pollo', title: 'Caldo de pollo', category: 'Comida', time: 60,
    difficulty: 'Fácil', servings: 6,
    ingredients: [
      { name: 'Piezas de pollo', qty: '1000 g' },
      { name: 'Zanahoria', qty: '3' },
      { name: 'Papa', qty: '3' },
      { name: 'Calabaza', qty: '2' },
      { name: 'Cebolla', qty: '1' },
      { name: 'Cilantro', qty: '1 manojo' },
    ],
    steps: [
      'Coloca el pollo, la cebolla y 2 litros de agua en una olla grande.',
      'Cuando hierva, retira la espuma de la superficie.',
      'Cocina a fuego bajo y tapado durante 30 minutos.',
      'Agrega las zanahorias y las papas en cubos y cocina 15 minutos.',
      'Añade las calabazas y el cilantro y cocina 10 minutos más.',
      'Prueba la sal y sirve bien caliente con limón.',
    ],
    timers: { 3: 1800, 4: 900, 5: 600 },
    tips: { 2: 'La espuma gris es grasa y proteína; quitarla deja el caldo más claro.', 4: 'Las verduras están listas cuando un tenedor las atraviesa sin esfuerzo.' },
  },
  {
    id: 'quesadillas', title: 'Quesadillas de queso', category: 'Cena', time: 15,
    difficulty: 'Fácil', servings: 2,
    ingredients: [
      { name: 'Tortillas de harina', qty: '4', allergen: 'gluten', substitutable: true, substitute: 'tortillas de maíz' },
      { name: 'Queso Oaxaca', qty: '200 g', allergen: 'lácteos' },
      { name: 'Salsa verde', qty: '1/2 taza' },
    ],
    steps: [
      'Calienta un comal o sartén a fuego medio.',
      'Coloca una tortilla y reparte el queso sobre la mitad.',
      'Dobla la tortilla y cocina 2 minutos por lado hasta que el queso se derrita.',
      'Sirve con salsa verde.',
    ],
    timers: { 3: 240 },
    tips: { 3: 'Si el queso no se derrite, baja el fuego y tapa un minuto.' },
  },
  {
    id: 'ensalada-cesar', title: 'Ensalada César', category: 'Cena', time: 20,
    difficulty: 'Fácil', servings: 2,
    ingredients: [
      { name: 'Lechuga romana', qty: '1' },
      { name: 'Pechuga de pollo', qty: '250 g' },
      { name: 'Crutones', qty: '1 taza', allergen: 'gluten' },
      { name: 'Queso parmesano', qty: '40 g', allergen: 'lácteos' },
      { name: 'Aderezo César', qty: '4 cucharadas', allergen: 'huevo' },
    ],
    steps: [
      'Sazona la pechuga con sal y pimienta.',
      'Cocina la pechuga en un sartén 6 minutos por lado.',
      'Deja reposar el pollo 5 minutos y córtalo en tiras.',
      'Lava y trocea la lechuga y mézclala con el aderezo.',
      'Agrega el pollo, los crutones y el queso parmesano.',
    ],
    timers: { 2: 360, 3: 300 },
    tips: { 2: 'El pollo está listo cuando por dentro ya no está rosado y los jugos salen claros.' },
  },

  // ───────────── Postres ─────────────
  {
    id: 'tarta-vasca', title: 'Tarta Vasca', category: 'Postre', time: 45,
    difficulty: 'Media', servings: 8,
    ingredients: [
      { name: 'Queso crema', qty: '600 g', allergen: 'lácteos' },
      { name: 'Azúcar', qty: '200 g' },
      { name: 'Huevos', qty: '5', allergen: 'huevo' },
      { name: 'Crema para batir', qty: '200 ml', allergen: 'lácteos' },
    ],
    steps: ['Precalienta el horno a 200 °C.', 'Mezcla el queso crema con el azúcar.', 'Agrega los huevos uno a uno.', 'Incorpora la crema y vierte en el molde forrado.', 'Hornea a 200 °C durante 40 minutos.', 'Enfría completamente antes de desmoldar.'],
    timers: { 5: 2400 },
    tips: { 5: 'Debe quedar muy dorada arriba y temblar en el centro; se firma al enfriar.' },
  },
  {
    id: 'flan-napolitano', title: 'Flan napolitano', category: 'Postre', time: 75,
    difficulty: 'Media', servings: 8,
    ingredients: [
      { name: 'Leche', qty: '1 taza', allergen: 'lácteos' },
      { name: 'Leche condensada', qty: '1 lata', allergen: 'lácteos' },
      { name: 'Leche evaporada', qty: '1 lata', allergen: 'lácteos' },
      { name: 'Huevos', qty: '5', allergen: 'huevo' },
      { name: 'Queso crema', qty: '200 g', allergen: 'lácteos' },
      { name: 'Azúcar para caramelo', qty: '1 taza' },
    ],
    steps: [
      'Derrite el azúcar en un sartén hasta obtener un caramelo dorado y vacíalo en el molde.',
      'Licúa las leches, los huevos y el queso crema hasta que no haya grumos.',
      'Vierte la mezcla sobre el caramelo y tapa el molde con papel aluminio.',
      'Hornea a baño María a 180 °C durante 60 minutos.',
      'Deja enfriar y refrigera mínimo 4 horas antes de desmoldar.',
    ],
    timers: { 4: 3600 },
    tips: { 1: 'Retira el caramelo del fuego cuando tenga color ámbar; si se oscurece amarga.', 4: 'Está listo si al insertar un palillo sale limpio.' },
  },
  {
    id: 'brownies', title: 'Brownies de chocolate', category: 'Postre', time: 40,
    difficulty: 'Fácil', servings: 9,
    ingredients: [
      { name: 'Chocolate amargo', qty: '200 g' },
      { name: 'Mantequilla', qty: '150 g', allergen: 'lácteos', substitutable: true, substitute: 'aceite de coco' },
      { name: 'Azúcar', qty: '150 g' },
      { name: 'Huevos', qty: '3', allergen: 'huevo' },
      { name: 'Harina', qty: '100 g', allergen: 'gluten' },
      { name: 'Nueces', qty: '80 g', allergen: 'nueces', substitutable: true, substitute: 'chispas de chocolate' },
    ],
    steps: [
      'Precalienta el horno a 180 °C y engrasa un molde cuadrado.',
      'Derrite el chocolate con la mantequilla a baño María y deja templar.',
      'Bate los huevos con el azúcar e incorpora el chocolate.',
      'Agrega la harina y las nueces con movimientos envolventes.',
      'Vierte en el molde y hornea durante 25 minutos.',
      'Deja enfriar 10 minutos antes de cortar.',
    ],
    timers: { 5: 1500, 6: 600 },
    tips: { 5: 'Un palillo debe salir con migas húmedas, no limpio: así quedan jugosos.' },
  },
  {
    id: 'arroz-con-leche', title: 'Arroz con leche', category: 'Postre', time: 50,
    difficulty: 'Fácil', servings: 6,
    ingredients: [
      { name: 'Arroz', qty: '1 taza' },
      { name: 'Leche', qty: '1 litro', allergen: 'lácteos', substitutable: true, substitute: 'bebida de coco' },
      { name: 'Azúcar', qty: '1/2 taza' },
      { name: 'Canela en rajas', qty: '2' },
      { name: 'Leche condensada', qty: '1/2 lata', allergen: 'lácteos' },
    ],
    steps: [
      'Hierve el arroz con 2 tazas de agua y la canela durante 15 minutos.',
      'Agrega la leche y el azúcar y cocina a fuego bajo durante 25 minutos, moviendo seguido.',
      'Añade la leche condensada y cocina 5 minutos más.',
      'Retira la canela y sirve tibio o frío con canela en polvo.',
    ],
    timers: { 1: 900, 2: 1500, 3: 300 },
    tips: { 2: 'Mueve con frecuencia para que no se pegue; espesa más al enfriar.' },
  },
  {
    id: 'galletas-chispas', title: 'Galletas con chispas de chocolate', category: 'Postre', time: 30,
    difficulty: 'Fácil', servings: 12,
    ingredients: [
      { name: 'Harina', qty: '250 g', allergen: 'gluten' },
      { name: 'Mantequilla', qty: '125 g', allergen: 'lácteos', substitutable: true, substitute: 'margarina vegetal' },
      { name: 'Azúcar morena', qty: '100 g' },
      { name: 'Huevo', qty: '1', allergen: 'huevo' },
      { name: 'Chispas de chocolate', qty: '150 g' },
    ],
    steps: [
      'Precalienta el horno a 180 °C.',
      'Acrema la mantequilla con el azúcar y agrega el huevo.',
      'Incorpora la harina y las chispas de chocolate.',
      'Forma bolitas y colócalas separadas en una charola.',
      'Hornea durante 12 minutos y deja enfriar en la charola.',
    ],
    timers: { 5: 720 },
    tips: { 5: 'Los bordes deben verse dorados y el centro aún suave; se terminan de cocinar al enfriar.' },
  },
];

export const getRecipe = (id) => recipes.find((r) => r.id === id) ?? recipes[0];

export const searchFilters = ['Tiempo', 'Dificultad', 'Tipo', 'Alergias'];
export const allergyOptions = ['Gluten', 'Lácteos', 'Nueces', 'Huevo'];

// Valores por defecto de un usuario nuevo (nivel y logros se calculan del historial).
export const profile = {
  name: 'Chef',
  allergies: [],
  favorites: [],
  history: [], // [{ recipeId, title, category, date }]
};
