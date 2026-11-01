# Cozzi — App (React Native / Expo)

Asistente culinario inteligente controlado por voz. Proyecto de Frameworks y
Arquitectura de Software (UAQ), Equipo Chimichanga: Jahir, Jonatan y Shadday.

Esta versión parte del esqueleto "Hello World + wireframes" y agrega: login real,
varios platillos cocinándose a la vez, temporizadores, rangos y logros, más
recetas y la base del modo "Cocina conmigo" por voz. **La estructura de carpetas,
el tema y los componentes del esqueleto se conservan.**

---

## 1. Qué instalar

Solo necesitas:

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 LTS o superior | Ejecutar el proyecto |
| npm | 10 o superior | Instalar dependencias |
| Expo Go (funciones generales) o Chrome/Edge | — | Ver la app |
| Development build de Expo | — | Usar reconocimiento de voz nativo en celular |

Después, en la carpeta del proyecto:

```bash
npm install     # instala TODO lo de package.json (ya incluye las nuevas dependencias)
npm start       # abre Expo; escanea el QR con Expo Go
npm run web     # o bien, abre la versión web (recomendado para probar la voz)
```

El reconocimiento de voz nativo no funciona en Expo Go. Para usarlo en Android,
genera e instala un development build con `npx expo run:android`; en iOS usa
`npx expo run:ios` en macOS o un development build de EAS.

No hace falta instalar nada más a mano. Las dependencias nuevas que ya quedaron
en `package.json` son:

| Paquete | Uso |
|---|---|
| `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context` | Navegación (el esqueleto las usaba pero no estaban en `package.json`) |
| `expo-sqlite` | Persistencia relacional SQLite en Android/iOS |
| `@react-native-async-storage/async-storage` | Guardar la sesión y las sesiones de cocina |
| `expo-crypto` | Hash SHA-256 con sal para las contraseñas |
| `expo-speech` | Leer los pasos en voz alta |

> Si Expo Go te pide otra versión de algún paquete, ejecuta
> `npx expo install --fix` para alinear versiones con tu SDK.

---

## 2. Qué teníamos (esqueleto)

- Todas las pantallas de los wireframes: Login, Registro, Inicio, Búsqueda,
  ¿Qué puedo cocinar?, Detalle de receta, Cocina conmigo, Lista de compras,
  Perfil y Mis recetas.
- Componentes reutilizables (`AppScreen`, `Button`, `Input`, `Chip`, `CheckRow`,
  `RecipeRow`, `SectionBanner`, `SectionTitle`, `BottomBar`, `SideMenu`).
- Sesión **simulada** (cualquier correo entraba), 5 recetas (3 sin pasos),
  perfil y rangos con datos de mentira, temporizador sin cuenta regresiva.

## 3. Qué se implementó

### Login funcional — `src/context/AuthContext.js`
- **Registro** con validación: nombre, correo válido, contraseña de mínimo 6
  caracteres, confirmación igual, y correo no repetido.
- **Inicio de sesión** que verifica correo y contraseña. El mensaje de error es
  el mismo si el correo no existe o la contraseña falla.
- La contraseña **no se guarda en claro**: se guarda `SHA-256(sal + contraseña)`
  con una sal aleatoria por usuario.
- **La sesión persiste**: al cerrar y reabrir la app sigues dentro. "Cerrar
  sesión" la borra.
- Los favoritos (corazón en el detalle de receta) y el historial se guardan en
  la cuenta del usuario.
- Usuarios, recetas, ingredientes y lista de compras viven en almacenamiento
  local relacional: **SQLite en Android/iOS** y `localStorage` en web. Las recetas
  iniciales se cargan la primera vez; las recetas propias y la lista de compras
  también se guardan allí. Las cuentas antiguas de AsyncStorage se migran al abrir
  la app.
- Al crear o editar una receta propia se puede elegir **Comida** o **Postre**;
  la selección define el icono que aparece en sus filas y en el detalle.
  Es una autenticación real pero local, pensada para funcionar sin backend.
  Cuando exista la API solo hay que cambiar el cuerpo de `signUp`, `signIn` y
  `updateUser`; las pantallas no cambian.

### Varios platillos al mismo tiempo — `src/context/CookingContext.js`
- Cada receta en curso es una **sesión** con su propio paso, porciones y
  temporizadores. Puedes cocinar arroz con pollo y quesadillas a la vez.
- **Inicio** muestra la sección "Cocinando ahora" con el paso y el tiempo
  restante de cada platillo; al tocarlo retomas donde ibas.
- En "Cocina conmigo" aparecen chips con los **otros platillos en curso** para
  cambiar de uno a otro sin perder el avance.
- **Temporizadores**: varios por platillo, cuenta regresiva real, arrancan solos
  al llegar a un paso con tiempo (`timers` en la receta) o con un comando.
  Guardan la hora de fin, así que siguen corriendo si cambias de pantalla o
  cierras la app.
- Al terminar un temporizador sale un **aviso en cualquier pantalla**
  (`TimerAlerts`), se lee en voz alta y vibra en el celular.
- Las sesiones se guardan por usuario: al reabrir la app tus platillos siguen.

