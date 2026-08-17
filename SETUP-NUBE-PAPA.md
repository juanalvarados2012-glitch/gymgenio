# ☁️ Encender la nube de GymGenio — Guía paso a paso (para papá)

Hasta ahora el plan de entrenamiento vivía **solo dentro del navegador** de cada persona.
Si alguien perdía el teléfono en la semana 6 de su ruta, perdía las seis semanas.
Vendemos un plan de 8 semanas: el guardado tiene que aguantar 8 semanas.

Esto crea la tabla donde se guardan los planes. Son **5 minutos** y se hace **una sola vez**.

> **Mientras esto no se haga, la app sigue funcionando exactamente igual que hoy.**
> No se rompe nada. Simplemente la nube queda apagada y todo se guarda en el teléfono,
> como antes. Se puede hacer con calma.

---

## Paso 1 · Entrar al editor de la base de datos

1. Entre a **https://supabase.com** e inicie sesión.
2. Abra el proyecto **gymgenio**.
3. En el menú de la izquierda, clic en **SQL Editor** (el icono `>_`).
4. Clic en **New query**.

## Paso 2 · Pegar esto y darle a Run

Copie **todo** el bloque de abajo, péguelo en el recuadro grande, y clic en **Run**
(abajo a la derecha, o Ctrl+Enter).

```sql
-- La tabla: una fila por persona, con todo su progreso dentro.
create table if not exists public.planes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- 🔒 EL CANDADO. Esto es lo más importante de toda la página.
-- Sin esta línea, cualquiera con la llave pública podría leer el progreso,
-- el peso y la meta de TODAS las personas registradas.
alter table public.planes enable row level security;

-- Cada quien toca solo su propia fila. Cuatro permisos, uno por cada cosa
-- que se puede hacer: ver, crear, cambiar y borrar.
create policy "ver lo mio"    on public.planes for select
  using (auth.uid() = user_id);

create policy "crear lo mio"  on public.planes for insert
  with check (auth.uid() = user_id);

create policy "cambiar lo mio" on public.planes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Este permite que una persona borre sus propios datos si lo pide.
create policy "borrar lo mio" on public.planes for delete
  using (auth.uid() = user_id);
```

Debe aparecer un mensaje verde tipo **Success. No rows returned**. Eso está bien:
la tabla se creó vacía, que es justo lo que queremos.

## Paso 3 · Comprobar que el candado quedó puesto

Esto no es opcional. Es la diferencia entre guardar datos y regalarlos.

1. Menú de la izquierda → **Table Editor**.
2. Clic en la tabla **planes**.
3. Arriba debe verse la etiqueta **RLS enabled** (o un candado cerrado).

Si dice **RLS disabled** o sale un aviso rojo de "unrestricted", **algo salió mal**:
vuelva al Paso 2 y corra otra vez la línea que empieza con `alter table`.

## Paso 4 · Avisar a Juan

Con eso ya está. No hay que copiar ninguna llave nueva: la app usa las mismas
`SUPABASE_URL` y `SUPABASE_ANON_KEY` que ya están en Vercel desde el login.

---

## Preguntas normales

**¿Esto cuesta dinero?**
No. El plan gratis de Supabase incluye de sobra para esto. Cada persona ocupa
unos pocos kilobytes: miles de usuarios caben en el plan gratis.

**¿Qué se guarda exactamente?**
El plan de entrenamiento, qué ejercicios marcó, qué días entrenó, su meta de peso
y los pesos que anotó. Nada más: ni correos, ni pagos (eso ya lo maneja Stripe),
ni fotos de comida (esas se analizan y se botan, nunca se guardan).

**¿Y si alguien quiere que borremos sus datos?**
El permiso "borrar lo mio" del Paso 2 lo hace posible. Cuando alguien lo pida,
Juan puede borrar esa fila desde el Table Editor en 10 segundos.

**¿Qué pasa si me equivoco y quiero empezar de nuevo?**
Corra `drop table public.planes;` en el SQL Editor y repita el Paso 2.
Ojo: eso borra el progreso guardado de todos. Mientras haya pocos usuarios,
no es grave; más adelante, sí.
