/* Prueba del freno que impide publicar una portada vacia.
   Se prueba ROMPIENDOLO A PROPOSITO: un guard que nunca salta no comprueba nada,
   y uno que salta de mas deja la web congelada para siempre. */
const { decidirPublicacion } = require('../buscar-concursos.js');

const ayer = n => new Array(n).fill({ titulo: 'x' });
let fallos = 0;

function caso(nombre, anterior, ahora, porFuente, esperado) {
  const r = decidirPublicacion(anterior, ahora, porFuente);
  const ok = r.bloquear === esperado;
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'ok   ' : 'FALLA') + ' ' + nombre.padEnd(66) +
              (r.bloquear ? 'NO publica' : 'publica'));
  if (!ok) console.log('         esperaba ' + (esperado ? 'NO publicar' : 'publicar') + ' - ' + r.motivo);
}

console.log('FRENO DE PUBLICACION\n');

// --- lo que DEBE bloquear ---
caso('una fuente caida y el listado se desploma (el caso real del 27/08)',
     ayer(74), 9, { 'escritores.org': 0, 'guiadeconcursos.com': 0 }, true);
caso('solo cae la fuente grande, la otra aguanta',
     ayer(96), 12, { 'escritores.org': 0, 'guiadeconcursos.com': 3 }, true);

// --- lo que NO debe bloquear ---
caso('dia normal: las dos fuentes responden',
     ayer(96), 92, { 'escritores.org': 60, 'guiadeconcursos.com': 32 }, false);
caso('caida real: vencen muchas convocatorias pero nadie ha fallado',
     ayer(96), 40, { 'escritores.org': 30, 'guiadeconcursos.com': 10 }, false);
caso('una fuente da cero pero el listado NO se desploma',
     ayer(96), 80, { 'escritores.org': 80, 'guiadeconcursos.com': 0 }, false);
caso('la fuente vuelve al dia siguiente: se publica otra vez',
     ayer(96), 95, { 'escritores.org': 63, 'guiadeconcursos.com': 32 }, false);
caso('arranque en frio: no hay fichero anterior',
     [], 9, { 'escritores.org': 0, 'guiadeconcursos.com': 0 }, false);
caso('listado pequeño de partida (menos de 12): no se bloquea nunca',
     ayer(9), 3, { 'escritores.org': 0, 'guiadeconcursos.com': 3 }, false);

console.log('\n' + (fallos ? '⛔ ' + fallos + ' caso(s) mal' : '✅ Los 8 casos, correctos.'));
process.exit(fallos ? 1 : 0);
