# 🧞 GymGenio — Instrucciones para papá (2 pasos)

Hola 👋 Juan construyó GymGenio. Para que la IA funcione en el sitio, hacen falta **2 cosas suyas**.
Toma unos 5 minutos.

---

## Paso 1 · Crear la API key de Anthropic

1. Entre a **console.anthropic.com** → *API Keys* → **Create Key**
2. Póngale de nombre: `gymgenio`
3. **Copie la llave** (empieza con `sk-ant-...`). Solo se muestra una vez.

> 🔒 **Importante:** esa llave es como una tarjeta de crédito. No la pegue en chats,
> ni en el código, ni se la mande a nadie. Solo va en el Paso 2.

### Recomendado: póngale límite de gasto
En Anthropic → *Settings* → *Limits* → ponga un tope mensual (ej. **$10 USD**).
Así nunca hay sorpresas. Cada plan que genera la app cuesta centavos.

---

## Paso 2 · Guardar la llave en Vercel

1. Entre a **vercel.com** → proyecto **gymgenio**
2. Vaya a **Settings** → **Environment Variables**
3. Agregue:
   - **Key (nombre):** `ANTHROPIC_API_KEY`
   - **Value (valor):** la llave que copió (`sk-ant-...`)
   - **Environments:** deje marcados todos (Production, Preview, Development)
4. **Save**
5. Vaya a **Deployments** → en el último, menú `···` → **Redeploy**
   (esto es necesario para que la app tome la llave nueva)

✅ Listo. La IA ya funciona en https://gymgenio.vercel.app

---

## Qué hay en este proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | La página que vende GymGenio (precios, FAQ) |
| `app.html` | Donde el usuario pide su plan al genio |
| `api/plan.js` | El "cerebro": llama a la IA de Anthropic. **Aquí NO está la llave** — la lee de Vercel |
| `package.json` | Configuración del proyecto |

## Sobre los pagos

- Stripe usa la cuenta **Veriq Security Inc.** (usted la autorizó).
- Producto: **GymGenio Pro — $14.99 USD/mes** (suscripción recurrente).
- Link de pago: https://buy.stripe.com/aFa5kFcuNesMb7S5Ya4Vy06
- Al pagar, el cliente vuelve al sitio con su plan completo.

## Paso 3 · Segunda llave: la clave secreta de Stripe (para el "guardia")

Ya agregamos un **guardia real**: la app le pregunta a Stripe si el pago es de verdad
antes de dar el plan Pro. Para eso necesita la **clave secreta de Stripe**.

1. Entre a **dashboard.stripe.com** → *Developers* → *API keys*
2. Copie la **Secret key** (empieza con `sk_live_...`). Es MUY sensible, trátela como la de Anthropic.
3. En **Vercel** → proyecto **gymgenio** → *Settings* → *Environment Variables*, agregue:
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** la `sk_live_...`
4. **Save**. (Claude vuelve a desplegar; no hace falta que usted haga nada más.)

Hasta que esta llave esté puesta, **el plan Pro dará solo la versión gratis** aunque el cliente pague
(mejor eso a que alguien entre sin pagar). En cuanto la agregue, el Pro pagado funciona.

## Nota honesta sobre seguridad

El guardia verifica el pago con el "boleto" (session_id) que Stripe pone en la dirección.
El correo del pago debe coincidir con el de una cuenta que ya inició sesión; así no puede usar
el boleto de otra persona para activar Pro. El servidor ya rechaza boletos usados sin iniciar sesión,
por lo que el pago debe hacerse después de crear o entrar a una cuenta.
Suficiente para lanzar y conseguir los primeros clientes, pero no sustituye una revisión de seguridad profesional.

## 🔐 Checklist de seguridad antes de publicar

- Activa **2FA** en Vercel, Supabase, Stripe, Anthropic y el correo de soporte.
- Las llaves secretas solo van en **Vercel → Environment Variables**. Nunca las pongas en HTML, Git, capturas ni chats.
- Si una llave se comparte por accidente, **revócala y crea otra inmediatamente**. No basta con borrarla del archivo.
- Mantén activada la confirmación de correo de Supabase y configura CAPTCHA/rate limits desde el panel si empiezan a llegar usuarios reales.
- El código ya añade headers de seguridad, bloquea orígenes cruzados, limita solicitudes y evita guardar el `session_id` de Stripe en la caché. El límite en memoria ayuda contra ráfagas, pero para un ataque grande hace falta WAF/rate limiting administrado en Vercel o un proveedor externo.
- Revisa periódicamente los logs de Vercel, Stripe y Anthropic para detectar gastos o accesos anormales.

## ⚠️ Avisos legales incluidos

El sitio ya muestra el aviso de que **no es asesoría médica** y que hay que
consultar a un profesional. Está en la página principal y en la app.
