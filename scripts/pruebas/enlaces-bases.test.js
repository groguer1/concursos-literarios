/* Prueba del reintento cuando el modelo devuelve los concursos sin su enlace a las bases.
   Como la del freno de publicacion, se prueba con el caso real que lo motivo (11/09/2026:
   420 enlaces visibles, 88 concursos, 0 con enlace) y con los que NO deben reintentar,
   porque cada reintento es una llamada mas que se paga. */
const { faltanEnlaces, urlValida } = require('../buscar-concursos.js');

let fallos = 0;
let casos = 0;

function caso(nombre, obtenido, esperado) {
  casos++;
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'ok   ' : 'FALLA') + ' ' + nombre.padEnd(66) + JSON.stringify(obtenido));
  if (!ok) console.log('         esperaba ' + JSON.stringify(esperado));
}

console.log('REINTENTO POR ENLACES OMITIDOS\n');

// --- lo que DEBE reintentar ---
caso('el caso real del 11/09: 88 concursos, 0 enlaces, 420 visibles',
     faltanEnlaces(88, 0, 420), true);
caso('casi ninguno con enlace (10 de 88)',
     faltanEnlaces(88, 10, 420), true);

// --- lo que NO debe reintentar ---
caso('dia bueno del 10/09: 94 de 94',
     faltanEnlaces(94, 94, 421), false);
caso('fuente pequena (guiadeconcursos, 7 concursos)',
     faltanEnlaces(7, 0, 176), false);
caso('la fuente no trae enlaces: el fallo es del raspado, no del modelo',
     faltanEnlaces(80, 0, 0), false);
caso('la mayoria con enlace (60 de 88)',
     faltanEnlaces(88, 60, 420), false);

console.log('\nLIMPIEZA DE LA URL\n');
caso('con los corchetes del texto limpio', urlValida('[https://www.escritores.org/x]'), 'https://www.escritores.org/x');
caso('URL normal', urlValida('https://www.escritores.org/x'), 'https://www.escritores.org/x');
caso('ruta suelta, no es URL', urlValida('bases.pdf'), '');
caso('javascript: fuera', urlValida('javascript:alert(1)'), '');
caso('vacia', urlValida(''), '');

console.log('\n' + (fallos ? '⛔ ' + fallos + ' caso(s) mal' : '✅ Los ' + casos + ' casos, correctos.'));
process.exit(fallos ? 1 : 0);
