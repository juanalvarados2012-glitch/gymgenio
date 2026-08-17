# 🧞 GymGenio — Resumen del proyecto

Hecho por **Juan (14 años)** con apoyo de sus papás. Mini app de IA: un entrenador personal
que arma tu rutina de gym + comidas. Suscripción **$14.99/mes**.

---

## 🌐 Tus enlaces en vivo

| Página | Para qué |
|---|---|
| https://gymgenio.vercel.app | Página principal (vende GymGenio) |
| https://gymgenio.vercel.app/app.html | La app: el genio arma tu plan |
| https://gymgenio.vercel.app/login.html | Crear cuenta / iniciar sesión |
| https://buy.stripe.com/aFa5kFcuNesMb7S5Ya4Vy06 | Link de pago ($14.99/mes) |

---

## ✅ Lo que YA funciona (¡un SaaS completo!)

- **Página que vende** (precios, cómo funciona, preguntas, aviso de salud) ✅
- **El genio (IA)** arma planes reales — gratis (1 día) y Pro (semana + comidas) ✅
- **🗺️ Ruta a la meta con tracking semanal** ✅ → ver abajo
- **Pago de $14.99/mes** con Stripe ✅
- **Guardia anti-tramposos** (nadie entra al Pro sin pagar) ✅
- **Cuentas** (registro + login con Supabase) ✅
- **Cuentas conectadas al pago** ✅ → entrar con tu cuenta = ver tu Pro
  (la app le pregunta a Stripe si tu email tiene suscripción activa)
- **☁️ Tu progreso vive en tu cuenta, no solo en el teléfono** ✅ → ver abajo
- **La app abre en tu idioma** ✅ (antes siempre abría en inglés)
- **Se despliega solo** (Claude sube los cambios a Vercel directo) ✅

## ☁️ El progreso ya no se pierde (lo nuevo)

Antes el plan, las marcas, la racha y los pesos vivían **solo dentro del navegador**.
Perder el teléfono en la semana 6 de la ruta era perder las seis semanas. Vendemos un
plan de 8 semanas: el guardado tiene que aguantar 8 semanas.

Ahora, si la persona tiene cuenta, todo eso también vive en su cuenta y aparece en
cualquier dispositivo donde entre.

**Lo difícil no era subirlo, era qué hacer cuando el teléfono y el servidor no dicen
lo mismo** (pasa siempre: entrenas en el gimnasio sin señal y en la casa abres otra
pantalla). La regla fácil — "gana el último que escribió" — **borra entrenos**. Por eso
hay dos reglas distintas, en `nube.js`:

- **Lo que se reemplaza** (el plan, la meta): gana el más reciente. Solo puede haber un
  plan a la vez.
- **Lo que solo crece** (sesiones hechas, pesos anotados): se juntan los dos. Un entreno
  que pasó, pasó; ningún dispositivo tiene derecho a borrarlo.
- **Las marcas de ejercicios** solo se juntan si los dos hablan del *mismo* plan. Si no,
  el plan nuevo aparecería con ejercicios marcados que la persona nunca hizo.

**Seguros que tiene:**
- Si la tabla del servidor todavía no existe, **la nube se apaga sola** y la app funciona
  exactamente como antes. Nada se rompe. (Falta correr `SETUP-NUBE-PAPA.md`.)
- Sin internet todo sigue guardándose en el teléfono y sube cuando vuelve la señal.
- Un dispositivo recién estrenado **nunca** borra lo que hay en la cuenta.
- Al cerrar sesión la nube se apaga: lo que haga un invitado no sube a la cuenta de nadie.

**El idioma.** La app siempre abría en inglés, para todo el mundo. Alguien en Ecuador
entraba y veía la página en un idioma que no es el suyo, y el plan que generaba salía
en inglés también. Ahora la primera vez se mira el idioma del navegador; si la persona
elige idioma alguna vez, su elección manda siempre.

## 🗺️ La ruta a la meta (lo nuevo)

La persona dice **a dónde quiere llegar** (peso meta + en cuántas semanas) y GymGenio
le dibuja el camino **semana por semana** y le mide si de verdad va llegando.

