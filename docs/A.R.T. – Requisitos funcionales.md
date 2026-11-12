# A.R.T. – Requisitos funcionales

Nov 12, 2026 · @Luis

## Ficha del invento

A.R.T. analiza chats de WhatsApp largos y devuelve métricas con dos decimales, un resumen y respuestas listas para copiar.

| Campo | Contenido |
| --- | --- |
| Nombre | Agencia de Respuestas Tácticas (A.R.T.) |
| Pabellón | Molestias Cotidianas |
| Quién | Cualquiera que vuelve a un chat o grupo de WhatsApp y encuentra un testamento |
| Problema | Da fiaca leer chats larguísimos y pensar qué contestar |
| Entrada | El historial de chat pegado como texto |
| Proceso | Parsea el chat, calcula métricas y pide a la IA un resumen y respuestas |
| Salida | Métricas, gráficos, resumen y respuestas copiables |
| Ingrediente | Número absurdamente preciso (todo con dos decimales) |

## Requisitos funcionales

Son 33 requisitos; la prioridad es M (imprescindible), D (deseable) u O (opcional). Las métricas M funcionan con cualquier chat; las que dependen de palabras clave son D y, si dan cero, muestran un mensaje fijo en vez de un hueco.

### Entrada

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-01 | M | El sistema tiene un área de texto para pegar el historial de WhatsApp. |
| RF-02 | M | Hay un botón "Analizar" y uno "Cargar ejemplo", con un ejemplo individual y uno grupal precargados. |
| RF-03 | M | Antes del análisis se avisa que el texto puede enviarse a un servicio de IA. |
| RF-04 | M | Si el texto está vacío o no tiene el formato esperado, se muestra un error claro. |

### Parseo

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-05 | M | Reconoce líneas con formato `dd/mm/aa, hh:mm - Autor: mensaje` y agrupa las líneas sin fecha como continuación del mensaje anterior. |
| RF-06 | M | Ignora mensajes de sistema como "Se cifró el chat" o "\<Multimedia omitido>". |
| RF-07 | M | Detecta solo si el chat es individual (2 autores) o grupal (3 o más) y lo muestra en pantalla. |

### Métricas (el ingrediente)

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-08 | M | Todas las métricas se muestran con exactamente dos decimales. |
| RF-09 | M | **Relleno innecesario %:** 100 × mensajes sin contenido útil / total de mensajes. Un mensaje es útil si tiene una pregunta, un número o monto, una fecha u hora, o un verbo de pedido o plan. |
| RF-10 | M | **Tiempo de vida ahorrado:** (palabras totales / 238 palabras por minuto) menos el tiempo de leer el resumen. Se muestra como `mm minutos y ss,cc segundos`. |
| RF-11 | M | **Nivel de drama %:** puntaje ponderado de palabras en MAYÚSCULAS, signos "!" y "?" repetidos y emojis, sobre el total de palabras, limitado a 100. |
| RF-12 | D | **Índice de urgencia %:** palabras como "urgente", "ya", "hoy" o "necesito", sumadas a las preguntas sin responder al final del chat. |
| RF-13 | D | En grupos, ranking de quién escribió más, con porcentaje de participación a dos decimales. |
| RF-25 | M | **Regla del cero:** toda métrica muestra siempre un número, incluso 0,00. Si da cero, aparece un mensaje fijo gracioso en lugar de un hueco (ej: "0,00 %: chat sin una sola risa. Preocupante."). |
| RF-26 | M | **Índice de testamento:** palabras por mensaje, mostrado como "Nivel de novela rusa: 14,87". |
| RF-27 | M | **Tiempo medio de respuesta:** promedio entre un mensaje y la respuesta de otro autor, como "47 minutos y 13,08 segundos". |
| RF-28 | D | **Jajas sin gracia %:** cantidad de "jaja" dividida por mensajes sin nada gracioso. |
| RF-29 | D | **Audios que podían ser un texto:** cuenta de mensajes "audio omitido" del chat. |
| RF-30 | D | **Mensajes de madrugada %:** los enviados entre las 2:00 y las 6:00 sobre el total. |
| RF-31 | D | **Temperatura del chisme:** frecuencia de palabras como "che", "viste" o "no sabés" por cada 100 palabras. |
| RF-32 | M | **Muestra insuficiente:** con menos de 5 mensajes se avisa "expediente archivado por falta de evidencia" y se calculan solo las métricas M. |

### Gráficos

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-14 | M | Gráfico de torta "Humo vs. Sustancia": relleno contra contenido útil. |
| RF-15 | D | Gráfico de barras "Quién habla más para decir menos": mensajes por persona. |
| RF-16 | O | Gráfico de línea "Temperatura del chisme" o del nivel de drama a lo largo del chat. |
| RF-33 | O | Medidor semicircular "Nivel de fiaca" con un valor de 0,00 a 100,00. |

### IA

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-17 | M | Un endpoint `/api/analizar` (route handler de Next.js) recibe el texto y llama a la API de IA. La API key vive solo en variables de entorno. |
| RF-18 | M | La IA devuelve un JSON con el resumen de "lo que realmente quieren decir" y tres respuestas sugeridas: diplomática, pasivo-agresiva y neutra. |
| RF-19 | M | **Fallback:** si la API falla, tarda más de 10 segundos o no hay key, el sistema usa plantillas por reglas (pregunta, plata, fecha, queja) y sigue mostrando todo lo demás. |
| RF-20 | D | Indicador "Responder: SÍ/NO" con semáforo y un porcentaje de urgencia, presentado como dato numérico y no como sentencia. |

### Respuestas

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-21 | M | Cada respuesta se copia al portapapeles con un clic y confirma con un aviso. |
| RF-22 | D | Se puede regenerar la respuesta de un tono. |

### Interfaz

| ID | Prioridad | Requisito |
| --- | --- | --- |
| RF-23 | M | Estética de agencia de inteligencia (sellos "CONFIDENCIAL", número de expediente), solo como estilo y sin narrador que opine. |
| RF-24 | M | Un botón "Nuevo análisis" limpia todo y vuelve al inicio. |

## Criterios de aceptación clave

- Con el ejemplo precargado, el resultado completo aparece sin configurar nada.
- Cualquier número mostrado tiene dos decimales.
- Con un chat sin ninguna palabra clave, todas las métricas muestran un valor (0,00 con su mensaje fijo) y nada queda vacío.
- Sin API key, la app sigue funcionando con el fallback.
- Una persona que nunca la vio la usa en un minuto.

## Orden de construcción

Si al minuto 30 no anda el núcleo, la IA es lo primero que se cae.

1. Next.js, repositorio, ficha y primer commit.
2. RF-01 a RF-11, RF-14, RF-25, RF-26, RF-27 y RF-32: núcleo local, sin IA.
3. RF-17 a RF-19 y RF-21: IA con fallback.
4. Deseables (RF-12, 13, 15, 20, 22, 28 a 31), README y push final con el SHA anotado.
