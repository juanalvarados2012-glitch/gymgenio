/* 🏋️ BIBLIOTECA DE TÉCNICA
 *
 * Por qué existe:
 * El plan decía "Sentadillas · 3 x 12" y una línea de consejo. Para quien ya
 * entrena eso basta. Para quien empieza —que es justo a quien va dirigida esta
 * app— no basta: no sabe si lo está haciendo bien, y esa duda es la razón número
 * uno por la que alguien abandona en la primera sesión. Los dos análisis de
 * competencia llegaron a lo mismo por caminos distintos.
 *
 * Cómo funciona:
 * Los movimientos comunes están escritos aquí, a mano, gratis y sin internet.
 * Lo que no esté aquí se lo pedimos al genio una sola vez (api/tecnica.js) y se
 * guarda en el teléfono. Así el 80% de los casos cuesta $0 y funciona sin señal.
 *
 * Qué NO hace:
 * No diagnostica nada. Si algo duele, la respuesta es un médico — nunca un
 * consejo de técnica. Eso está escrito en la ficha, en el prompt del servidor,
 * y probado en pruebas/tecnica.test.js.
 */

/* Quita acentos, signos y palabras de relleno. NO toca los plurales: de eso se
 * encarga `variantes`, porque una sola regla de plural no funciona en dos
 * idiomas a la vez. */
