# ⚖️ Lo legal de GymGenio — qué se hizo y qué falta (para papá)

GymGenio cobra dinero, guarda datos de salud (peso, edad, lesiones), mira fotos de
comida, mira videos del cuerpo de una persona y hace anuncios en Facebook. Eso son
**cinco frentes por los que a una app la pueden demandar**, y hasta ahora la app no
tenía ni una línea escrita de defensa.

Esto lo arregla. Abajo está, primero, lo que ya quedó hecho; después, **las cuatro
cosas que solo puedes hacer tú** (son 30 minutos), y por último las que valdría la
pena hacer si esto crece.

---

## 🚨 Lo urgente: lo que solo puede hacer un adulto

### 1. ✅ Titular: Nelson Alvarado — falta la ciudad y el código postal

Juan tiene 14 años. Un menor de edad **no puede firmar contratos**: un contrato
firmado por un menor se puede anular, y los Términos del Servicio son un contrato con
cada persona que usa la app. Por eso el titular es **Nelson Alvarado**, y ya está
puesto en `privacidad.html` y `terminos.html` (dos veces en cada uno).

La dirección quedó como **41964 Rondo St, Unit 2402, [CIUDAD], CA [CÓDIGO POSTAL]**.
Falta rellenar esos dos huecos: una dirección sin ciudad ni ZIP no es una dirección a
la que se pueda mandar una carta, y el sentido de ponerla es justamente ese.

```
grep -n "CIUDAD\|CÓDIGO POSTAL" *.html
```

Son 4 sitios, y se arreglan en un minuto.

> ⚠️ **Ojo con poner la dirección de casa.** Esa dirección queda **pública en
> internet**, la puede leer cualquiera y la copian los robots que rastrean webs. Es
> legal y muchísima gente lo hace, pero lo normal cuando alguien trabaja desde casa es
> usar un apartado postal (~$20 al año en la oficina de correos) o un buzón virtual
> (~$10 al mes), y ese es el que se publica. Si algún día se abre una LLC, se usa la
> dirección de la LLC y este problema desaparece solo.

### 2. Poner el enlace de cancelar de Stripe (5 minutos)

La ley de renovación automática de California (y la federal, ROSCA) exige que
cancelar sea **tan fácil como suscribirse**. Ahora mismo la app dice "cancela desde tu
recibo de Stripe o escríbenos". Eso cumple, pero lo limpio es encender el **Customer
Portal** de Stripe:

1. Entra a Stripe → **Settings** → **Billing** → **Customer portal**.
2. Actívalo y marca **"Customers can cancel subscriptions"** → *immediately*.
3. Marca también que Stripe mande el enlace del portal en cada recibo.

Con eso, quien pague cancela solo con un clic y nunca llega una queja.

### 3. Revisar el correo de contacto (2 minutos)

Todo lo legal apunta a `juanalvarados2012@gmail.com`. Ese correo pasa a ser el sitio
donde llegan las solicitudes de borrado de datos, las quejas y — si algún día pasa —
los avisos de conflicto. **Hay que leerlo.** Una solicitud de privacidad ignorada
durante 45 días es exactamente lo que convierte una molestia en una multa.

Cuando haya dominio propio, lo suyo es `privacidad@gymgenio.com` y que llegue al
correo de un adulto.

### 4. Correr el borrado de datos en Supabase (5 minutos, solo si ya hiciste la nube)

El botón **"Borrar mis datos"** de la página de cuenta llama a `/api/borrar-datos`, y
ese archivo necesita la llave `SUPABASE_SERVICE_ROLE_KEY` que ya está en Vercel. Si
esa llave existe, no hay que hacer nada más: ya funciona.

