/* El mismo concurso llega con titulos distintos desde escritores.org y guiadeconcursos.com.
   Casos reales del listado del 23/10/2026: «Manuel Nevado» salia tres veces, Tudela y la
   Vera Cruz dos. Y el caso que NO se puede fusionar: los dos «I Concurso de relatos
   cortos», que comparten el 60 % de las palabras y son concursos distintos. */
const assert = require('assert');
const { mismoConcurso, fusionar } = require('../buscar-concursos.js');

const iguales = [
  [{ titulo: 'XXIII EDICIÓN CONCURSO DE MICRORRELATOS MINEROS «MANUEL NEVADO MADRID»', fecha_limite: '31/10/2026' },
   { titulo: 'XXIII Concurso de Microrrelatos Mineros MANUEL NEVADO MADRID 2026', fecha_limite: '' }],
  [{ titulo: 'XXIII Concurso de Microrrelatos Mineros MANUEL NEVADO MADRID 2026', fecha_limite: '' },
   { titulo: 'XXIII Edición del Concurso de Microrrelatos Mineros «Manuel Nevado Madrid» 2026', fecha_limite: '' }],
  [{ titulo: '42º CONCURSO DE POESÍA CIUDAD DE TUDELA', fecha_limite: '20/11/2026' },
   { titulo: '42º Concurso de Poesía de TUDELA-CULTURA', fecha_limite: '' }],
  [{ titulo: 'LVI Juegos Florales a la Stma. Vera Cruz', fecha_limite: '' },
   { titulo: 'LVI EDICIÓN DE LOS JUEGOS FLORALES A LA SANTÍSIMA VERA CRUZ', fecha_limite: '16/04/2027' }],
];
const distintos = [
  [{ titulo: 'I CONCURSO DE RELATOS CORTOS 2026', fecha_limite: '15/11/2026' },
   { titulo: 'I CONCURSO INTERNACIONAL DE RELATOS CORTOS ESCRITOS CON IA', fecha_limite: '15/01/2027' }],
  [{ titulo: 'XIV CONCURSO DE MICRORRELATOS "SAN SILVESTRE SALMANTINA 2026"', fecha_limite: '30/10/2026' },
   { titulo: 'XV CONCURSO DE MICRORRELATOS "SAN SILVESTRE SALMANTINA 2027"', fecha_limite: '' }],
  [{ titulo: 'III CONCURSO DE MICRORRELATO. ASOCIACIÓN ALMANSA FEMINISTA 2026', fecha_limite: '31/10/2026' },
   { titulo: 'III CONCURSO DE MICRORRELATOS MANCOMUNIDAD DEL BAJO ANDARAX 2026', fecha_limite: '31/10/2026' }],
];
iguales.forEach(([a, b]) => assert.strictEqual(mismoConcurso(a, b), true, 'deberían ser el mismo: ' + a.titulo + ' / ' + b.titulo));
distintos.forEach(([a, b]) => assert.strictEqual(mismoConcurso(a, b), false, 'no deberían fusionarse: ' + a.titulo + ' / ' + b.titulo));

// Al fusionar, el que se queda recoge la fecha y el enlace que le faltan.
const r = fusionar([], [
  { titulo: 'XXIII Concurso de Microrrelatos Mineros MANUEL NEVADO MADRID 2026', fecha_limite: '', url: '' },
], [
  { titulo: 'XXIII EDICIÓN CONCURSO DE MICRORRELATOS MINEROS «MANUEL NEVADO MADRID»', fecha_limite: '31/10/2026',
    url: 'https://www.escritores.org/recursos-para-escritores/41964-xxiii-edicion-concurso-de-microrrelatos-mineros-manuel-nevado-madrid' },
]);
assert.strictEqual(r.length, 1, 'tenía que quedar uno solo');
assert.strictEqual(r[0].fecha_limite, '31/10/2026', 'no recogió la fecha');
assert.ok(r[0].url.includes('escritores.org'), 'no recogió el enlace');

console.log('duplicados: ' + (iguales.length + distintos.length + 1) + ' casos OK');
