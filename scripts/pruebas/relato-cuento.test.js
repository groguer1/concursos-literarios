/* La pagina de relato corto recoge tambien la categoria «Cuento», que el modelo devuelve
   aunque el prompt no la ofrezca (9 concursos el 22/10/2026 se quedaban fuera). */
const assert = require('assert');
const { esRelatoOCuento } = require('../buscar-concursos.js');

const si = ['Relato corto', 'Cuento', 'Microrrelato', 'Novela|Relato corto|Poesia|Teatro', 'cuento infantil'];
const no = ['Poesia', 'Novela', 'Teatro', 'Ensayo', 'Otro', '', undefined];
si.forEach(k => assert.strictEqual(esRelatoOCuento({ categoria: k }), true, 'deberia entrar: ' + k));
no.forEach(k => assert.strictEqual(esRelatoOCuento({ categoria: k }), false, 'no deberia entrar: ' + k));
console.log('relato-cuento: ' + (si.length + no.length) + ' casos OK');