Si no existe todavía, el botón avisa con educación ("escríbenos y lo hacemos a mano el
mismo día") en vez de romperse. Pero entonces **hay que hacerlo a mano de verdad**
cuando alguien lo pida.

---

## ✅ Lo que ya quedó hecho

### Tres documentos, en inglés y en español

| Página | Qué protege |
|---|---|
| `privacidad.html` | Qué datos se recogen, con quién se comparten, cuánto duran y cómo se borran. Cubre California (CCPA/CPRA), el resto de estados, Europa (RGPD), **Washington My Health My Data** (datos de salud, y esa ley deja demandar a título personal), COPPA (menores) y las leyes biométricas de Illinois y Texas. |
| `terminos.html` | El contrato: quién puede usarla, la suscripción y cómo se cancela, **asunción de riesgo**, límite de responsabilidad, indemnización, y **arbitraje individual con renuncia a demandas colectivas** (con salida de 30 días, que es lo que la hace válida). |
| `salud.html` | El aviso médico de verdad: cuándo hay que ver a un doctor antes, cuándo parar, y los teléfonos de ayuda. Es la página que más pesa si alguien se lesiona. |

Los tres se leen en el idioma de la persona y se pueden imprimir.

### Y en la app

- **Casilla obligatoria al crear cuenta.** Sin marcarla no se crea nada. Y al crearla
  se guarda **con la cuenta** qué versión aceptó y en qué fecha exacta. Eso es la
  prueba: "los términos estaban en la web" no vale, "esta persona los aceptó el 22 de
  agosto a las 19:04" sí.
- **Aviso pegado al botón de armar el plan** (no escondido en el pie): al armar tu
  plan aceptas los términos, y esto no es asesoría médica.
- **El pixel de Facebook ya no se carga sin permiso.** Antes se cargaba siempre, para
  todo el mundo. Ahora hay un aviso que pregunta, y si dice que no —o si su navegador
  manda la señal *Global Privacy Control*— nunca se contacta a Facebook. Se quitó
  también el pixel invisible que iba en un `<noscript>`.
- **"Tus opciones de privacidad"** en el pie de todas las páginas (California lo pide
  literalmente).
- **Permiso expreso antes de la primera revisión por video.** Se le explica que el
  video no sale de su teléfono, que las fotos no se guardan y que no se le saca ninguna
  huella biométrica. Illinois deja demandar directamente por no pedir ese permiso.
- **Botón "Borrar mis datos"** que borra de verdad: plan, progreso, comidas y la cuenta.
  Si hay suscripción activa avisa de cancelarla primero, para no dejar a nadie pagando
  por una cuenta que ya no existe.
- **Edad mínima 13**, en el formulario *y* en el servidor (antes dejaba 12; por debajo
  de 13 la ley federal COPPA no permite recoger datos de un menor).
- **Renovación automática dicha claro** junto a los dos botones de pago: $14.99 al mes,
  se renueva solo, se cancela con un clic.
- **Pruebas automáticas** (`pruebas/legal.test.js`): si alguien vuelve a quitar un
  enlace legal, o el pixel vuelve a cargarse sin permiso, o la edad mínima baja de 13,
  `npm test` se pone rojo.

---

## 📌 Si esto crece: lo siguiente

1. **Abrir una LLC** (en California, ~$70 de registro + $800/año de impuesto mínimo).
   Es lo único que de verdad separa el dinero de la casa del dinero de la app: sin
   ella, una demanda va contra tu patrimonio personal. Cuando exista, se cambia el
   nombre del titular en los tres archivos y ya.
2. **Seguro de responsabilidad civil general + tecnología** (hay pólizas para apps
   desde ~$40/mes). Para una app de fitness es lo normal.
3. **Dominio propio** (`gymgenio.com`) y correos legales de verdad.
4. **Registrar la marca** GymGenio si el nombre empieza a valer algo.
5. **Revisar los documentos con un abogado** antes de gastar en serio en anuncios.
   Lo que hay aquí es sólido y está hecho con las leyes que aplican, pero una revisión
   de una hora de alguien con licencia en California vale lo que cuesta el día que
   llegue una carta.

> ⚠️ **Esto no es asesoría legal.** Lo escribió un asistente de IA basándose en cómo
> son las políticas de las apps de salud en Estados Unidos. Es muchísimo mejor que no
> tener nada, y cubre lo que hay que cubrir — pero no reemplaza a un abogado.

---

## 🔁 Cuando cambie la app, cambia esto

Si algún día se guarda un dato nuevo, entra un proveedor nuevo, o se empieza a guardar
una foto:

1. Añádelo a la tabla de la sección 2 de `privacidad.html` (las dos versiones).
2. Si es un proveedor nuevo, a la tabla de la sección 4.
3. Sube la fecha de "Última actualización" en las dos versiones.
4. Si el cambio es grande, sube también `VERSION_LEGAL` en `login.html`: así a la
   gente se le vuelve a pedir la aceptación.