**Lo que ve:**
- Una barra: *"18% de tu meta · Semana 3 de 8"*.
- Un mensaje corto cada semana: *"Esta semana: te faltan 2 entrenos · vas un poco atrás (+1.1 kg)"*.
- La lista de las 8 semanas: el foco de cada una (lo pone el genio), los entrenos
  hechos (3/3 con bolitas) y su peso comparado con **la línea** que lleva a la meta.
- Un botón **🔄 Adaptar mi plan a como voy**: le manda al genio los números REALES
  (*"hice 6 de 9 entrenos y voy 1.1 kg arriba de la línea"*) y le arma un plan nuevo
  más fácil si va atrasado, o más exigente si va adelantado.

**Los seguros de salud (esto es importante):**
- Nunca promete bajar más de ~1% del peso por semana (tope 0.9 kg). Si pide 6 kg en
  2 semanas, la app **estira el tiempo sola** y se lo explica con cariño.
- Nunca deja poner una meta por debajo de un peso sano para su estatura (IMC 18.5).
- Si la meta necesita más de 16 semanas, arma la ruta hasta donde SÍ se llega:
  *"Te armé la ruta hasta 69.6 kg; cuando llegues ahí, ponemos la siguiente. 💪"*
- Estos tres seguros están **en la app y también en el servidor**, para que nadie
  se los salte y para que el genio nunca reciba un ritmo peligroso como si fuera sano.

**Gratis vs Pro:** el seguimiento semanal completo es **gratis** (es lo que engancha).
El **foco que escribe el genio para cada semana** es de Pro: gratis ve 2 semanas.

**¿Sin meta de peso?** Igual arma una *ruta de constancia*: N semanas entrenando X veces.

### Cómo funciona el flujo completo
1. La persona crea su cuenta 👤
2. Paga con el email de su cuenta 💳
3. Entra → la app confirma con Stripe → le da su Pro ✅
4. Si cancela, deja de ser Pro automáticamente 🔄

---

## 🛠️ Repaso de calidad (agosto 2026)

**Un agujero de seguridad que costaba dinero.** El contador de calorías (`/api/comida`)
dejaba entrar a cualquiera que llevara un `session_id` de Stripe — y ese número no es
secreto: viaja en la URL, queda en el historial, se comparte por WhatsApp. Una sola
persona que pagara podía darle Pro gratis a medio internet, y cada foto es una llamada
de IA que **tú pagas**. Ahora el recibo solo vale si el correo del pago es el mismo de
la cuenta que pide. Además esa puerta no tenía freno ni revisaba de qué web venía la
llamada: ya tiene las dos cosas (12 fotos cada 15 min, y solo desde gymgenio).

**El guardia vive en un solo lugar.** Antes cada archivo de `/api` tenía su propia copia
de "¿quién eres? ¿pagaste?", y por eso el arreglo se hizo en uno y se olvidó en el otro.
Ahora está en `api/_comun.js` y todos lo usan: se arregla una vez, queda arreglado.

**La racha se rompía sola fuera de Europa.** La app usaba la fecha de horario universal.
Alguien en México que entrena a las 8 de la noche ya era "mañana" para la app: su racha
se cortaba y sus comidas se guardaban en el día equivocado. Ahora todo usa **el reloj de
la persona** (el navegador le manda su zona al servidor).

**Otras mejoras**
- Se puede **quitar una comida** mal contada (antes el total del día quedaba mal para siempre).
- Sin internet sale un aviso claro en vez de `Failed to fetch`, y la app avisa que puede
  seguir usándose para marcar ejercicios.
- El descanso ya no se congela si bloqueas el teléfono a media serie, y **pita** al terminar.
- Marcar un ejercicio ya no vuelve a dibujar el plan entero: no se pierde el teclado ni se
  cierran los días que abriste.
- La app abre más rápido: las dos preguntas al servidor salen a la vez, no en fila.
- El botón de quitar mide 40x40 (antes 22x22: imposible atinarle con la mano sudada).

## 🧪 Las pruebas automáticas

Se corren con **un solo comando**, sin instalar nada (usan el probador que ya
viene dentro de Node):

```
npm test
```

**63 pruebas.** Cubren las cosas que, si se rompen, no te enteras por un
error en pantalla sino por la factura, por alguien saliendo lastimado, o porque
un día la racha de alguien aparece más corta y esa persona cree que se equivocó ella:

