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
- **Se despliega solo** (Claude sube los cambios a Vercel directo) ✅

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

## 🔧 Lo que falta

### Marketing — traer los primeros clientes
- Grabar el **Reel de lanzamiento** en Instagram (guion ya listo:
  *"Tengo 14 y creé una app de IA que te arma tu rutina de gym"*)
- Plan de los **$50 en anuncios** apuntando a gente fitness

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
