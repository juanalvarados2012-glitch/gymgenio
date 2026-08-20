// 🚪 PRUEBAS DEL GUARDIA — "¿quién eres? ¿pagaste?"
//
// Esta es la función que decide quién puede gastar tu dinero de IA. Ya se rompió
// una vez de verdad: /api/comida aceptaba CUALQUIER session_id de Stripe, y ese
// número no es secreto (viaja en la URL, queda en el historial, se comparte por
// WhatsApp). Una sola persona que pagara podía darle Pro gratis a medio internet.
//
// Estas pruebas existen para que ese agujero no pueda volver a abrirse sin que
// nos enteremos. La más importante de todas es "un recibo ajeno NO sirve".

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pagoRecienHecho, tieneSuscripcion, esProDeVerdad, emailDelToken, enListaPro } from '../api/_comun.js';
import { fingirInternet, reciboDeStripe, ponerLlavesDeMentira } from './ayuda.js';

ponerLlavesDeMentira();

const SESION = 'cs_test_abc123';

describe('El boleto de Stripe (pagoRecienHecho)', () => {

  test('✅ el recibo es MÍO y está pagado → soy Pro', async () => {
    const net = fingirInternet([
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'juan@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await pagoRecienHecho(SESION, 'juan@ejemplo.com'), true);
    } finally { net.restaurar(); }
  });

  test('🔒 EL AGUJERO DE VERDAD: el recibo es de OTRA persona → NO soy Pro', async () => {
    // Esto es exactamente lo que pasaba antes: alguien pagaba, compartía su
    // enlace con ?session_id=... y quien lo abriera entraba gratis.
    const net = fingirInternet([
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'quien_pago@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await pagoRecienHecho(SESION, 'colado@ejemplo.com'), false);
    } finally { net.restaurar(); }
  });

  test('🔒 sin cuenta iniciada → NO soy Pro (y ni se molesta en llamar a Stripe)', async () => {
    const net = fingirInternet([
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'juan@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await pagoRecienHecho(SESION, ''), false);
      assert.equal(net.seLlamoA('stripe.com'), false,
        'No debe preguntarle a Stripe si ni siquiera hay una cuenta.');
    } finally { net.restaurar(); }
  });

  test('🔒 un session_id inventado ni llega a Stripe', async () => {
    const net = fingirInternet([
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'juan@ejemplo.com' }) }]
    ]);
    try {
      for (const basura of ['sk_live_robado', '../../otra-cosa', 'cs_test/../x', '', 'hola']) {
        assert.equal(await pagoRecienHecho(basura, 'juan@ejemplo.com'), false,
          'Debería rechazar: ' + basura);
      }
      assert.equal(net.seLlamoA('stripe.com'), false,
        'Un id con formato raro se rechaza aquí mismo, sin gastar una llamada.');
    } finally { net.restaurar(); }
  });

  test('🔒 el recibo es mío pero NO se pagó → NO soy Pro', async () => {
    const casos = [
      reciboDeStripe({ correo: 'juan@ejemplo.com', pago: 'unpaid' }),
      reciboDeStripe({ correo: 'juan@ejemplo.com', status: 'open' }),
      reciboDeStripe({ correo: 'juan@ejemplo.com', status: 'expired', pago: 'unpaid' })
    ];
    for (const recibo of casos) {
      const net = fingirInternet([['checkout/sessions', { cuerpo: recibo }]]);
      try {
        assert.equal(await pagoRecienHecho(SESION, 'juan@ejemplo.com'), false);
      } finally { net.restaurar(); }
    }
  });

  test('🔒 si Stripe se cae, NO regalamos el Pro', async () => {
    // Ante la duda, la respuesta segura es "no". Nunca "sí, pásale".
    for (const problema of [{ ok: false }, { explota: true }]) {
      const net = fingirInternet([['checkout/sessions', problema]]);
      try {
        assert.equal(await pagoRecienHecho(SESION, 'juan@ejemplo.com'), false);
      } finally { net.restaurar(); }
    }
  });

  test('✅ mayúsculas y espacios en el correo no me dejan fuera', async () => {
    // Alguien escribe "  Juan@Ejemplo.com " al pagar. Es la misma persona.
    const net = fingirInternet([
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'Juan@Ejemplo.COM' }) }]
    ]);
    try {
      assert.equal(await pagoRecienHecho(SESION, '  juan@ejemplo.com  '), true);
    } finally { net.restaurar(); }
  });
});