### Base de "Cocina conmigo" por voz — `src/services/voice.js`, `src/utils/voiceCommands.js`
- **Leer en voz alta** (`expo-speech`): toca la tarjeta del paso o usa los
  comandos. Funciona en Android, iOS y web.
- **Intérprete de comandos** (`parseCommand`): función pura que convierte una
  frase en una acción. Entiende los comandos de la propuesta:
  siguiente / anterior / repite / continuar / pausar / más despacio,
  "¿qué sigue?", "pon un temporizador de 10 min", "cancela el temporizador",
  "¿cuánto tiempo falta?", "¿cuánto necesito?", "quiero cocinar para 6 personas"
  (recalcula cantidades), "¿con qué lo sustituyo?", "explícame" y "terminar".
  Reconoce números en dígitos o palabras ("quince minutos").
- **Comando escrito**: una caja de texto en la pantalla ejecuta exactamente la
  misma lógica que la voz. Sirve para probar y para quien no pueda hablar.
- **Micrófono**: en web (Chrome/Edge) escucha y ejecuta comandos con la Web
  Speech API. En Android/iOS usa `@react-native-voice/voice`; el permiso se
  solicita al iniciar el reconocimiento. En celular requiere un development
  build, no funciona en Expo Go.
- Los consejos tipo "¿cómo sé que está lista?" salen del campo `tips` de cada
  receta; los sustitutos, del campo `substitute` de cada ingrediente.

### Más platillos — `src/data/mock.js`
De 5 a **17 recetas completas** (ingredientes con alérgenos y sustitutos, pasos,
temporizadores y consejos): 3 desayunos, 7 comidas, 2 cenas y 5 postres.
Se agregan en `mock.js` con el mismo formato (está documentado arriba del archivo).

### Rangos y logros — `src/utils/ranks.js`
Se calculan **solo con el historial** de recetas completadas, como en la propuesta:

| Nivel | Recetas completadas |
|---|---|
| 1 — Principiante | 0 a 4 |
| 2 — Aprendiz | 5 a 14 |
| 3 — Cocinero | 15 a 29 |
| 4 — Chef | 30 en adelante |

| Logro | Condición |
|---|---|
| Cocinero principiante | 1 receta |
| Chef casero | 5 recetas |
| Chef experto | 15 recetas |
| Repostero | 5 postres |

- Una receta cuenta al **terminar el último paso** ("Terminar receta" o el
  comando "terminar"). Si la preparas dos veces, cuenta dos veces.
- El perfil muestra nivel, barra de progreso, cuántas recetas faltan para el
  siguiente nivel, logros con nombre, favoritos reales e historial.
- Al terminar una receta se avisa si subiste de nivel o desbloqueaste un logro.

---

## 4. Estructura del proyecto

```
CozziApp/
├── App.js                  # SafeAreaProvider + AuthProvider + CookingProvider + navegación
├── index.js                # Punto de entrada
├── app.json
├── metro.config.js         # Incluye el WASM requerido por SQLite en web
├── assets/
└── src/
    ├── theme/              # Colores, espaciado y radios
    ├── navigation/         # routes.js y RootNavigator.js (con pantalla de carga de sesión)
    ├── context/
    │   ├── AuthContext.js      # Registro, login, sesión, favoritos, historial
    │   └── CookingContext.js   # NUEVO: platillos simultáneos y temporizadores
    ├── services/               # NUEVO
    │   ├── storage.js          # Esquema SQLite, consultas y persistencia auxiliar
    │   └── voice.js            # Leer en voz alta y reconocimiento de voz
    ├── utils/                  # NUEVO
    │   ├── voiceCommands.js    # Frase -> comando
    │   ├── ranks.js            # Niveles y logros
    │   ├── quantities.js       # Ajuste de porciones
    │   └── notify.js           # Alertas que funcionan también en web
    ├── data/mock.js            # 17 recetas iniciales y opciones de perfil
    ├── components/             # Los del esqueleto + TimerAlerts
    └── screens/                # Una pantalla por wireframe
```

## 5. Cómo probarlo rápido

1. `npm run web`, crea una cuenta y entra.
2. En Inicio toca **Cocina conmigo** (arroz con pollo) y escribe `siguiente` dos veces:
   el paso 3 inicia un temporizador solo.
3. Regresa con ← : Inicio ya muestra **Cocinando ahora**.
4. Busca "Quesadillas", ábrela y toca **Cocina conmigo**: ahora hay dos platillos
   y aparece un chip para cambiar entre ellos.
5. Prueba `pon un temporizador de 10 segundos`, `¿con qué sustituyo la tortilla?`,
   o toca 🎤 en Chrome y habla.
6. Llega al último paso, toca **Terminar receta** y revisa el Perfil.

## 6. Limitaciones actuales

- **Reconocimiento de voz nativo**: en Android/iOS requiere un development
  build; Expo Go no incluye el módulo nativo.
- **Backend remoto**: sustituir `AuthContext` / `storage.js` para compartir
  cuentas y datos entre dispositivos. Actualmente SQLite es local al dispositivo.
- **Notificaciones con la app cerrada** (hoy el aviso es dentro de la app).
- **Recuperación de contraseña**.
- Elegir porciones desde la pantalla (hoy se hace por comando de voz/texto).
