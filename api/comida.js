// 🧞📸 El OJO de GymGenio
// Recibe la FOTO de un plato y devuelve calorías + proteína, carbos y grasa.
// Igual que api/plan.js: vive en Vercel (nadie ve el código ni la llave) y
// NO confía en el navegador: el servidor decide solo si el usuario es Pro.
// Guarda cada comida en Supabase para armar el "total de hoy" y el historial.

// Saca el correo del usuario a partir de su token de Supabase.
async function emailDelToken(auth) {
  if (!auth || auth.indexOf('Bearer ') !== 0) return '';
  const token = auth.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!token || !url) return '';
  try {
    const r = await fetch(url + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: key }
    });
    if (!r.ok) return '';
    const u = await r.json();
    return u && u.email ? u.email : '';
  } catch (e) {
    return '';
  }
}

// Le pregunta a Stripe si ese correo tiene una suscripción ACTIVA.
async function tieneSuscripcion(email) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk || !email) return false;
  try {
    const c = await fetch(
      'https://api.stripe.com/v1/customers?limit=10&email=' + encodeURIComponent(email),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!c.ok) return false;
    const lista = await c.json();
    for (const cliente of (lista.data || [])) {
      for (const estado of ['active', 'trialing']) {
        const s = await fetch(
          'https://api.stripe.com/v1/subscriptions?limit=1&status=' + estado + '&customer=' + encodeURIComponent(cliente.id),
          { headers: { Authorization: 'Bearer ' + sk } }
        );
        if (!s.ok) continue;
        const subs = await s.json();
        if ((subs.data || []).length > 0) return true;
      }
    }
  } catch (e) {
    console.error('No se pudo revisar Stripe:', e);
  }
  return false;
}

// Plan B: acaba de pagar y viene de Stripe con ?session_id=...
async function pagoRecienHecho(sessionId) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk || !sessionId) return false;
  try {
    const ver = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!ver.ok) return false;
    const sesion = await ver.json();
    return sesion.status === 'complete' && sesion.payment_status === 'paid';
  } catch (e) {
    console.error('No se pudo verificar el pago:', e);
    return false;
  }
}

// La fecha de HOY en texto (AAAA-MM-DD), en horario universal.
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// Lee de Supabase las comidas de HOY de ese correo y suma el total.
// Si la tabla todavía no existe (papá no corrió el SQL), devuelve null sin romper.
async function comidasDeHoy(email) {
  const url = process.env.SUPABASE_URL;
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srv || !email) return null;
  try {
    const q = url + '/rest/v1/comidas'
      + '?email=eq.' + encodeURIComponent(email)
      + '&fecha=eq.' + hoyISO()
      + '&select=calorias,proteina,carbos,grasa,alimentos,creado'
      + '&order=creado.desc';
    const r = await fetch(q, { headers: { apikey: srv, Authorization: 'Bearer ' + srv } });
    if (!r.ok) return null; // tabla no creada u otro problema: no rompemos
    const items = await r.json();
    const total = { calorias: 0, proteina: 0, carbos: 0, grasa: 0 };
    for (const it of items) {
      total.calorias += Number(it.calorias) || 0;
      total.proteina += Number(it.proteina) || 0;
      total.carbos   += Number(it.carbos)   || 0;
      total.grasa    += Number(it.grasa)    || 0;
    }
    return { total, items };
  } catch (e) {
    return null;
  }
}

// Guarda una comida en Supabase. Si la tabla no existe, no pasa nada (se ignora).
async function guardarComida(email, a) {
  const url = process.env.SUPABASE_URL;
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srv || !email) return;
  try {
    await fetch(url + '/rest/v1/comidas', {
      method: 'POST',
      headers: {
        apikey: srv,
        Authorization: 'Bearer ' + srv,
        'content-type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        email,
        fecha: hoyISO(),
        calorias: a.calorias || 0,
        proteina: a.proteina || 0,
        carbos: a.carbos || 0,
        grasa: a.grasa || 0,
        alimentos: (a.alimentos || []).join(', ')
      })
    });
  } catch (e) {
    console.error('No se pudo guardar la comida:', e);
  }
}

