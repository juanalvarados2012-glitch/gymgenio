# 📸 Encender el "guardar historial de comidas" — 1 paso (para papá)

El contador de calorías por foto **YA FUNCIONA** sin esto: el cliente sube su foto y ve las
calorías al instante. Este paso solo sirve para **guardar el historial** y el "total de hoy"
en la cuenta de cada usuario. Toma 2 minutos.

## Paso único · Crear la tabla en Supabase

1. Entre a **https://supabase.com** → proyecto **gymgenio**.
2. En el menú de la izquierda, clic en **SQL Editor** (ícono `</>`).
3. Clic en **New query**, pegue **todo** este bloque y clic en **Run** (o Ctrl+Enter):

```sql
create table if not exists public.comidas (
  id        bigint generated always as identity primary key,
  email     text  not null,
  fecha     date  not null default (now() at time zone 'utc')::date,
  calorias  int,
  proteina  int,
  carbos    int,
  grasa     int,
  alimentos text,
  creado    timestamptz not null default now()
);

create index if not exists comidas_email_fecha on public.comidas (email, fecha);

alter table public.comidas enable row level security;
```

4. Debe decir **Success. No rows returned**. Listo. ✅

> No hay que tocar Vercel: la función `api/comida.js` ya usa la llave `SUPABASE_SERVICE_ROLE_KEY`
> que ya está puesta (la misma del login). Esa llave puede leer/escribir la tabla de forma segura
> desde el servidor, y como activamos RLS sin políticas, **nadie más** puede leerla desde afuera.

---

### ¿Y si no corro esto?
No pasa nada malo: el análisis de la foto sigue funcionando y mostrando calorías + macros.
Lo único que faltaría es el recuadro de "Hoy" y la lista del día. Cuando corra el SQL, se encienden solos.
