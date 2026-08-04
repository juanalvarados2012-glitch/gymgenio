# 🧠 Crear Supabase para GymGenio — Guía paso a paso (para papá)

Supabase será la "memoria" de GymGenio: guarda las cuentas de los usuarios y quién es Pro.
Es **gratis** para empezar. Esto toma unos 10 minutos. Solo hay que crear el proyecto y copiar 3 llaves.

---

## Paso 1 · Crear la cuenta

1. Entre a **https://supabase.com**
2. Clic en **Start your project** (arriba a la derecha).
3. Regístrese. Lo más fácil: **Continue with GitHub** (si tiene GitHub) o con su correo.

## Paso 2 · Crear la organización (solo la primera vez)

- Si le pide crear una **Organization**: póngale un nombre (ej. su nombre o "GymGenio"),
  tipo **Personal**, plan **Free**. Continúe.

## Paso 3 · Crear el proyecto

1. Clic en **New Project**.
2. Llene:
   - **Name:** `gymgenio`
   - **Database Password:** genere una y **guárdela** (clic en "Generate a password" y cópiela a un lugar seguro). No la necesitaremos a diario, pero no la pierda.
   - **Region:** elija la más cercana a usted (ej. *East US* o *South America (São Paulo)*).
3. Clic en **Create new project**.
4. Espere 1–2 minutos mientras se prepara (verá "Setting up project...").

## Paso 4 · Copiar las 3 llaves

Cuando el proyecto esté listo:

1. En el menú de la izquierda, abajo, clic en **Settings** (el engranaje ⚙️).
2. Clic en **API**.
3. Ahí verá y copiará **3 cosas**:

   | Qué copiar | Dónde está | ¿Secreta? |
   |---|---|---|
   | **Project URL** | Sección "Project URL" (ej. `https://xxxx.supabase.co`) | No (pública) |
   | **anon public** | Sección "Project API keys" → fila `anon` `public` | No (pública) |
   | **service_role** | Misma sección → fila `service_role` (clic en el ojo 👁️ para verla) | **SÍ, MUY secreta** |

> ⚠️ La **service_role** es como la llave maestra. **No la pegue en chats ni la comparta.**
> Va directo en Vercel (le explico en el Paso 5). La `anon` y el `URL` sí son públicas y no pasa nada.

## Paso 5 · Guardar las llaves en Vercel

1. Entre a **vercel.com** → proyecto **gymgenio** → **Settings** → **Environment Variables**.
2. Agregue estas 3 (una por una), marcando todos los entornos (Production/Preview/Development):

   | Key (nombre exacto) | Value |
   |---|---|
   | `SUPABASE_URL` | el Project URL |
   | `SUPABASE_ANON_KEY` | la llave `anon public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | la llave `service_role` (secreta) |

3. **Save**.

## Paso 6 · Avisar a Juan

Para que Claude construya el login, necesita el **Project URL** y la **anon key**
(esas dos son públicas, Juan las puede pegar en el chat sin problema).

Lo que sigue después (crear la tabla de la base de datos y conectar el "aviso" de Stripe)
lo guiará Claude con instrucciones igual de simples, cuando lleguemos ahí.

---

### ¿Por qué Supabase y no algo más simple?
Juan pidió cuentas con usuario y contraseña de verdad. Supabase da eso (login seguro) +
la base de datos, gratis, y es de las opciones más usadas y confiables. Buena elección. 👍