export function normalizarNombre(nombre) {
  const s = String(nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // fuera acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Palabras que no cambian el movimiento, solo lo adornan.
  const relleno = /\b(de|del|la|el|los|las|con|sin|en|al|para|y|o|the|with|of|a|an|to|on)\b/g;
  return s.replace(relleno, ' ').replace(/\s+/g, ' ').trim();
}

/* Formas posibles de una palabra en singular.
 *
 * Adivinar el plural con una regla sola no funciona: en espa\u00f1ol "flexiones" es
 * "flexion" (se quita -es) pero "burpees" es "burpee" (solo -s); en ingl\u00e9s
 * "lunges" es "lunge" (solo -s) pero "push ups" es "push up". En vez de acertar
 * a la primera, se generan las formas posibles y se prueban todas. Es m\u00e1s
 * barato equivocarse aqu\u00ed que mandar a alguien a hacer el ejercicio equivocado.
 */
function formas(p) {
  const f = new Set([p]);
  // Desde 3 letras: "ups" tiene que llegar a "up" ("push ups" → "push up").
  if (p.length > 2 && p.endsWith('s') && !p.endsWith('ss')) f.add(p.slice(0, -1));
  if (p.length > 4 && p.endsWith('es')) f.add(p.slice(0, -2));
  return f;
}

/* Todas las maneras de escribir la misma frase en singular. Una frase de
 * ejercicio tiene 4 palabras como mucho, as\u00ed que esto no crece de m\u00e1s. */
function variantes(frase) {
  let combinaciones = [''];
  for (const palabra of frase.split(' ').filter(Boolean).slice(0, 5)) {
    const siguiente = [];
    for (const previa of combinaciones) {
      for (const f of formas(palabra)) siguiente.push(previa ? previa + ' ' + f : f);
    }
    combinaciones = siguiente;
    if (combinaciones.length > 200) break;   // freno de seguridad
  }
  return new Set(combinaciones.filter(Boolean));
}

/* Cada ficha:
 *   pasos    → cómo se hace, en orden
 *   errores  → los 3 fallos que más se ven (lo que más valor da)
 *   sientes  → dónde SÍ debe notarse, para saber si va bien
 *   facil    → la versión de menos impacto, para no abandonar
 *   claves   → busca por estas palabras */
const FICHAS = [
  {
    claves: ['sentadilla', 'squat', 'sentadilla peso corporal', 'air squat'],
    es: {
      nombre: 'Sentadilla',
      resumen: 'Sentarte en el aire y volver a subir.',
      pasos: ['Pies al ancho de los hombros, puntas ligeramente hacia afuera.', 'Baja como si fueras a sentarte en una silla que está detrás de ti.', 'Baja hasta donde puedas manteniendo la espalda recta.', 'Empuja el suelo con los talones para subir.'],
      errores: ['Que las rodillas se metan hacia adentro al subir.', 'Levantar los talones del suelo.', 'Redondear la espalda baja al llegar abajo.'],
      sientes: 'En los muslos y los glúteos. No en la parte baja de la espalda.',
      facil: 'Siéntate en una silla de verdad y levántate sin usar las manos.'
    },
    en: {
      nombre: 'Squat',
      resumen: 'Sitting down in mid-air, then standing back up.',
      pasos: ['Feet shoulder-width apart, toes slightly out.', 'Lower as if sitting into a chair behind you.', 'Go as low as you can while keeping your back straight.', 'Push the floor away with your heels to stand.'],
      errores: ['Knees caving inward as you stand up.', 'Heels lifting off the floor.', 'Rounding your lower back at the bottom.'],
      sientes: 'In your thighs and glutes. Not in your lower back.',
      facil: 'Sit down on an actual chair and stand back up without using your hands.'
    }
  },
  {
    claves: ['flexion', 'flexion brazo', 'push up', 'pushup', 'lagartija', 'plancha pecho'],
    es: {
      nombre: 'Flexiones',
      resumen: 'Boca abajo, bajar y subir el cuerpo con los brazos.',
      pasos: ['Manos un poco más abiertas que los hombros.', 'Cuerpo en línea recta de la cabeza a los talones.', 'Baja doblando los codos hacia atrás, no hacia los lados.', 'Baja hasta que el pecho casi toque y empuja para subir.'],
      errores: ['Que la cadera se hunda o se levante en pico.', 'Abrir los codos en cruz (molesta el hombro).', 'Bajar solo la cabeza en vez de todo el cuerpo.'],
      sientes: 'En el pecho, los hombros y la parte de atrás del brazo.',
      facil: 'Apoya las rodillas en el suelo, o hazlas de pie contra la pared.'
    },
    en: {
      nombre: 'Push-ups',
      resumen: 'Face down, lowering your body and pushing it back up with your arms.',
      pasos: ['Hands slightly wider than your shoulders.', 'Body in a straight line from head to heels.', 'Lower with elbows going back, not flaring sideways.', 'Lower until your chest nearly touches, then push up.'],
      errores: ['Hips sagging down or piking up.', 'Elbows flaring straight out to the sides (bothers the shoulder).', 'Only lowering your head instead of your whole body.'],
      sientes: 'In your chest, shoulders and the back of your arms.',
      facil: 'Put your knees on the floor, or do them standing against a wall.'
    }
  },
  {
    claves: ['plancha', 'plank', 'plancha abdominal', 'plancha frontal'],
    es: {
      nombre: 'Plancha',
      resumen: 'Aguantar el cuerpo recto y quieto, apoyado en los codos.',
      pasos: ['Apoya los antebrazos en el suelo, codos debajo de los hombros.', 'Estira las piernas y apoya las puntas de los pies.', 'Aprieta el abdomen y los glúteos.', 'Mantén el cuerpo en línea recta y respira normal.'],
      errores: ['Aguantar la respiración (es lo más común).', 'Subir la cadera para descansar.', 'Dejar caer la cadera y arquear la espalda baja.'],
      sientes: 'En todo el abdomen, nunca en la espalda baja. Si lo sientes ahí, la cadera está caída.',
      facil: 'Apoya las rodillas, o hazla de pie con los antebrazos en una mesa.'
    },
    en: {
      nombre: 'Plank',
      resumen: 'Holding your body straight and still, propped on your elbows.',
      pasos: ['Forearms on the floor, elbows under your shoulders.', 'Legs straight, up on your toes.', 'Squeeze your abs and glutes.', 'Keep your body in a straight line and breathe normally.'],
      errores: ['Holding your breath (the most common one).', 'Raising your hips to rest.', 'Letting your hips drop and arching your lower back.'],
      sientes: 'Across your whole midsection, never in your lower back. If you feel it there, your hips have dropped.',
      facil: 'Drop to your knees, or do it standing with forearms on a table.'
    }
  },
  {
    claves: ['puente gluteo', 'puente', 'glute bridge', 'bridge', 'elevacion cadera', 'hip thrust'],
    es: {
      nombre: 'Puente de glúteo',
      resumen: 'Boca arriba, levantar la cadera del suelo.',
      pasos: ['Acuéstate boca arriba con las rodillas dobladas y los pies planos.', 'Pies al ancho de la cadera, cerca de los glúteos.', 'Empuja con los talones y sube la cadera.', 'Aprieta arriba un segundo y baja despacio.'],
      errores: ['Arquear la espalda en vez de apretar el glúteo.', 'Subir empujando con las puntas de los pies.', 'Subir y bajar de golpe sin control.'],
      sientes: 'En los glúteos, nunca en la espalda baja. Si lo sientes ahí, estás subiendo demasiado.',
      facil: 'Sube menos altura y quédate arriba 2 segundos.'
    },
    en: {
      nombre: 'Glute bridge',
      resumen: 'On your back, lifting your hips off the floor.',
      pasos: ['Lie on your back, knees bent, feet flat.', 'Feet hip-width apart, close to your glutes.', 'Push through your heels and lift your hips.', 'Squeeze at the top for a second, then lower slowly.'],
      errores: ['Arching your back instead of squeezing your glutes.', 'Pushing up through your toes.', 'Bouncing up and down without control.'],
      sientes: 'In your glutes, never in your lower back. If you feel it there, you are lifting too high.',
      facil: 'Lift a little less and hold at the top for 2 seconds.'
    }
  },
  {
    claves: ['zancada', 'estocada', 'lunge', 'desplante'],
    es: {
      nombre: 'Zancadas',
      resumen: 'Dar un paso largo y bajar, una pierna a la vez.',
      pasos: ['De pie, da un paso largo hacia adelante.', 'Baja la rodilla de atrás hacia el suelo.', 'Las dos rodillas quedan como en ángulo recto.', 'Empuja con el pie de adelante para volver.'],
      errores: ['Dar un paso demasiado corto (la rodilla se va muy adelante).', 'Inclinar el cuerpo hacia adelante.', 'Golpear el suelo con la rodilla de atrás.'],
      sientes: 'En el muslo y el glúteo de la pierna de adelante.',
      facil: 'Agárrate de una silla o una pared para no perder el equilibrio.'
    },
    en: {
      nombre: 'Lunges',
      resumen: 'Taking a long step and lowering, one leg at a time.',
      pasos: ['Standing, take a long step forward.', 'Lower your back knee toward the floor.', 'Both knees end up at about a right angle.', 'Push through your front foot to come back.'],
      errores: ['Stepping too short (the front knee shoots too far forward).', 'Leaning your torso forward.', 'Banging your back knee on the floor.'],
      sientes: 'In the thigh and glute of your front leg.',
      facil: 'Hold a chair or a wall so you do not lose your balance.'
    }
  },
  {
    claves: ['remo', 'row', 'remo mancuerna', 'dumbbell row', 'remo banda'],
    es: {
      nombre: 'Remo',
      resumen: 'Inclinado hacia adelante, jalar el peso hacia tu barriga.',
      pasos: ['Inclina el tronco hacia adelante con la espalda recta.', 'Deja los brazos colgando con el peso o la banda.', 'Lleva los codos hacia atrás, pegados al cuerpo.', 'Junta los omóplatos arriba y baja controlando.'],
      errores: ['Redondear la espalda: es el error que más daño hace aquí.', 'Tirar con las manos en vez de con la espalda.', 'Usar impulso del cuerpo para subir el peso.'],
      sientes: 'En la espalda, entre los omóplatos. Algo en el bíceps es normal.',
      facil: 'Hazlo con una sola mano apoyando la otra en una silla.'
    },
    en: {
      nombre: 'Row',
      resumen: 'Leaning forward, pulling the weight in toward your belly.',
      pasos: ['Hinge your torso forward keeping your back straight.', 'Let your arms hang with the weight or band.', 'Pull your elbows back, close to your body.', 'Squeeze your shoulder blades at the top, lower with control.'],
      errores: ['Rounding your back (the one that actually hurts people here).', 'Pulling with your hands instead of your back.', 'Using body momentum to swing the weight up.'],
      sientes: 'In your back, between the shoulder blades. Some biceps is normal.',
      facil: 'Do it one arm at a time with the other hand on a chair.'
    }
  },
  {
    claves: ['press hombro', 'press militar', 'shoulder press', 'overhead press', 'elevacion hombro'],
    es: {
      nombre: 'Press de hombro',
      resumen: 'Empujar un peso hacia arriba, por encima de la cabeza.',
      pasos: ['De pie o sentado, espalda recta y abdomen apretado.', 'Peso a la altura de los hombros, palmas al frente.', 'Empuja hacia arriba sin bloquear los codos de golpe.', 'Baja despacio hasta la altura de la oreja.'],
      errores: ['Arquear la espalda baja para empujar más.', 'Subir los hombros hacia las orejas.', 'Bajar demasiado y forzar el hombro.'],
      sientes: 'En los hombros y algo en la parte de atrás del brazo.',
      facil: 'Hazlo sentado con la espalda apoyada, y con menos peso.'
    },
    en: {
      nombre: 'Shoulder press',
      resumen: 'Pushing a weight straight up, over your head.',
      pasos: ['Standing or seated, back straight and abs braced.', 'Weight at shoulder height, palms facing forward.', 'Press up without snapping your elbows straight.', 'Lower slowly to about ear height.'],
      errores: ['Arching your lower back to push harder.', 'Shrugging your shoulders up toward your ears.', 'Going too low and straining the shoulder.'],
      sientes: 'In your shoulders, and some in the back of your arms.',
      facil: 'Do it seated with your back supported, using less weight.'
    }
  },
  {
    claves: ['curl biceps', 'curl', 'biceps curl', 'flexion biceps'],
    es: {
      nombre: 'Curl de bíceps',
      resumen: 'Doblar el codo para subir un peso hasta el hombro.',
      pasos: ['De pie, brazos estirados a los lados del cuerpo.', 'Codos pegados a las costillas, no se mueven.', 'Sube el peso doblando solo el codo.', 'Baja despacio hasta estirar del todo.'],
      errores: ['Balancear el cuerpo para subir el peso.', 'Despegar los codos hacia adelante.', 'Bajar de golpe (ahí se pierde la mitad del trabajo).'],
      sientes: 'En la parte de adelante del brazo.',
      facil: 'Siéntate: así no puedes usar impulso del cuerpo.'
    },
    en: {
      nombre: 'Biceps curl',
      resumen: 'Bending your elbow to lift a weight up to your shoulder.',
      pasos: ['Standing, arms straight at your sides.', 'Elbows pinned to your ribs — they do not move.', 'Lift the weight by bending only your elbow.', 'Lower slowly until your arm is straight again.'],
      errores: ['Swinging your body to get the weight up.', 'Letting your elbows drift forward.', 'Dropping the weight fast (that is where half the work is lost).'],
      sientes: 'In the front of your upper arm.',
      facil: 'Sit down — that way you cannot use body momentum.'
    }
  },
  {
    claves: ['abdominal', 'crunch', 'encogimiento', 'sit up', 'situp'],
    es: {
      nombre: 'Abdominales',
      resumen: 'Boca arriba, despegar los hombros del suelo.',
      pasos: ['Boca arriba, rodillas dobladas, pies en el suelo.', 'Manos en el pecho o a los lados de la cabeza, sin tirar.', 'Despega los hombros unos centímetros del suelo.', 'Baja despacio sin apoyar del todo la cabeza.'],
      errores: ['Tirar del cuello con las manos.', 'Hacerlos muy rápido con impulso.', 'Aguantar la respiración.'],
      sientes: 'En la parte de arriba del abdomen. Nunca en el cuello.',
      facil: 'Sube menos altura y hazlo más despacio.'
    },
    en: {
      nombre: 'Crunches',
      resumen: 'On your back, lifting your shoulders off the floor.',
      pasos: ['On your back, knees bent, feet on the floor.', 'Hands on your chest or beside your head, not pulling.', 'Lift your shoulders a few inches off the floor.', 'Lower slowly without fully resting your head.'],
      errores: ['Pulling on your neck with your hands.', 'Going fast with momentum.', 'Holding your breath.'],
      sientes: 'In your upper abs. Never in your neck.',
      facil: 'Lift a little less and go slower.'
    }
  },
  {
    claves: ['escalador', 'mountain climber', 'montanista'],
    es: {
      nombre: 'Escaladores',
      resumen: 'En posición de flexión, correr en el sitio con las rodillas.',
      pasos: ['Ponte en posición de flexión con los brazos estirados.', 'Lleva una rodilla hacia el pecho.', 'Cámbiala por la otra, como si corrieras en el sitio.', 'Mantén la cadera baja todo el tiempo.'],
      errores: ['Subir la cadera en pico.', 'Ir tan rápido que se pierde la forma.', 'Dejar caer la espalda baja.'],
      sientes: 'En el abdomen, los hombros y las piernas.',
      facil: 'Apoya las manos en una silla o un escalón y ve más lento.'
    },
    en: {
      nombre: 'Mountain climbers',
      resumen: 'In a push-up position, running in place with your knees.',
      pasos: ['Get into a push-up position with straight arms.', 'Drive one knee toward your chest.', 'Switch legs, like running in place.', 'Keep your hips low the whole time.'],
      errores: ['Piking your hips up.', 'Going so fast that form falls apart.', 'Letting your lower back sag.'],
      sientes: 'In your abs, shoulders and legs.',
      facil: 'Put your hands on a chair or step and go slower.'
    }
  },
  {
    claves: ['salto tijera', 'jumping jack', 'tijera', 'salto estrella'],
    es: {
      nombre: 'Saltos de tijera',
      resumen: 'Saltar abriendo y cerrando piernas y brazos a la vez.',
      pasos: ['De pie, pies juntos y brazos a los lados.', 'Salta abriendo las piernas y subiendo los brazos.', 'Salta otra vez para volver a la posición inicial.', 'Cae con las rodillas un poco dobladas, no rígidas.'],
      errores: ['Caer con las piernas totalmente rectas.', 'Caer de golpe con los talones.', 'Encoger los hombros al subir los brazos.'],
      sientes: 'En las piernas, y el corazón sube de ritmo. Eso es lo que busca.',
      facil: 'Sin salto: da un paso a cada lado subiendo los brazos igual.'
    },
    en: {
      nombre: 'Jumping jacks',
      resumen: 'Jumping your arms and legs open and closed at the same time.',
      pasos: ['Stand with feet together, arms at your sides.', 'Jump your legs apart while raising your arms.', 'Jump again to return to the start.', 'Land with knees slightly bent, not locked.'],
      errores: ['Landing with completely straight legs.', 'Slamming down on your heels.', 'Shrugging your shoulders as your arms go up.'],
      sientes: 'In your legs, and your heart rate goes up. That is the point.',
      facil: 'No jump: step out to each side while raising your arms the same way.'
    }
  },
  {
    claves: ['burpee', 'burpe'],
    es: {
      nombre: 'Burpees',
      resumen: 'Bajar al suelo, levantarte y saltar. Todo seguido.',
      pasos: ['De pie, agáchate y apoya las manos en el suelo.', 'Lleva los pies atrás hasta quedar en plancha.', 'Vuelve a llevar los pies hacia las manos.', 'Levántate. Si puedes, termina con un salto.'],
      errores: ['Dejar caer la cadera al llegar a la plancha.', 'Hacerlos rápido sin controlar la espalda.', 'Aterrizar con las piernas rígidas.'],
      sientes: 'En todo el cuerpo. Es el ejercicio que más cansa de la lista.',
      facil: 'Sin salto y apoyando las manos en una silla en vez del suelo.'
    },
    en: {
      nombre: 'Burpees',
      resumen: 'Down to the floor, back up on your feet, and a jump. All in one go.',
      pasos: ['Standing, squat down and put your hands on the floor.', 'Walk or hop your feet back into a plank.', 'Bring your feet back toward your hands.', 'Stand up. If you can, finish with a jump.'],
      errores: ['Letting your hips sag when you hit the plank.', 'Rushing without controlling your back.', 'Landing with stiff legs.'],
      sientes: 'Everywhere. This is the most tiring one on the list.',
      facil: 'No jump, and put your hands on a chair instead of the floor.'
    }
  },
  {
    claves: ['peso muerto', 'deadlift', 'peso muerto rumano', 'romanian deadlift'],
    es: {
      nombre: 'Peso muerto',
      resumen: 'Recoger un peso del suelo sin dañarte la espalda.',
      pasos: ['De pie, pies al ancho de la cadera, peso delante de los muslos.', 'Empuja la cadera hacia atrás, no dobles mucho las rodillas.', 'Baja el peso pegado a las piernas con la espalda recta.', 'Aprieta los glúteos para volver a subir.'],
      errores: ['Redondear la espalda: es el error que más daño hace.', 'Separar el peso del cuerpo.', 'Bajar más de lo que la espalda aguanta recta.'],
      sientes: 'En la parte de atrás del muslo y los glúteos. Nunca en la zona baja de la espalda.',
      facil: 'Baja solo hasta la mitad, con muy poco peso, delante de un espejo.'
    },
    en: {
      nombre: 'Deadlift',
      resumen: 'Picking a weight up off the floor without hurting your back.',
      pasos: ['Standing, feet hip-width, weight in front of your thighs.', 'Push your hips back, do not bend your knees much.', 'Lower the weight close to your legs with a straight back.', 'Squeeze your glutes to stand back up.'],
      errores: ['Rounding your back — this is the one that hurts people.', 'Letting the weight drift away from your body.', 'Going lower than your back can stay straight.'],
      sientes: 'In the back of your thighs and glutes. Never in your lower back.',
      facil: 'Go only halfway down, with very light weight, in front of a mirror.'
    }
  },
  {
    claves: ['superman', 'extension espalda', 'back extension', 'lumbar'],
    es: {
      nombre: 'Superman',
      resumen: 'Boca abajo, levantar brazos y piernas a la vez.',
      pasos: ['Acuéstate boca abajo con los brazos estirados al frente.', 'Levanta a la vez brazos, pecho y piernas unos centímetros.', 'Aguanta un segundo mirando al suelo.', 'Baja despacio.'],
      errores: ['Levantar la cabeza y mirar al frente (fuerza el cuello).', 'Subir demasiado alto.', 'Hacerlo a tirones.'],
      sientes: 'En la parte baja de la espalda y los glúteos, pero sin dolor.',
      facil: 'Levanta solo un brazo y la pierna contraria, alternando.'
    },
    en: {
      nombre: 'Superman',
      resumen: 'Face down, lifting your arms and legs at the same time.',
      pasos: ['Lie face down with your arms stretched out in front.', 'Lift arms, chest and legs a few inches at the same time.', 'Hold for a second, looking at the floor.', 'Lower slowly.'],
      errores: ['Lifting your head to look forward (strains the neck).', 'Lifting way too high.', 'Doing it in jerky bursts.'],
      sientes: 'In your lower back and glutes, but with no pain.',
      facil: 'Lift only one arm and the opposite leg, alternating.'
    }
  },
  {
    claves: ['sentadilla bulgara', 'bulgarian split squat', 'split squat', 'sentadilla dividida'],
    es: {
      nombre: 'Sentadilla búlgara',
      resumen: 'Una sentadilla con el pie de atrás apoyado en una silla.',
      pasos: ['De espaldas a una silla, apoya el empeine de un pie encima.', 'El pie de adelante bien separado de la silla.', 'Baja recto, doblando la rodilla de adelante.', 'Empuja con el talón de adelante para subir.'],
      errores: ['Poner el pie de adelante muy cerca de la silla.', 'Inclinarse mucho hacia adelante.', 'Perder el equilibrio por ir rápido.'],
      sientes: 'En el muslo y el glúteo de la pierna de adelante. Cansa mucho.',
      facil: 'Agárrate de una pared con una mano y baja poco.'
    },
    en: {
      nombre: 'Bulgarian split squat',
      resumen: 'A squat with your back foot resting on a chair.',
      pasos: ['With your back to a chair, rest the top of one foot on it.', 'Front foot well away from the chair.', 'Lower straight down, bending your front knee.', 'Push through your front heel to come up.'],
      errores: ['Placing the front foot too close to the chair.', 'Leaning far forward.', 'Losing your balance by rushing.'],
      sientes: 'In the thigh and glute of your front leg. It is a tough one.',
      facil: 'Hold a wall with one hand and only go down a little.'
    }
  },
  {
    claves: ['fondo triceps', 'dip', 'fondo silla', 'tricep dip', 'fondo'],
    es: {
      nombre: 'Fondos de tríceps',
      resumen: 'Al borde de una silla, bajar y subir con los brazos.',
      pasos: ['Siéntate en el borde de una silla firme y agárrate del borde.', 'Desliza la cadera hacia adelante, fuera de la silla.', 'Baja doblando los codos hacia atrás.', 'Empuja para subir sin bloquear los codos de golpe.'],
      errores: ['Abrir los codos hacia los lados.', 'Bajar demasiado y forzar el hombro.', 'Alejar mucho la cadera de la silla.'],
      sientes: 'En la parte de atrás del brazo.',
      facil: 'Dobla las rodillas y acerca los pies: pesa mucho menos.'
    },
    en: {
      nombre: 'Triceps dips',
      resumen: 'On the edge of a chair, lowering and pushing back up with your arms.',
      pasos: ['Sit on the edge of a sturdy chair and grip the edge.', 'Slide your hips forward, off the chair.', 'Lower by bending your elbows backward.', 'Push up without snapping your elbows straight.'],
      errores: ['Letting your elbows flare out to the sides.', 'Going too low and straining your shoulder.', 'Sliding your hips too far from the chair.'],
      sientes: 'In the back of your upper arms.',
      facil: 'Bend your knees and bring your feet closer — much less weight.'
    }
  },
  {
    claves: ['plancha lateral', 'side plank'],
    es: {
      nombre: 'Plancha lateral',
      resumen: 'De lado, aguantar el cuerpo recto apoyado en un codo.',
      pasos: ['Acuéstate de lado, apoyado en un antebrazo.', 'Codo justo debajo del hombro.', 'Sube la cadera hasta formar una línea recta.', 'Aguanta respirando normal y cambia de lado.'],
      errores: ['Dejar caer la cadera poco a poco sin darse cuenta.', 'Girar el cuerpo hacia adelante.', 'Poner el codo adelantado respecto al hombro.'],
      sientes: 'En el costado del abdomen, del lado de abajo.',
      facil: 'Apoya las rodillas dobladas en vez de los pies.'
    },
    en: {
      nombre: 'Side plank',
      resumen: 'On your side, holding your body straight on one elbow.',
      pasos: ['Lie on your side, propped on one forearm.', 'Elbow directly under your shoulder.', 'Lift your hips into a straight line.', 'Hold, breathing normally, then switch sides.'],
      errores: ['Letting your hips slowly sink without noticing.', 'Rotating your body forward.', 'Placing your elbow ahead of your shoulder.'],
      sientes: 'Down the side of your midsection, on the bottom side.',
      facil: 'Rest on bent knees instead of your feet.'
    }
  },
  {
    claves: ['elevacion lateral', 'lateral raise', 'elevacion hombro lateral'],
    es: {
      nombre: 'Elevaciones laterales',
      resumen: 'Subir los brazos a los lados, como alas, hasta el hombro.',
      pasos: ['De pie, un peso en cada mano a los lados.', 'Codos apenas doblados y fijos.', 'Sube los brazos a los lados hasta la altura del hombro.', 'Baja despacio, contando hasta dos.'],
      errores: ['Usar demasiado peso y balancear el cuerpo.', 'Subir por encima del hombro.', 'Encoger los hombros hacia las orejas.'],
      sientes: 'En el lado del hombro. Es normal que pese aunque sea poco peso.',
      facil: 'Hazlo sin peso o con dos botellas de agua pequeñas.'
    },
    en: {
      nombre: 'Lateral raises',
      resumen: 'Raising your arms out to the sides, like wings, up to shoulder height.',
      pasos: ['Standing, a weight in each hand at your sides.', 'Elbows slightly bent and fixed.', 'Raise your arms out to the sides up to shoulder height.', 'Lower slowly, counting to two.'],
      errores: ['Using too much weight and swinging your body.', 'Raising above shoulder height.', 'Shrugging your shoulders toward your ears.'],
      sientes: 'On the side of your shoulder. It feels heavy even with light weight — that is normal.',
      facil: 'Do it with no weight, or two small water bottles.'
    }
  },
  {
    claves: ['elevacion talon', 'calf raise', 'gemelo', 'pantorrilla'],
    es: {
      nombre: 'Elevación de talones',
      resumen: 'Ponerte de puntillas y bajar, despacio.',
      pasos: ['De pie, pies al ancho de la cadera.', 'Sube despacio poniéndote de puntillas.', 'Aguanta arriba un segundo.', 'Baja despacio hasta apoyar del todo.'],
      errores: ['Rebotar arriba y abajo sin control.', 'Apoyarse tanto en la pared que el trabajo lo hacen los brazos.', 'No bajar del todo.'],
      sientes: 'En la pantorrilla, detrás de la parte baja de la pierna.',
      facil: 'Apóyate en una pared con la punta de los dedos para el equilibrio.'
    },
    en: {
      nombre: 'Calf raises',
      resumen: 'Rising up onto your toes and back down, slowly.',
      pasos: ['Standing, feet hip-width apart.', 'Rise slowly onto your toes.', 'Hold at the top for a second.', 'Lower slowly until your heels are flat again.'],
      errores: ['Bouncing up and down without control.', 'Leaning on the wall so much that your arms do the work.', 'Not lowering all the way.'],
      sientes: 'In your calves, the back of your lower leg.',
      facil: 'Touch a wall with your fingertips just for balance.'
    }
  },
  {
    claves: ['perro pajaro', 'bird dog', 'cuadrupedia'],
    es: {
      nombre: 'Bird dog',
      resumen: 'A cuatro patas, estirar un brazo y la pierna del otro lado.',
      pasos: ['A cuatro patas, manos bajo los hombros y rodillas bajo la cadera.', 'Estira a la vez un brazo y la pierna contraria.', 'Quédate quieto un segundo sin girar la cadera.', 'Vuelve y cambia de lado.'],
      errores: ['Girar la cadera al estirar la pierna.', 'Subir la pierna más alto que la espalda.', 'Ir rápido y perder el equilibrio.'],
      sientes: 'En el abdomen y la espalda baja, trabajando para no moverse.',
      facil: 'Estira solo el brazo, o solo la pierna, sin combinarlos.'
    },
    en: {
      nombre: 'Bird dog',
      resumen: 'On all fours, reaching out one arm and the opposite leg.',
      pasos: ['On all fours, hands under shoulders, knees under hips.', 'Extend one arm and the opposite leg at the same time.', 'Hold still for a second without twisting your hips.', 'Return and switch sides.'],
      errores: ['Twisting your hips as you extend the leg.', 'Lifting the leg higher than your back.', 'Rushing and losing your balance.'],
      sientes: 'In your abs and lower back, working to keep you still.',
      facil: 'Extend just the arm, or just the leg, without combining them.'
    }
  },
  {
    claves: ['dominada', 'pull up', 'pullup', 'jalon', 'chin up'],
    es: {
      nombre: 'Dominadas',
      resumen: 'Colgarte de una barra y subir hasta pasar la barbilla.',
      pasos: ['Cuélgate de la barra con las manos algo más abiertas que los hombros.', 'Baja los hombros antes de empezar a tirar.', 'Tira llevando los codos hacia abajo y atrás.', 'Sube hasta pasar la barbilla y baja controlando.'],
      errores: ['Balancearse para subir con impulso.', 'Encoger los hombros hacia las orejas al colgar.', 'Bajar de golpe hasta quedar totalmente colgado.'],
      sientes: 'En la espalda y los bíceps.',
      facil: 'Con los pies apoyados en una silla, o solo la bajada, muy despacio.'
    },
    en: {
      nombre: 'Pull-ups',
      resumen: 'Hanging from a bar and pulling up until your chin clears it.',
      pasos: ['Hang from the bar, hands slightly wider than your shoulders.', 'Pull your shoulders down before you start pulling.', 'Pull by driving your elbows down and back.', 'Get your chin over the bar, then lower with control.'],
      errores: ['Swinging to get up with momentum.', 'Shrugging your shoulders to your ears while hanging.', 'Dropping fast into a dead hang.'],
      sientes: 'In your back and biceps.',
      facil: 'Keep your feet on a chair, or do only the lowering part, very slowly.'
    }
  },
  {
    claves: ['giro ruso', 'russian twist', 'oblicuo'],
    es: {
      nombre: 'Giro ruso',
      resumen: 'Sentado y echado atrás, girar el cuerpo a un lado y al otro.',
      pasos: ['Siéntate con las rodillas dobladas y los pies en el suelo.', 'Inclínate un poco hacia atrás con la espalda recta.', 'Gira el tronco a un lado y luego al otro.', 'Mueve los hombros, no solo los brazos.'],
      errores: ['Redondear la espalda al inclinarse.', 'Mover solo los brazos de lado a lado.', 'Ir tan rápido que el abdomen deja de trabajar.'],
      sientes: 'En los costados del abdomen.',
      facil: 'Deja los pies bien apoyados y gira menos.'
    },
    en: {
      nombre: 'Russian twist',
      resumen: 'Sitting leaned back, twisting your body from side to side.',
      pasos: ['Sit with knees bent and feet on the floor.', 'Lean back slightly with a straight back.', 'Rotate your torso to one side, then the other.', 'Move your shoulders, not just your arms.'],
      errores: ['Rounding your back as you lean.', 'Only swinging your arms side to side.', 'Going so fast your abs stop working.'],
      sientes: 'Down the sides of your midsection.',
      facil: 'Keep your feet planted and rotate less.'
    }
  }
];

/* Índice: cada clave, en todas sus formas, apunta a su ficha. */
const INDICE = new Map();
for (const f of FICHAS) {
  for (const clave of f.claves) {
    for (const v of variantes(normalizarNombre(clave))) {
      if (!INDICE.has(v)) INDICE.set(v, f);
    }
  }
}

/* Busca la ficha de un ejercicio. Devuelve null si no está en la biblioteca
 * (entonces la app se la pide al genio una sola vez). Devolver null es lo
 * correcto: dar una ficha "parecida" sería explicarle a alguien un ejercicio
 * que no está haciendo. */
export function buscarFicha(nombre, idioma = 'es') {
  const n = normalizarNombre(nombre);
  if (!n) return null;

  // 1. Coincidencia exacta, probando todas las formas del nombre.
  let f = null;
  for (const v of variantes(n)) {
    if (INDICE.has(v)) { f = INDICE.get(v); break; }
  }

  // 2. Si no, ¿el nombre CONTIENE una clave conocida? ("sentadilla con salto").
  //    Se queda con la clave MÁS LARGA que encaje, para que "plancha lateral"
  //    no caiga por error en "plancha".
  if (!f) {
    let mejor = '';
    for (const v of variantes(n)) {
      const conBordes = ' ' + v + ' ';
      for (const clave of INDICE.keys()) {
        if (clave.length <= mejor.length) continue;
        if (conBordes.includes(' ' + clave + ' ')) mejor = clave;
      }
    }
    if (mejor) f = INDICE.get(mejor);
  }
  if (!f) return null;

  const lado = f[idioma === 'en' ? 'en' : 'es'];
  return { ...lado, dibujo: dibujoDeFicha(f), fuente: 'biblioteca' };
}

/* 🖼️ EL NOMBRE DE ARCHIVO DEL DIBUJO DE UN EJERCICIO
 *
 * Los dibujos viven en /dibujos y se llaman como la PRIMERA clave de su ficha.
 * Se usa la clave y no el nombre por dos razones:
 *
 *   - No cambia con el idioma. "Sentadilla" y "Squat" son el mismo movimiento,
 *     y sería absurdo tener dos copias del mismo dibujo.
 *   - No cambia si algún día se reescribe el nombre visible de la ficha. El
 *     texto se puede retocar cuando quieras sin que se rompa ninguna imagen.
 *
 * Una variante ("sentadilla con salto") cae en la ficha de la sentadilla, así
 * que también recibe su dibujo. Es lo correcto: es el mismo movimiento.
 */
function dibujoDeFicha(f) {
  return normalizarNombre(f.claves[0]).replace(/\s+/g, '-');
}

/* Todos los nombres de archivo de dibujo que la biblioteca puede pedir.
 * Sirve para saber exactamente qué hay que dibujar, y para que una prueba
 * compruebe que no hay dos ejercicios peleándose por el mismo dibujo. */
export const DIBUJOS = FICHAS.map(dibujoDeFicha);

/* Convierte una ficha en el texto que la voz lee en voz alta. */
export function fichaEnVoz(ficha, idioma = 'es') {
  if (!ficha) return '';
  const es = idioma !== 'en';
  const partes = [ficha.nombre + '.'];
  (ficha.pasos || []).forEach(p => partes.push(p));
  if (ficha.errores && ficha.errores.length) {
    partes.push(es ? 'Errores comunes:' : 'Common mistakes:');
    ficha.errores.forEach(e => partes.push(e));
  }
  if (ficha.sientes) partes.push((es ? 'Dónde lo debes sentir: ' : 'Where you should feel it: ') + ficha.sientes);
  return partes.join(' ');
}

export const CUANTAS_FICHAS = FICHAS.length;