| Archivo | Qué cuida |
|---|---|
| `pruebas/guardia.test.js` | Quién es Pro. Incluye el agujero real que ya tuvimos: **un recibo de Stripe ajeno no sirve** |
| `pruebas/frenos.test.js` | Que un robot no te vacíe el presupuesto de IA |
| `pruebas/fechas.test.js` | Que la racha use el reloj de la persona, no el de Europa |
| `pruebas/ruta-segura.test.js` | Que la app **nunca** prometa "10 kg en 2 semanas" |
| `pruebas/nube.test.js` | Que sincronizar **nunca borre** entrenos ni pesos |
| `pruebas/nube-arranque.test.js` | Que el cable esté puesto: carga `app.html` de verdad y comprueba que el progreso baja, sube, y que sin la tabla creada nada se rompe |

> Cada prueba se comprobó rompiendo el código a propósito para ver que sí falla.
> Una prueba que no sabe fallar no está cuidando nada.

**Si `npm test` falla, NO subas ese cambio.** Algo que ya funcionaba se rompió.

## 🔧 Lo que falta

### ⚠️ Primero que nada: encender la nube
- **Papá tiene que correr el SQL de `SETUP-NUBE-PAPA.md`** (5 minutos, una sola vez).
  Mientras no lo haga, la app funciona igual que antes pero el progreso sigue viviendo
  solo en el teléfono. **No corre prisa y no rompe nada**, pero hasta que se haga, la
  promesa del plan de 8 semanas sigue sin estar respaldada.
- Cuando esté hecho: entrar con la misma cuenta desde dos navegadores distintos y ver
  que el plan aparece en los dos. Esa es la prueba de que quedó bien.

### Después (el plan del núcleo)
- **Fichas de técnica** por ejercicio + la voz del navegador leyéndolas. Es el hallazgo
  #1 de los dos análisis: el principiante no sabe si está haciendo bien el movimiento.
- **Check-in de 10 segundos** al terminar (esfuerzo 1–5, qué ejercicio costó) y una
  tarjeta que diga *qué nos dijiste → qué cambiamos → por qué*. Hace visible que la IA
  aprende, que hoy no se nota.
- **Revisión de técnica por video** (grabar 10 s, analizar 6 fotos con el tubo que ya
  existe en `api/comida.js`). Es el diferenciador, pero va al final.

### Marketing — traer los primeros clientes
- Grabar el **Reel de lanzamiento** en Instagram (guion ya listo:
  *"Tengo 14 y creé una app de IA que te arma tu rutina de gym"*)
- Plan de los **$50 en anuncios** apuntando a gente fitness
- El pixel ya mide las 4 etapas: `PageView` → `CompleteRegistration` (armó su
  plan gratis) → `InitiateCheckout` (tocó pagar) → `Purchase` (pagó). En 3-4 días
  de anuncios se ve **dónde se cae la gente**, y eso decide qué construir después.

### Detalles / pulido
- Acentos y traducciones principales en inglés/español ✅
- Pedir cambios al plan desde la app ✅
- Separar los planes guardados por cuenta en el mismo dispositivo ✅
- (Opcional) Apagar "Confirm email" en Supabase (cuentas entran sin esperar correo)
- Sincronizar los archivos locales con lo desplegado

### Prueba opcional
- Ver el "pagué → soy Pro" real: papá se suscribe $14.99, lo comprueba, y se reembolsa.

---

## 🔑 Llaves en Vercel (ya puestas, no tocar)
`ANTHROPIC_API_KEY` · `STRIPE_SECRET_KEY` · `SUPABASE_URL` · `SUPABASE_ANON_KEY`

## 🎨 Archivos del logo
- `logo-gymgenio.svg` — logo con nombre (para posts, portadas)
- `logo-gymgenio-icono.svg` — solo el ícono redondo (para foto de perfil)

## 🎯 La meta
Cobrar $14.99/mes. Con **20 clientes = $100/mes**, con **100 = $500/mes**. Empezar chico y escalar.

## 📌 Para retomar
Dile a Claude: **"seguimos con GymGenio"** → y elige: Instagram, pulir, o probar el pago real.
