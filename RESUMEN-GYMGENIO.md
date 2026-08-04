# 🧞 GymGenio — Resumen del proyecto

Hecho por **Juan (14 años)** con apoyo de sus papás. Mini app de IA: un entrenador personal
que arma tu rutina de gym + comidas. Suscripción **$19/mes**.

---

## 🌐 Tus enlaces en vivo

| Página | Para qué |
|---|---|
| https://gymgenio.vercel.app | Página principal (vende GymGenio) |
| https://gymgenio.vercel.app/app.html | La app: el genio arma tu plan |
| https://gymgenio.vercel.app/login.html | Crear cuenta / iniciar sesión |
| https://buy.stripe.com/8x200l8ex84ogsc72e4Vy05 | Link de pago ($19/mes) |

---

## ✅ Lo que YA funciona (¡un SaaS completo!)

- **Página que vende** (precios, cómo funciona, preguntas, aviso de salud) ✅
- **El genio (IA)** arma planes reales — gratis (1 día) y Pro (semana + comidas) ✅
- **Pago de $19/mes** con Stripe ✅
- **Guardia anti-tramposos** (nadie entra al Pro sin pagar) ✅
- **Cuentas** (registro + login con Supabase) ✅
- **Cuentas conectadas al pago** ✅ → entrar con tu cuenta = ver tu Pro
  (la app le pregunta a Stripe si tu email tiene suscripción activa)
- **Se despliega solo** (Claude sube los cambios a Vercel directo) ✅

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
- Poner **acentos** en el sitio (hoy en ASCII)
- Que el genio permita **pedir cambios** al plan
- (Opcional) Apagar "Confirm email" en Supabase (cuentas entran sin esperar correo)
- Sincronizar los archivos locales con lo desplegado

### Prueba opcional
- Ver el "pagué → soy Pro" real: papá se suscribe $19, lo comprueba, y se reembolsa.

---

## 🔑 Llaves en Vercel (ya puestas, no tocar)
`ANTHROPIC_API_KEY` · `STRIPE_SECRET_KEY` · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`

## 🎨 Archivos del logo
- `logo-gymgenio.svg` — logo con nombre (para posts, portadas)
- `logo-gymgenio-icono.svg` — solo el ícono redondo (para foto de perfil)

## 🎯 La meta
Cobrar $19/mes. Con **20 clientes = $100/mes**, con **100 = $500/mes**. Empezar chico y escalar.

## 📌 Para retomar
Dile a Claude: **"seguimos con GymGenio"** → y elige: Instagram, pulir, o probar el pago real.
