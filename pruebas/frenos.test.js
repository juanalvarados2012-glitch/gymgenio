// 🛑 PRUEBAS DE LOS FRENOS (el límite de peticiones)
//
// Los frenos son lo que impide que un robot te vacíe el presupuesto de IA
// pidiendo mil planes en un minuto. Si un freno se rompe, no te enteras por un
// error: te enteras por la factura.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearLimitador } from '../api/_comun.js';

describe('El freno (crearLimitador)', () => {

  test('✅ deja pasar hasta el tope y bloquea el siguiente', () => {
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 3 });
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, true, 'la 1ª pasa');
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, true, 'la 2ª pasa');
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, true, 'la 3ª pasa (es el tope)');
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, false, 'la 4ª YA NO');
  });

  test('✅ cada persona tiene su propia cubeta', () => {
    // Que un robot se pase de la raya no puede dejar sin servicio a los demás.
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 2 });
    freno.revisar('ip:robot');
    freno.revisar('ip:robot');
    assert.equal(freno.revisar('ip:robot').permitido, false, 'el robot queda frenado');
    assert.equal(freno.revisar('ip:persona_normal').permitido, true, 'la persona normal pasa');
  });

  test('✅ dice cuántos segundos hay que esperar', () => {
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 1 });
    freno.revisar('ip:1.1.1.1');
    const bloqueado = freno.revisar('ip:1.1.1.1');
    assert.equal(bloqueado.permitido, false);
    assert.ok(bloqueado.espera > 0 && bloqueado.espera <= 60,
      'La espera debe ser un número de segundos con sentido, fue: ' + bloqueado.espera);
  });

  test('✅ pasado el rato, se perdona y puedes volver a pedir', (t) => {
    // Sin esto el freno sería un castigo para siempre.
    t.mock.timers.enable({ apis: ['Date'] });
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 1 });
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, true);
    assert.equal(freno.revisar('ip:1.1.1.1').permitido, false, 'todavía está frenado');

    t.mock.timers.tick(60001); // pasa un minuto y un poquito

    assert.equal(freno.revisar('ip:1.1.1.1').permitido, true, 'ya pasó la ventana: puede pedir otra vez');
  });

  test('✅ se le puede poner un tope distinto a una sola llamada', () => {
    // Así /api/plan da 30 planes a quien tiene cuenta y solo 5 a quien no.
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 30 });
    for (let i = 0; i < 5; i++) freno.revisar('ip:sin_cuenta', 5);
    assert.equal(freno.revisar('ip:sin_cuenta', 5).permitido, false,
      'con tope propio de 5, la sexta se frena');
    assert.equal(freno.revisar('user:con_cuenta').permitido, true,
      'quien tiene cuenta sigue con el tope normal de 30');
  });

  test('🔒 un tope de 0 significa "no dejes pasar NADA"', () => {
    // Este es sutil y por eso está probado: en JavaScript, `0 || 30` da 30. Si el
    // código usara eso, pedir "no dejes pasar a nadie" se convertiría por accidente
    // en "deja pasar a 30". Sería una puerta abierta que nadie ve.
    const freno = crearLimitador({ ventanaMs: 60000, maximo: 30 });
    assert.equal(freno.revisar('ip:vetado', 0).permitido, false);
  });

  test('✅ la memoria no crece para siempre', (t) => {
    // El freno vive en la memoria del servidor. Si nunca limpiara, un robot que
    // cambia de IP cada vez podría llenarla hasta tumbar la función.
    t.mock.timers.enable({ apis: ['Date'] });
    const freno = crearLimitador({ ventanaMs: 1000, maximo: 5, maximoRegistros: 50 });
    for (let i = 0; i < 60; i++) freno.revisar('ip:vieja_' + i);
    t.mock.timers.tick(2000); // todas las de arriba ya caducaron
    for (let i = 0; i < 60; i++) freno.revisar('ip:nueva_' + i);
    // Si la limpieza funciona, quien llega ahora sigue siendo atendido bien.
    assert.equal(freno.revisar('ip:recien_llegado').permitido, true);
  });
});
