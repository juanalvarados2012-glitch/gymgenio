// 🧞 El CEREBRO de GymGenio
// Esta función vive en el servidor de Vercel (nadie puede ver el código ni la llave).
// Recibe la meta del usuario, se la pasa a la IA de Anthropic, y devuelve el plan.
// NO confía en el navegador: el servidor decide solo si el usuario es Pro.

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

// 🛡️ LÍMITE POR IP: frena a los robots que quieran gastar tu presupuesto de IA.
// Vive en la memoria de la función (se reinicia si Vercel la duerme), pero corta
// en seco un bucle desde una misma IP. Es gratis y no necesita base de datos.
const PETICIONES = new Map(); // ip -> [horas de cada intento]
const VENTANA_MS = 60 * 1000; // 1 minuto
const MAX_POR_VENTANA = 6;    // máximo 6 planes por minuto por IP

function ipDe(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || 'desconocida';
}

function pasaLimite(ip) {
  const ahora = Date.now();
  if (PETICIONES.size > 5000) PETICIONES.clear(); // no dejar crecer la memoria
  const previas = (PETICIONES.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  if (previas.length >= MAX_POR_VENTANA) {
    PETICIONES.set(ip, previas);
    return false;
  }
  previas.push(ahora);
  PETICIONES.set(ip, previas);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const cuerpo = req.body || {};
  // El plan se escribe en el idioma que el usuario eligió en la página (inglés por defecto).
  const es = cuerpo.idioma === 'es';
  const sessionId = cuerpo.sessionId;

  // 🛡️ Freno anti-robots ANTES de gastar un centavo de IA.
  if (!pasaLimite(ipDe(req))) {
    return res.status(429).json({
      error: es ? 'Vas muy rápido. Espera unos segundos y vuelve a intentarlo.'
                : 'You are going too fast. Wait a few seconds and try again.'
    });
  }

  // La llave secreta la lee Vercel de su caja fuerte. NUNCA está escrita aquí.
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({
      error: 'Falta la llave. Tu papá debe agregar ANTHROPIC_API_KEY en Vercel → Settings → Environment Variables.'
    });
  }

  // 🧹 Limpiamos TODO lo que manda el navegador: recortamos los textos largos
  // (para que nadie infle el costo de IA ni "inyecte" instrucciones) y volvemos
  // los números a rangos con sentido.
  const txt = (v, max) => (v == null ? '' : String(v).slice(0, max));
  const num = (v, min, max) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : '';
  };

  const objetivo     = txt(cuerpo.objetivo, 200);
  const nivel        = txt(cuerpo.nivel, 40);
  const dias         = num(cuerpo.dias, 1, 7);
  const minutos      = num(cuerpo.minutos, 5, 180);
  const equipo       = txt(cuerpo.equipo, 200);
  const restricciones = txt(cuerpo.restricciones, 400);
  const edad         = num(cuerpo.edad, 10, 100);
  const peso         = num(cuerpo.peso, 25, 400);
  const estatura     = num(cuerpo.estatura, 100, 250);
  const sexo         = txt(cuerpo.sexo, 20);
  const ajuste       = txt(cuerpo.ajuste, 400);

  if (!objetivo || !nivel || !dias || !minutos) {
    return res.status(400).json({
      error: es ? 'Faltan datos para armar tu plan.' : 'Some details are missing to build your plan.'
    });
  }

  // 🚪 EL GUARDIA: Pro solo si Stripe lo confirma.
  const email = await emailDelToken(req.headers.authorization || '');
  let esPro = await tieneSuscripcion(email);
  if (!esPro) esPro = await pagoRecienHecho(sessionId);

  // Datos del cuerpo (son opcionales: si no los puso, no los inventamos).
  const datosCuerpo = [
    edad ? (es ? `- Edad: ${edad} años` : `- Age: ${edad}`) : '',
    peso ? (es ? `- Peso: ${peso} kg` : `- Weight: ${peso} kg`) : '',
    estatura ? (es ? `- Estatura: ${estatura} cm` : `- Height: ${estatura} cm`) : '',
    sexo ? (es ? `- Sexo: ${sexo}` : `- Sex: ${sexo}`) : ''
  ].filter(Boolean).join('\n') || (es
    ? '- No compartió edad, peso ni estatura (no los inventes ni los pidas: arma el plan igual).'
    : '- Did not share age, weight or height (do not invent them and do not ask: build the plan anyway).');

  let prompt;

  if (es) {
    const alcance = esPro
      ? `Genera el plan COMPLETO de ${dias} días de entrenamiento más un plan de comidas de un día (desayuno, almuerzo, cena y 1 snack), con porciones acordes a sus datos.`
      : `Genera SOLO el primer día de entrenamiento como muestra gratuita. No incluyas plan de comidas. Al final, en el campo "nota", escribe que el plan completo de la semana y las comidas están en GymGenio Pro.`;
    const cambio = ajuste
      ? `\nIMPORTANTE — la persona ya vio un plan y pide este cambio: "${ajuste}". Rehaz el plan aplicando ese cambio y menciónalo en el resumen.\n`
      : '';

    prompt = `Eres GymGenio, un entrenador personal amable y motivador que le habla a PRINCIPIANTES en español sencillo y cercano. Tuteas al usuario.

Datos de la persona:
- Objetivo: ${objetivo}
- Nivel: ${nivel}
- Días por semana: ${dias}
- Minutos por sesión: ${minutos}
- Equipo disponible: ${equipo || 'ninguno, solo su cuerpo'}
${datosCuerpo}
- Notas o limitaciones: ${restricciones || 'ninguna'}
${cambio}
${alcance}

Reglas importantes:
- ESCRIBE TODO EN ESPAÑOL (títulos, nombres de ejercicios, comidas, consejos).
- Ejercicios seguros y realistas para principiantes, adaptados al equipo disponible.
- Si tienes su edad, peso o estatura, úsalos para ajustar intensidad, impacto y porciones de comida. Nunca comentes su peso de forma negativa: tono siempre respetuoso y motivador.
- Nombres de ejercicios comunes en español (ej: sentadillas, plancha, flexiones de rodillas).
- Incluye siempre calentamiento corto y estiramiento final dentro del tiempo indicado.
- Nunca des consejos médicos ni hables de medicamentos, suplementos o dietas extremas.
- Nunca pongas menos de 1200 kcal ni sugieras bajar de peso muy rápido.
- Si la persona menciona una lesión o condición, adapta el plan y recuérdale amablemente consultar a un médico.
- Tono motivador y breve. Nada de párrafos largos.

Responde ÚNICAMENTE con un JSON válido (sin texto antes ni después, sin bloques de código) con esta forma exacta:
{
  "titulo": "string corto y motivador",
  "resumen": "1-2 frases explicando el plan",
  "dias": [
    {
      "nombre": "Día 1 · Nombre del enfoque",
      "duracion": "${minutos} min",
      "ejercicios": [
        { "nombre": "string", "series": "3 x 12", "nota": "consejo corto de técnica" }
      ]
    }
  ],
  "comidas": [
    { "momento": "Desayuno", "sugerencia": "string" }
  ],
  "consejos": ["consejo 1", "consejo 2", "consejo 3"],
  "nota": "string o vacío"
}`;
  } else {
    const alcance = esPro
      ? `Generate the COMPLETE plan: ${dias} training days plus a one-day meal plan (breakfast, lunch, dinner and 1 snack), with portions that match their data.`
      : `Generate ONLY the first training day as a free sample. Do NOT include a meal plan. At the end, in the "nota" field, say that the full week and the meal plan are part of GymGenio Pro.`;
    const cambio = ajuste
      ? `\nIMPORTANT — this person already saw a plan and is asking for this change: "${ajuste}". Rebuild the plan applying that change and mention it in the summary.\n`
      : '';

    prompt = `You are GymGenio, a warm, motivating personal trainer talking to COMPLETE BEGINNERS in simple, friendly English. Speak directly to the user ("you").

About this person:
- Goal: ${objetivo}
- Level: ${nivel}
- Days per week: ${dias}
- Minutes per session: ${minutos}
- Equipment available: ${equipo || 'none, bodyweight only'}
${datosCuerpo}
- Notes or limitations: ${restricciones || 'none'}
${cambio}
${alcance}

Important rules:
- WRITE EVERYTHING IN ENGLISH (titles, exercise names, meals, tips).
- Safe, realistic exercises for beginners, matched to the equipment they have.
- If you know their age, weight or height, use them to size intensity, impact and food portions. Never comment on their weight negatively: always respectful and motivating.
- Use common exercise names (e.g. squats, plank, knee push-ups).
- Always include a short warm-up and a final stretch inside the stated time.
- Never give medical advice or mention medication, supplements or extreme diets.
- Never go below 1200 kcal and never suggest losing weight very fast.
- If they mention an injury or condition, adapt the plan and kindly remind them to check with a doctor.
- Motivating and brief. No long paragraphs.

Reply with ONLY a valid JSON object (no text before or after, no code fences) with exactly this shape:
{
  "titulo": "short motivating title",
  "resumen": "1-2 sentences explaining the plan",
  "dias": [
    {
      "nombre": "Day 1 · Focus name",
      "duracion": "${minutos} min",
      "ejercicios": [
        { "nombre": "string", "series": "3 x 12", "nota": "short form tip" }
      ]
    }
  ],
  "comidas": [
    { "momento": "Breakfast", "sugerencia": "string" }
  ],
  "consejos": ["tip 1", "tip 2", "tip 3"],
  "nota": "string or empty"
}`;
  }

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
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('Error de Anthropic:', detalle);
      return res.status(502).json({
        error: es ? 'El genio está descansando. Intenta de nuevo en un momento.'
                  : 'The genie is taking a breather. Try again in a moment.'
      });
    }

    const datos = await respuesta.json();

    // Buscamos el texto en TODAS las cajitas de tipo "text" (no solo la primera).
    let texto = (datos.content || [])
      .filter(function (b) { return b && b.type === 'text' && b.text; })
      .map(function (b) { return b.text; })
      .join('\n');

    texto = texto.replace(/```(?:json)?/gi, '').trim();

    const ini = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (ini !== -1 && fin !== -1) texto = texto.slice(ini, fin + 1);

    let plan;
    try {
      plan = JSON.parse(texto);
    } catch (e) {
      console.error('No se pudo leer el JSON:', texto.slice(0, 500));
      return res.status(502).json({
        error: es ? 'El genio se confundió al escribir tu plan. Intenta de nuevo.'
                  : 'The genie got its wires crossed writing your plan. Try again.'
      });
    }

    return res.status(200).json({ plan, esPro, email });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      error: es ? 'Algo salió mal. Intenta de nuevo en un momento.'
                : 'Something went wrong. Try again in a moment.'
    });
  }
}
