// 🗑️ BORRAR MIS DATOS — el derecho de supresión, cumplido de verdad.
//
// POR QUÉ EXISTE
// La política de privacidad promete que cualquiera puede borrar todo lo suyo.
// Una promesa así, escrita y no cumplida, es peor que no escribirla: en
// California (CCPA), en Europa (RGPD) y en Washington (My Health My Data) el
// borrado es un derecho con plazo, y no cumplirlo es justo por lo que llegan
// las multas y las demandas. Así que esto no es un correo que alguien tiene que
// leer y atender a mano: es un botón que borra.
//
// QUÉ BORRA
//   · la fila de `planes`  -> plan, ruta, progreso, pesos, check-ins
//   · las filas de `comidas` -> el registro de comidas de esa persona
//   · la cuenta en sí (auth) -> deja de existir el usuario
// Las fotos y los videos no aparecen aquí porque nunca se guardaron.
//
// LO QUE NO BORRA, Y SE DICE CLARO
// Los recibos que Stripe guarda por obligación fiscal. Nadie puede borrar eso,
// ni nosotros ni la persona. La política de privacidad lo dice también.
//
// 🔒 SOLO TÚ PUEDES BORRAR LO TUYO. El id y el correo salen del token de la
// sesión, nunca de lo que mande el navegador en el cuerpo. Si alguien manda el
// correo de otra persona, aquí ni se mira.

import {
  fetchConTiempo, origenPermitido, crearLimitador,
  usuarioDelToken, tieneSuscripcion
} from './_comun.js';

// Borrar es raro y definitivo: 5 intentos por hora sobran, y frenan a un robot
// que quiera usar esta puerta para molestar.
const freno = crearLimitador({ ventanaMs: 60 * 60 * 1000, maximo: 5 });

function cabecerasServicio() {
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: srv, Authorization: 'Bearer ' + srv, 'content-type': 'application/json' };
}

// Borra en una tabla con un filtro de PostgREST. Devuelve true/false, y si la
// tabla ni existe (proyecto sin la nube encendida) lo cuenta como hecho: no hay
// nada que borrar ahí.
async function borrarEn(tabla, filtro) {
  const url = process.env.SUPABASE_URL;
  if (!url) return false;
  try {
    const r = await fetchConTiempo(
      url + '/rest/v1/' + tabla + '?' + filtro,
      { method: 'DELETE', headers: { ...cabecerasServicio(), Prefer: 'return=minimal' } }
    );
    return r.ok || r.status === 404;
  } catch (e) {
    console.error('No se pudo borrar en ' + tabla + ':', e);
    return false;
  }
}

// Cierra la cuenta. Es lo último que se hace: si esto falla, los datos ya se
// fueron igual, que es lo que de verdad importa.
async function borrarCuenta(id) {
  const url = process.env.SUPABASE_URL;
  if (!url || !id) return false;
  try {
    const r = await fetchConTiempo(
      url + '/auth/v1/admin/users/' + encodeURIComponent(id),
      { method: 'DELETE', headers: cabecerasServicio() }
    );
    return r.ok;
  } catch (e) {
    console.error('No se pudo cerrar la cuenta:', e);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!origenPermitido(req)) return res.status(403).json({ error: 'Origen no permitido.' });

  const idioma = String((req.headers && req.headers['accept-language']) || '');
  const es = idioma.toLowerCase().startsWith('es');

  const usuario = await usuarioDelToken(req.headers.authorization || '');
  if (!usuario.email || !usuario.id) {
    return res.status(401).json({
      error: es ? 'Inicia sesión para borrar tus datos.' : 'Log in to delete your data.'
    });
  }

  const limite = freno.revisar('borrar:' + usuario.email);
  if (!limite.permitido) {
    res.setHeader('Retry-After', String(limite.espera));
    return res.status(429).json({
      error: es ? 'Demasiados intentos. Prueba en un rato.' : 'Too many attempts. Try again later.'
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error: es
        ? 'El borrado automático no está configurado. Escríbenos y lo hacemos a mano el mismo día.'
        : 'Automatic deletion is not configured. Email us and we will do it by hand the same day.'
    });
  }

  // 💳 Si sigue pagando, primero se cancela el cobro. Borrarle la cuenta
  // dejándole la suscripción viva sería cobrarle por algo que ya no existe —
  // y eso sí que es un problema de verdad, no una molestia.
  if (await tieneSuscripcion(usuario.email)) {
    return res.status(409).json({
      error: es
        ? 'Tienes una suscripción activa. Cancélala primero (desde tu recibo de Stripe o escribiéndonos) y después borra tus datos, para que no te sigan cobrando.'
        : 'You have an active subscription. Cancel it first (from your Stripe receipt or by emailing us), then delete your data, so you are not charged again.'
    });
  }

  const planes = await borrarEn('planes', 'user_id=eq.' + encodeURIComponent(usuario.id));
  const comidas = await borrarEn('comidas', 'email=eq.' + encodeURIComponent(usuario.email));
  const cuenta = await borrarCuenta(usuario.id);

  if (!planes || !comidas) {
    return res.status(500).json({
      error: es
        ? 'No pudimos borrar todo. Escríbenos y lo terminamos a mano hoy mismo.'
        : "We couldn't delete everything. Email us and we will finish it by hand today."
    });
  }

  return res.status(200).json({ ok: true, planes, comidas, cuenta });
}
