# A.R.T. – Agencia de Respuestas Tácticas

**Pabellón:** Molestias Cotidianas
**Ingrediente improbable:** Número absurdamente preciso

## El problema

Volver a un chat o grupo de WhatsApp después de unas horas y encontrarse con decenas de mensajes acumulados entre audios omitidos, chistes y texto innecesario genera fiaca inmediata. Quien lo sufre termina leyendo todo por arriba, perdiendo tiempo en descifrar qué se decidió realmente y sin saber qué ni cómo contestar sin parecer cortante o desesperado.

## La solución

**A.R.T.** convierte un historial exportado de WhatsApp (`dd/mm/aa, hh:mm - Autor: mensaje`) en un expediente de inteligencia listo para accionar: filtra mensajes de sistema, distingue automáticamente entre chat individual (2 autores) o grupal (3 o más), calcula métricas conductuales expresadas siempre con exactamente dos decimales (`0,00`), resume qué quieren decir realmente y sugiere tres respuestas copiables (`Diplomática`, `Pasivo-agresiva` y `Neutra`).

Entre las métricas reales implementadas en el motor local se incluyen:

- **Relleno innecesario %:** `100 × mensajes sin contenido útil / total de mensajes`. Un mensaje se considera útil si contiene una pregunta (`?` / `¿`), un número o monto, una fecha/hora o un verbo de pedido/plan (`vamos`, `confirmá`, `transferir`, etc.). Su complemento alimenta el gráfico **Humo vs. Sustancia**.
- **Tiempo de vida ahorrado:** `(palabras totales - palabras del resumen) / 238 palabras por minuto`, presentado como `mm minutos y ss,cc segundos`.
- **Nivel de drama %:** puntaje ponderado sobre el total de palabras (`(mayúsculas × 2 + signos !/? repetidos × 1,5 + emojis × 1,2) / total de palabras × 100`, limitado a `100,00`).

También calcula **Índice de testamento** (`Nivel de novela rusa`), **Tiempo medio de respuesta**, **Pendientes sin contestar**, **Cuentas por cobrar**, **Largo ideal de respuesta**, **Hora recomendada para responder sin parecer desesperado**, un **Slider de ganas de hablar (0,00 a 100,00)** que acorta o alarga las respuestas en vivo, y métricas extendidas (**Índice de urgencia %**, **Jajas sin gracia %**, **Audios que podían ser un texto**, **Mensajes de madrugada %**, **Temperatura del chisme**, **Ranking de participación** y medidor semicircular **Nivel de fiaca**) cuando el chat tiene 5 o más mensajes (con menos de 5 mensajes se marca `"Expediente archivado por falta de evidencia"` y se calculan solo las métricas imprescindibles). Toda métrica en `0,00` muestra un comentario fijo humorístico en vez de quedar vacía.

### Qué corre local, qué usa IA y cuál es el fallback

- **Procesamiento local en el navegador (`src/lib/parser.ts`, `src/lib/metrics.ts`, `src/lib/metrics-desirable.ts`, `src/lib/talkativeness.ts`):** el parseo del texto, la clasificación individual/grupal, el filtrado de `<Multimedia omitido>` y avisos de sistema, el cálculo de todas las métricas, los gráficos SVG y el ajuste por el slider funcionan 100 % del lado del cliente sin red.
- **Análisis con IA (`POST /api/analizar` en `src/app/api/analizar/route.ts` y `src/lib/ai.ts`):** recibe `{ chatText, regenerateTone?, variantSeed? }` y consulta la API de Google Gemini con salida estructurada en JSON (`summary`, respuestas `diplomatic`, `passiveAggressive`, `neutral`, `shouldReply` y `urgencyPercentage`), recorriendo una cascada de modelos con un timeout global compartido de **10 segundos**.
- **Fallback determinístico sin IA (`src/lib/fallback.ts`):** si falta `GEMINI_API_KEY`, se vence el límite de 10 segundos o fallan los modelos, `generateRuleBasedFallback` clasifica el chat por reglas (`money`, `date`, `complaint`, `question` o `general`) y devuelve el resumen, las tres respuestas sugeridas y el semáforo de urgencia (`Responder: SÍ/NO`) de manera inmediata. Además, la interfaz renderiza el fallback local al instante mientras espera la respuesta de `/api/analizar`.