describe('La suscripción de Stripe (tieneSuscripcion)', () => {

  test('✅ tiene una suscripción activa → Pro', async () => {
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [{ id: 'cus_1' }] } }],
      ['subscriptions', { cuerpo: { data: [{ id: 'sub_1' }] } }]
    ]);
    try {
      assert.equal(await tieneSuscripcion('juan@ejemplo.com'), true);
    } finally { net.restaurar(); }
  });

  test('🔒 canceló su suscripción → deja de ser Pro solito', async () => {
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [{ id: 'cus_1' }] } }],
      ['subscriptions', { cuerpo: { data: [] } }]
    ]);
    try {
      assert.equal(await tieneSuscripcion('juan@ejemplo.com'), false);
    } finally { net.restaurar(); }
  });

  test('🔒 nunca pagó (no existe en Stripe) → no es Pro', async () => {
    const net = fingirInternet([['customers', { cuerpo: { data: [] } }]]);
    try {
      assert.equal(await tieneSuscripcion('desconocido@ejemplo.com'), false);
    } finally { net.restaurar(); }
  });

  test('🔒 sin correo no se le pregunta nada a Stripe', async () => {
    const net = fingirInternet([['customers', { cuerpo: { data: [] } }]]);
    try {
      assert.equal(await tieneSuscripcion(''), false);
      assert.equal(net.seLlamoA('stripe.com'), false);
    } finally { net.restaurar(); }
  });
});

describe('El guardia completo (esProDeVerdad)', () => {

  test('✅ con suscripción activa entra, aunque no traiga recibo', async () => {
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [{ id: 'cus_1' }] } }],
      ['subscriptions', { cuerpo: { data: [{ id: 'sub_1' }] } }]
    ]);
    try {
      assert.equal(await esProDeVerdad('juan@ejemplo.com', null), true);
    } finally { net.restaurar(); }
  });

  test('🔒 sin suscripción y con un recibo ajeno → fuera', async () => {
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [] } }],
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'otro@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await esProDeVerdad('colado@ejemplo.com', SESION), false);
    } finally { net.restaurar(); }
  });

  test('✅ acaba de pagar (todavía no aparece la suscripción) → entra', async () => {
    // Stripe tarda un momento en crear la suscripción. El recibo es el plan B
    // para que quien acaba de pagar no vea "eres gratis" en su cara.
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [] } }],
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'juan@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await esProDeVerdad('juan@ejemplo.com', SESION), true);
    } finally { net.restaurar(); }
  });
});

describe('Pro de cortesía (enListaPro)', () => {

  test('🔒 con la variable vacía, NADIE es Pro de cortesía (la app no cambia)', () => {
    delete process.env.CORREOS_PRO;
    assert.equal(enListaPro('juan@ejemplo.com'), false);
    process.env.CORREOS_PRO = '';
    assert.equal(enListaPro('juan@ejemplo.com'), false);
  });

  test('✅ un correo en la lista es Pro sin pasar por Stripe', async () => {
    process.env.CORREOS_PRO = 'creadora@ejemplo.com, otro@ejemplo.com';
    try {
      // Ojo: NO montamos internet. Si intentara llamar a Stripe, la prueba
      // reventaría. Que pase demuestra que el atajo funciona sin red.
      assert.equal(enListaPro('creadora@ejemplo.com'), true);
      assert.equal(await esProDeVerdad('creadora@ejemplo.com', null), true);
    } finally { delete process.env.CORREOS_PRO; }
  });

  test('✅ no le afectan mayúsculas ni espacios de sobra', () => {
    process.env.CORREOS_PRO = '  Creadora@Ejemplo.COM ';
    try {
      assert.equal(enListaPro(' creadora@ejemplo.com '), true);
    } finally { delete process.env.CORREOS_PRO; }
  });

  test('🔒 quien NO está en la lista sigue el camino normal (Stripe manda)', async () => {
    process.env.CORREOS_PRO = 'creadora@ejemplo.com';
    const net = fingirInternet([
      ['customers', { cuerpo: { data: [] } }],
      ['checkout/sessions', { cuerpo: reciboDeStripe({ correo: 'otro@ejemplo.com' }) }]
    ]);
    try {
      assert.equal(await esProDeVerdad('colado@ejemplo.com', SESION), false);
    } finally { net.restaurar(); delete process.env.CORREOS_PRO; }
  });
});

describe('¿Quién eres? (emailDelToken)', () => {

  test('✅ un token bueno devuelve el correo, en minúsculas', async () => {
    const net = fingirInternet([['auth/v1/user', { cuerpo: { email: 'Juan@Ejemplo.com' } }]]);
    try {
      assert.equal(await emailDelToken('Bearer token_bueno'), 'juan@ejemplo.com');
    } finally { net.restaurar(); }
  });

  test('🔒 sin encabezado, mal escrito o vacío → nadie (y sin llamar a Supabase)', async () => {
    const net = fingirInternet([['auth/v1/user', { cuerpo: { email: 'juan@ejemplo.com' } }]]);
    try {
      for (const malo of ['', 'token_pelado', 'bearer minusculas', 'Bearer ', 'Basic abc']) {
        assert.equal(await emailDelToken(malo), '', 'Debería rechazar: ' + JSON.stringify(malo));
      }
      assert.equal(net.seLlamoA('supabase'), false);
    } finally { net.restaurar(); }
  });

  test('🔒 si Supabase dice que el token no vale → nadie', async () => {
    const net = fingirInternet([['auth/v1/user', { ok: false }]]);
    try {
      assert.equal(await emailDelToken('Bearer token_vencido'), '');
    } finally { net.restaurar(); }
  });
});
