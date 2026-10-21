/* La pagina de premios de poesia joven se rellena con un filtro por EDAD que solo puede
   leer el titulo y la descripcion. Estos casos salen de convocatorias reales del 21/10/2026:
   el Michele Leoni colaba por una cuota reducida «de 18 a 25 años». */
const assert = require('assert');
const { esPoesiaJoven } = require('../buscar-concursos.js');

const si = [
  { titulo: 'IX PREMIO DE POESÍA JOVEN TINO BARRIUSO', descripcion: 'Premio de poesía para autores nacidos a partir del 26 de mayo de 2001' },
  { titulo: 'XXIII PREMIO NACIONAL DE POESÍA JOVEN GRANDE AGUIRRE', descripcion: 'para residentes en España menores de 30 años' },
  { titulo: 'Certamen X', descripcion: 'para poetas menores de 35 años' },
  { titulo: 'Certamen Y', descripcion: 'Certamen de poesía joven para jóvenes de 18 a 25 años' },
];
const no = [
  { titulo: 'PREMIO LITERARIO INTERNACIONAL «MICHELE LEONI»', descripcion: 'Mayores de 18 años. Cuota de inscripción: 20 € por categoría (10 € de 18 a 25 años).' },
  { titulo: 'Certamen Z', descripcion: 'Certamen de poesía para mayores 18 años' },
  { titulo: 'Concurso', descripcion: 'para mayores de 60 años residentes en España' },
];
si.forEach(c => assert.strictEqual(esPoesiaJoven(c), true, 'debería entrar: ' + c.titulo));
no.forEach(c => assert.strictEqual(esPoesiaJoven(c), false, 'no debería entrar: ' + c.titulo));
console.log('poesia-joven: ' + (si.length + no.length) + ' casos OK');
