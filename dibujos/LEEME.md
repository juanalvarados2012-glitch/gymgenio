# 🖼️ Los dibujos de los ejercicios

Aquí van las ilustraciones que se ven dentro de la ficha de técnica, entre la
línea de "en pocas palabras" y el "Cómo se hace".

Son **dibujos SVG hechos a mano**, no fotos. Se decidió así porque:

- Son nuestros. Ninguna imagen de internet metida en un producto de pago.
- Pesan ~2 KB en vez de ~100 KB, y cargan al instante con datos móviles.
- Funcionan sin señal.
- Se puede **marcar el error encima del dibujo** ("así sí / así no"), que es lo
  que de verdad enseña técnica. Una foto no puede hacer eso.

## Cómo funciona

**No hay que tocar código para añadir un dibujo.** Dejas el archivo aquí con el
nombre correcto y aparece solo la próxima vez que alguien abra esa ficha.

Y al revés: **el ejercicio que todavía no tenga dibujo se ve exactamente como
antes**. No sale un icono de imagen rota ni un hueco gris — la app se da cuenta
de que el archivo no existe y quita el espacio. Así se pueden ir haciendo los 22
de uno en uno, sin prisa y sin romper nada por el camino.

## El nombre del archivo

Tiene que ser **exactamente** uno de estos, y terminar en `.svg`:

| Archivo | Ejercicio |
|---|---|
| `sentadilla.svg` | Sentadilla · Squat |
| `flexion.svg` | Flexiones · Push-ups |
| `plancha.svg` | Plancha · Plank |
| `puente-gluteo.svg` | Puente de glúteo · Glute bridge |
| `zancada.svg` | Zancadas · Lunges |
| `remo.svg` | Remo · Row |
| `press-hombro.svg` | Press de hombro · Shoulder press |
| `curl-biceps.svg` | Curl de bíceps · Biceps curl |
| `abdominal.svg` | Abdominales · Crunches |
| `escalador.svg` | Escaladores · Mountain climbers |
| `salto-tijera.svg` | Saltos de tijera · Jumping jacks |
| `burpee.svg` | Burpees |
| `peso-muerto.svg` | Peso muerto · Deadlift |
| `superman.svg` | Superman |
| `sentadilla-bulgara.svg` | Sentadilla búlgara · Bulgarian split squat |
| `fondo-triceps.svg` | Fondos de tríceps · Triceps dips |
| `plancha-lateral.svg` | Plancha lateral · Side plank |
| `elevacion-lateral.svg` | Elevaciones laterales · Lateral raises |
| `elevacion-talon.svg` | Elevación de talones · Calf raises |
| `perro-pajaro.svg` | Bird dog |
| `dominada.svg` | Dominadas · Pull-ups |
| `giro-ruso.svg` | Giro ruso · Russian twist |

**Un solo dibujo por ejercicio, no uno por idioma.** La sentadilla y el squat
son el mismo movimiento: comparten `sentadilla.svg`.

> Esta lista no está escrita a mano dos veces. Sale de las fichas de
> `tecnica.js`, y una prueba comprueba que sigan cuadrando. Si algún día añades
> una ficha nueva, corre `npm test` y te dirá el nombre de archivo que le toca.

## Cómo tiene que estar hecho el SVG

- **Con `viewBox`** (por ejemplo `viewBox="0 0 340 200"`) y **sin** `width` ni
  `height` fijos. La app le pone el ancho; la altura sale sola.
- **Sin texto que haya que traducir.** La app es bilingüe: una etiqueta en
  español se vería en la ficha en inglés. Etiquetas cortas y universales
  (`✓`, `✗`, una flecha) sí valen.
- **Colores escritos dentro del archivo**, no variables CSS. Un SVG cargado
  como imagen no ve los colores de la página. La paleta es:

  | Para qué | Color |
  |---|---|
  | La figura | `#F3F3F1` |
  | Lo que se señala como correcto | `#CCFF00` |
  | Lo que se señala como error | `#FF6B6B` |
  | Suelo, líneas de apoyo, etiquetas | `#8B8B95` |
  | Fondo (dejarlo transparente) | — |

## Qué debe salir en el dibujo

Lo importante no es que quede bonito, es que se entienda el movimiento:

1. **De lado**, no de frente. Casi todos los fallos de técnica (espalda curva,
   rodilla adelantada, cadera caída) solo se ven de perfil.
2. **Las dos posiciones**: de dónde sale y a dónde llega, con una flecha entre
   las dos. Una sola pose no cuenta un movimiento.
3. **La línea que enseña**, marcada en verde: la espalda recta en la sentadilla,
   el cuerpo en línea en la plancha.
4. **El cuerpo entero**, de la cabeza a los pies, sin cortar.
