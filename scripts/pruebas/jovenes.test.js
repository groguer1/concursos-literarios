/* La pagina de concursos para jovenes se rellena con un filtro por EDAD o por ser para
   estudiantes, que solo puede leer el titulo y la descripcion. Casos reales del 24/10/2026. */
const assert = require('assert');
const { esParaJovenes } = require('../buscar-concursos.js');

const si = [
  { titulo: 'I PREMIO ESPASA CALPE DE NOVELA JUVENIL - 2027', descripcion: 'Premio de novela juvenil para escritores de 14 a 39 años' },
  { titulo: '7ª EDICIÓN "PALLARS SOBIRÀ, PIRINEOS"', descripcion: 'Novela corta para jóvenes entre 18 y 29 años' },
  { titulo: 'VIª EDICIÓN CONCURSO COR AD COR DE POESÍA', descripcion: 'Concurso de poesía para estudiantes de universidades de Madrid' },
  { titulo: 'Concurso juvenil #historiassinIA', descripcion: 'Concurso juvenil para promover la escritura sin IA' },
  { titulo: 'XXIII PREMIO NACIONAL DE POESÍA JOVEN GRANDE AGUIRRE', descripcion: 'para residentes en España menores de 30 años' },
];
const no = [
  { titulo: 'PREMIO LITERARIO INTERNACIONAL «MICHELE LEONI»', descripcion: 'Mayores de 18 años. Cuota de inscripción: 20 € por categoría (10 € de 18 a 25 años).' },
  { titulo: 'V CONCURSO DE LETRAS DE FANDANGO MGG', descripcion: 'Concurso de letras de fandango para tres categorías: estudiantes UBU, mayores de 60 años y participación conjunta' },
  { titulo: 'Certamen de novela', descripcion: 'Novela de 40.000 a 90.000 palabras para mayores de 18 años' },
  { titulo: 'Premio de relato', descripcion: 'para autores de 18 a 99 años' },
  { titulo: 'I PREMIO DE NOVELA JUVENIL X', descripcion: 'Premio de novela juvenil, sin límite de edad' },
];
si.forEach(c => assert.strictEqual(esParaJovenes(c), true, 'debería entrar: ' + c.titulo));
no.forEach(c => assert.strictEqual(esParaJovenes(c), false, 'no debería entrar: ' + c.titulo));
console.log('jovenes: ' + (si.length + no.length) + ' casos OK');
