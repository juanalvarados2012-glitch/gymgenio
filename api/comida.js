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
Tu trabajo es estimar las calorías LO MÁS PRECISO POSIBLE. Para lograrlo, piensa alimento por alimento ANTES de dar el total.

Cómo estimar el tamaño de la porción (esto es lo más importante para acertar):
- Usa objetos de referencia visibles para calcular el tamaño: un plato normal mide ~26 cm, un tenedor ~19 cm, una cuchara ~15 cm, una lata ~12 cm de alto, una mano cerrada ~1 taza.
- Estima los GRAMOS de cada alimento por separado, luego sus kcal, y al final SUMA.
- Cuenta las grasas escondidas que no se ven pero casi siempre están: aceite de cocina, mantequilla, aderezos, salsas, azúcar. Súmalas de forma realista (una comida cocinada casi nunca es "limpia").
- Usa densidades calóricas estándar por alimento.

Reglas:
- Calorías en kcal (entero). Proteína, carbohidratos y grasa en GRAMOS (enteros).
- Da también un RANGO honesto (rangoMin y rangoMax) que refleje tu incertidumbre. Si la porción no se ve clara, haz el rango más ancho y baja la "confianza".
- Si NO es comida (persona, objeto, etc.), pon "esComida": false y todo en 0.
- Nota breve y motivadora. Nada de asesoría médica.

Responde ÚNICAMENTE con un JSON válido (sin texto antes ni después, sin bloques de código) con esta forma exacta:
{
  "esComida": true,
  "detalle": [
    { "nombre": "pollo a la plancha", "gramos": 150, "kcal": 250 },
    { "nombre": "arroz blanco", "gramos": 180, "kcal": 235 },
    { "nombre": "ensalada con aceite", "gramos": 90, "kcal": 135 }
  ],
  "alimentos": ["pollo a la plancha", "arroz blanco", "ensalada con aceite"],
  "calorias": 620,
  "rangoMin": 540,
  "rangoMax": 720,
  "proteina": 45,
  "carbos": 55,
  "grasa": 18,
  "confianza": "media",
  "nota": "Buen balance de proteína. Ojo con el aceite de la ensalada."
}`
    : `You are GymGenio's visual nutritionist. I'm showing you a PHOTO of a meal.
Your job is to estimate the calories AS ACCURATELY AS POSSIBLE. To do that, reason food by food BEFORE giving a total.

How to size the portion (this is what matters most for accuracy):
- Use visible reference objects to gauge size: a normal plate is ~26 cm, a fork ~19 cm, a spoon ~15 cm, a can ~12 cm tall, a closed fist ~1 cup.
- Estimate the GRAMS of each food separately, then its kcal, and SUM at the end.
- Account for hidden fats you can't see but are almost always there: cooking oil, butter, dressings, sauces, sugar. Add them realistically (a cooked meal is rarely "clean").
- Use standard calorie densities per food.

Rules:
- Calories in kcal (whole number). Protein, carbs and fat in GRAMS (whole numbers).
- Also give an honest RANGE (rangoMin and rangoMax) reflecting your uncertainty. If the portion is unclear, widen the range and lower "confianza".
- If it is NOT food (a person, an object, etc.), set "esComida": false and everything to 0.
- Short, motivating note. No medical advice.

Reply with ONLY a valid JSON object (no text before or after, no code fences) with exactly this shape:
{
  "esComida": true,
  "detalle": [
    { "nombre": "grilled chicken", "gramos": 150, "kcal": 250 },
    { "nombre": "white rice", "gramos": 180, "kcal": 235 },
    { "nombre": "salad with oil", "gramos": 90, "kcal": 135 }
  ],
  "alimentos": ["grilled chicken", "white rice", "salad with oil"],
  "calorias": 620,
  "rangoMin": 540,
  "rangoMax": 720,
  "proteina": 45,
  "carbos": 55,
  "grasa": 18,
  "confianza": "media",
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
        max_tokens: 1600,
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

    // Desglose por alimento (nombre + gramos + kcal). Es lo que da precisión.
    const detalle = Array.isArray(a.detalle)
      ? a.detalle.slice(0, 12).map(d => ({
          nombre: String((d && d.nombre) || '').slice(0, 60),
          gramos: ent(d && d.gramos),
          kcal: ent(d && d.kcal)
        })).filter(d => d.nombre)
      : [];

    // Los nombres para los chips y el historial. Si no vinieron, los sacamos del desglose.
    const alimentos = (Array.isArray(a.alimentos) && a.alimentos.length)
      ? a.alimentos.slice(0, 12).map(String)
      : detalle.map(d => d.nombre);

    const calorias = ent(a.calorias);

    // Rango honesto. Si la IA no lo dio o vino al revés, lo armamos como ±20%.
    let rangoMin = ent(a.rangoMin);
    let rangoMax = ent(a.rangoMax);
    if (!(rangoMin > 0) || !(rangoMax > 0) || rangoMin > rangoMax) {
      rangoMin = Math.round(calorias * 0.8);
      rangoMax = Math.round(calorias * 1.2);
    }

    const analisis = {
      esComida: a.esComida !== false,
      detalle,
      alimentos,
      calorias,
      rangoMin,
      rangoMax,
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
