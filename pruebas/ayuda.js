// 🧪 AYUDANTES PARA LAS PRUEBAS
//
// Las pruebas NO deben hablar con el internet de verdad. Si lo hicieran serían
// lentas, costarían dinero, fallarían cuando no hay wifi, y — lo peor — no
// podríamos probar los casos feos (¿qué pasa si Stripe se cae?).
//
// Por eso aquí fingimos ser Stripe y Supabase.

// Cambia el `fetch` de todo el programa por uno de mentira que responde lo que
// nosotros digamos. Devuelve la lista de URLs que se pidieron, para poder
// comprobar algo importante: que en los casos malos NI SIQUIERA se llame a
// Stripe (cada llamada de verdad cuesta tiempo y da información a un extraño).
//
//   const net = fingirInternet([
//     ['checkout/sessions', { cuerpo: { status: 'complete' } }],
//   ]);
//   ... aquí corre la prueba ...
//   net.restaurar();
export function fingirInternet(respuestas) {
  const original = globalThis.fetch;
  const llamadas = [];

  globalThis.fetch = async function (url) {
    const dir = String(url);
    llamadas.push(dir);
    for (const [trozo, respuesta] of respuestas) {
      if (dir.includes(trozo)) {
        if (respuesta.explota) throw new Error('internet caído (a propósito)');
        return {
          ok: respuesta.ok !== false,
          status: respuesta.ok === false ? 500 : 200,
          json: async () => respuesta.cuerpo || {}
        };
      }
    }
    // Nadie dijo qué responder para esta URL: fallamos ruidosamente. Es mejor
    // que una prueba se queje a que pase por accidente.
    throw new Error('La prueba no dijo qué responder para: ' + dir);
  };

  return {
    llamadas,
    // ¿Se llamó a Stripe/Supabase alguna vez?
    seLlamoA(trozo) {
      return llamadas.some(u => u.includes(trozo));
    },
    restaurar() {
      globalThis.fetch = original;
    }
  };
}

// Un recibo de Stripe como los de verdad (los campos que mira nuestro código).
export function reciboDeStripe({ correo, status = 'complete', pago = 'paid' }) {
  return {
    status,
    payment_status: pago,
    customer_details: { email: correo }
  };
}

// Las llaves que el código espera encontrar en Vercel. En las pruebas son
// inventadas: nunca se usan de verdad porque el internet es de mentira.
export function ponerLlavesDeMentira() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_de_mentira';
  process.env.SUPABASE_URL = 'https://ejemplo.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon_de_mentira';
}
