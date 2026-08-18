# ▶️ Cómo correr GymGenio

Tres formas, de la más rápida a la más completa. Cada una sirve para algo distinto.

> **Todos los comandos se corren desde la carpeta del proyecto.** Para llegar ahí,
> abre la Terminal y pega esto (con las comillas, porque el nombre tiene espacios):
>
> ```
> cd "/Users/familiaalvarado/Desktop/nano/miniapp gymgenio"
> ```

---

## 1 · Las pruebas — 5 segundos, sin internet

```
npm test
```

Corre las **128 pruebas**. No necesita internet, ni llaves, ni servidor: es solo
Node revisando la lógica.

**Qué debes ver al final:**

```
ℹ tests 128
ℹ pass 128
ℹ fail 0
```

> ⚠️ **Si dice `fail 1` (o más), NO subas ese cambio.** Algo que ya funcionaba se
> rompió. Lee qué prueba falló: el nombre te dice qué se rompió y por qué importa.

Esto es lo primero que corres **antes de subir cualquier cosa**, siempre.

---

## 2 · Ver la app en tu computadora — 10 segundos

```
python3 -m http.server 8000
```

Y abre en el navegador: **http://localhost:8000/app.html**

Para apagarlo: `Ctrl + C` en la Terminal.

### ⚠️ NO abras el archivo con doble clic

Si abres `app.html` haciendo doble clic verás una **pantalla en blanco**. No está
roto: el navegador bloquea los `import` de módulos cuando el archivo se abre
directo del disco (`file://`) por seguridad. Necesita venir de un servidor,
aunque sea uno local. Por eso existe el comando de arriba.

### Qué SÍ funciona así

- ✅ Todo el diseño y la navegación
- ✅ **Las fichas de técnica** (están en `tecnica.js`, dentro de tu máquina)
- ✅ **La voz** que las lee
- ✅ El plan que ya tengas guardado en ese navegador

### Qué NO funciona así

- ❌ Armar un plan nuevo
- ❌ Entrar con cuenta
- ❌ Guardar en la nube
- ❌ La revisión por video y el contador de comidas

Todo eso vive en la carpeta `api/`, que son **funciones de servidor**. Un servidor
estático como este no las sabe correr: te va a dar error 404. Es lo esperado, no
es un fallo tuyo.

**Para qué sirve entonces:** para trabajar en el diseño, los textos, las fichas de
técnica y la voz sin gastar ni una llamada de IA. Que es la mayoría del trabajo.

---

## 3 · La app de verdad — ya está en internet

**https://gymgenio.vercel.app**

Aquí funciona **todo**, porque Vercel sí corre las funciones de `api/` y tiene las
llaves guardadas.

**Cómo llega ahí tu código:**

```
git add -A
git commit -m "lo que cambiaste"
git push
```

Con eso Vercel se entera solo y publica en 1–2 minutos. No hay que hacer nada más.

> Antes de `git push`, siempre `npm test`.

---

## ¿Cuál uso?

| Lo que quiero hacer | Uso |
|---|---|
| Cambié código y quiero saber si rompí algo | `npm test` |
| Mover un botón, cambiar un texto, escribir una ficha nueva | Servidor local (2) |
| Probar armar un plan, el login, la nube o el video | El sitio en internet (3) |
| Probar en el teléfono | El sitio en internet (3) |

**Lo de la voz y la revisión por video hay que probarlo en un teléfono de verdad**,
no en la computadora: la voz en iPhone necesita que toques algo antes de hablar, y
el video hay que grabarlo con la cámara, no subir un archivo.

---

## Si algo sale mal

**`npm test` dice "command not found"** → no estás en la carpeta del proyecto.
Vuelve a pegar el comando `cd` de arriba.

**El navegador muestra la app vieja** → el ayudante que la hace funcionar sin
internet guardó una copia. Recarga con `Cmd + Shift + R`.

**Pantalla en blanco** → casi siempre es haber abierto el archivo con doble clic
en vez de con el servidor. Si no, abre la consola del navegador
(`Cmd + Option + J`) y mira el error en rojo: ahí dice qué archivo falló.

**El puerto 8000 está ocupado** → usa otro: `python3 -m http.server 8001`.