export default async function handler(req, res) {
  const es = (req.query && req.query.idioma === 'es')
    || (req.body && req.body.idioma === 'es');

  // 🚪 EL GUARDIA: esta función es SOLO para Pro.
  const email = await emailDelToken(req.headers.authorization || '');
  const sessionId = (req.body && req.body.sessionId) || (req.query && req.query.sessionId) || '';
  let esPro = await tieneSuscripcion(email);
  if (!esPro) esPro = await pagoRecienHecho(sessionId);

  // GET = solo devolver el "total de hoy" (para cuando la app abre).
  if (req.method === 'GET') {
    if (!esPro) return res.status(200).json({ esPro: false, hoy: null });
    const hoy = await comidasDeHoy(email);
    return res.status(200).json({ esPro: true, hoy });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!esPro) {
    return res.status(403).json({
      error: es
        ? 'El contador de calorías por foto es parte de GymGenio Pro.'
        : 'The photo calorie counter is part of GymGenio Pro.'
    });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({
      error: 'Falta la llave. Tu papá debe agregar ANTHROPIC_API_KEY en Vercel → Settings → Environment Variables.'
    });
  }

  // La foto llega como "data:image/jpeg;base64,....". Separamos tipo y datos.
  const imagen = (req.body && req.body.imagen) || '';
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(imagen);
  if (!m) {
    return res.status(400).json({
      error: es ? 'No pude leer la foto. Intenta con otra imagen.'
                : "I couldn't read the photo. Try another image."
    });
  }
  const mediaType = m[1].toLowerCase();
  const datosImg = m[2];

  const prompt = es
    ? `Eres el nutricionista visual de GymGenio. Te muestro la FOTO de una comida.
Míralas con cuidado y estima los valores para TODO lo que se ve en el plato (porción completa).

Reglas:
- Estima de forma realista. Si hay varios alimentos, súmalos.
- Calorías en kcal (número entero). Proteína, carbohidratos y grasa en GRAMOS (números enteros).
- Si NO es comida (una persona, un objeto, etc.), pon "esComida": false y todo en 0.
- Si la foto es borrosa o no se ve bien la porción, baja la "confianza" y dilo amablemente en "nota".
- Sé breve y motivador en la nota. Nada de asesoría médica.

Responde ÚNICAMENTE con un JSON válido (sin texto antes ni después, sin bloques de código) con esta forma exacta:
{
  "esComida": true,
  "alimentos": ["arroz", "pollo a la plancha", "ensalada"],
  "calorias": 620,
  "proteina": 45,
  "carbos": 55,
  "grasa": 18,
  "confianza": "alta",
  "nota": "Buen balance de proteína. Ojo con el aceite de la ensalada."
}`
    : `You are GymGenio's visual nutritionist. I'm showing you a PHOTO of a meal.
Look carefully and estimate the values for EVERYTHING on the plate (full portion).

Rules:
- Estimate realistically. If there are several foods, add them up.
- Calories in kcal (whole number). Protein, carbs and fat in GRAMS (whole numbers).
- If it is NOT food (a person, an object, etc.), set "esComida": false and everything to 0.
- If the photo is blurry or the portion is unclear, lower "confianza" and say so kindly in "nota".
- Keep the note short and motivating. No medical advice.

Reply with ONLY a valid JSON object (no text before or after, no code fences) with exactly this shape:
{
  "esComida": true,
  "alimentos": ["rice", "grilled chicken", "salad"],
  "calorias": 620,
  "proteina": 45,
  "carbos": 55,
  "grasa": 18,
  "confianza": "alta",
  "nota": "Nice protein balance. Watch the oil on the salad."
}`;

  try {
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: datosImg } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('Error de Anthropic (comida):', detalle);
      return res.status(502).json({
        error: es ? 'El genio está descansando. Intenta de nuevo en un momento.'
                  : 'The genie is taking a breather. Try again in a moment.'
      });
    }

    const datos = await respuesta.json();
    let texto = (datos.content || [])
      .filter(function (b) { return b && b.type === 'text' && b.text; })
      .map(function (b) { return b.text; })
      .join('\n');

    texto = texto.replace(/```(?:json)?/gi, '').trim();
    const ini = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (ini !== -1 && fin !== -1) texto = texto.slice(ini, fin + 1);

    let a;
    try {
      a = JSON.parse(texto);
    } catch (e) {
      console.error('No se pudo leer el JSON (comida):', texto.slice(0, 400));
      return res.status(502).json({
        error: es ? 'El genio se confundió mirando tu plato. Intenta de nuevo.'
                  : 'The genie got confused looking at your plate. Try again.'
      });
    }

    // Limpiamos los números para que siempre sean enteros >= 0.
    const ent = v => Math.max(0, Math.round(Number(v) || 0));
    const analisis = {
      esComida: a.esComida !== false,
      alimentos: Array.isArray(a.alimentos) ? a.alimentos.slice(0, 12).map(String) : [],
      calorias: ent(a.calorias),
      proteina: ent(a.proteina),
      carbos: ent(a.carbos),
      grasa: ent(a.grasa),
      confianza: ['alta', 'media', 'baja'].indexOf(a.confianza) !== -1 ? a.confianza : 'media',
      nota: typeof a.nota === 'string' ? a.nota.slice(0, 240) : ''
    };

    // Solo guardamos si de verdad es comida.
    if (analisis.esComida && analisis.calorias > 0) {
      await guardarComida(email, analisis);
    }
    const hoy = await comidasDeHoy(email);

    return res.status(200).json({ analisis, hoy, esPro: true });
  } catch (error) {
    console.error('Error inesperado (comida):', error);
    return res.status(500).json({
      error: es ? 'Algo salió mal. Intenta de nuevo en un momento.'
                : 'Something went wrong. Try again in a moment.'
    });
  }
}