## Cómo probarlo

### 1. Instalación y ejecución

Probado en este entorno con **Node.js `v22.14.0`** y **pnpm `10.33.0`**:

```bash
pnpm install
pnpm dev
```

Luego abrir `http://localhost:3000` en el navegador.

Scripts disponibles en `package.json`:

```bash
pnpm test    # Ejecuta las pruebas unitarias con Vitest (vitest run)
pnpm lint    # Ejecuta ESLint (eslint)
pnpm build   # Genera el build de producción (next build)
```

### 2. Variable de entorno (opcional)

Copiar `.env.example` a `.env.local` en la raíz si se desea habilitar el análisis con IA:

```env
GEMINI_API_KEY=
# Opcional: modelo inicial de la cascada (por defecto gemini-3.5-flash-lite)
GEMINI_MODEL=
```

- **Qué pasa si falta `GEMINI_API_KEY`:** la aplicación sigue funcionando completa. `/api/analizar` detecta la ausencia de clave y responde de inmediato usando el motor de plantillas por reglas (`Fuente: Plantillas por reglas (RF-19)`).

### 3. Uso en la aplicación

1. Hacer clic en **"Cargar ejemplo: Individual"** o **"Cargar ejemplo: Grupal"** (o pegar un chat exportado de WhatsApp y presionar **"Analizar"**).
2. Al instante se mostrarán:
   - La cabecera tipo dossier con el sello `CONFIDENCIAL`, número de expediente (`ART-2026-XXXX`) y el tipo de chat detectado (`Chat Individual` o `Chat Grupal`).
   - La grilla de métricas conductuales a dos decimales y el gráfico circular **Humo vs. Sustancia**.
   - El resumen **"Lo que realmente quieren decir"**, el semáforo **"Responder: SÍ/NO"** con porcentaje de urgencia, el **Slider de ganas de hablar** y las 3 respuestas sugeridas (`Diplomática`, `Pasivo-agresiva`, `Neutra`) con botones **"Copiar respuesta"** y **"Regenerar tono"**.
   - El panel de **Inteligencia Operativa** (pendientes sin contestar, cuentas por cobrar, largo ideal de respuesta y hora recomendada para responder) con selector **"Tu rol en el chat"**.
   - La sección de **Peritaje Extendido** con métricas deseables, ranking de participación por autor, medidor semicircular **Nivel de fiaca** y gráfico de evolución **Drama y Temperatura del Chisme** (cuando hay 5 o más mensajes).
3. Con **"Nuevo análisis"** se limpia todo y se vuelve al inicio.

## Privacidad

El texto se procesa en el navegador para el parseo y el cálculo de todas las métricas; si la IA está activa (`GEMINI_API_KEY` configurada en el servidor), el historial se envía al servicio de IA vía `/api/analizar`. No pegar chats con datos sensibles o información personal de terceros.

## Herramientas de IA utilizadas

- **Para construir el proyecto:** Claude para la redacción de la documentación inicial y especificación de requisitos, y Gemini para construir el código de la aplicación (arquitectura en Next.js/TypeScript, parser, motores de métricas y fallback, interfaz de usuario y pruebas con Vitest).
- **Dentro del producto:** SDK oficial `@google/genai` (`^3.3.0`) consumiendo modelos de Google Gemini/Gemma (`gemini-3.5-flash-lite` por defecto, configurable con `GEMINI_MODEL`, y cascada automática por `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3-flash-preview`, `gemini-flash-lite-latest`, `gemini-omni-1.1-flash` y `gemma-4-31b-it`), respaldado por un motor local determinístico por reglas cuando no hay API key, ocurre un error o se superan los 10 segundos.
