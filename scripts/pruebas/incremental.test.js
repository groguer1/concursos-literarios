/* Prueba del modo incremental (20/09/2026).
   Se prueba ROMPIENDOLO A PROPOSITO, igual que el freno de publicacion: lo que hay
   que demostrar no es que ahorre, sino que CUANDO FALLA no empeora nada. Los tres
   riesgos reales de este cambio son:
     1. que duplique concursos al conservar los de ayer (el modelo reescribe el titulo
        cada dia, asi que el dedupe por titulo NO basta),
     2. que se quede en incremental para siempre y no se entere de un cambio de bases,
     3. que oculte un raspado roto, porque cero concursos nuevos es lo normal. */
const { esBarridoCompleto, claveURL, fusionar, fuentesMudas, MIN_ENLACES } =
  require('../buscar-concursos.js');

let fallos = 0;
function ok(nombre, cond, detalle) {
  if (!cond) fallos++;
  console.log('  ' + (cond ? 'ok   ' : 'FALLA') + ' ' + nombre + (cond ? '' : '   <-- ' + (detalle || '')));
}

const lunes     = new Date(2026, 8, 21);  // 21/09/2026, lunes
const martes    = new Date(2026, 8, 22);
const domingo   = new Date(2026, 8, 20);
const listado   = n => new Array(n).fill(0).map((_, i) => ({ titulo: 'c' + i, url: 'https://x.es/' + i, fecha_limite: '' }));

console.log('\nCUANDO TOCA BARRIDO COMPLETO\n');
ok('el lunes se reprocesa todo',              esBarridoCompleto(listado(170), lunes).si === true);
ok('el martes va en incremental',             esBarridoCompleto(listado(170), martes).si === false);
ok('el domingo va en incremental',            esBarridoCompleto(listado(170), domingo).si === false);
ok('sin listado anterior, completo',          esBarridoCompleto(null, martes).si === true);
ok('con el listado anterior vacio, completo', esBarridoCompleto([], martes).si === true);
ok('con un listado sospechosamente corto, completo', esBarridoCompleto(listado(5), martes).si === true,
   'un listado de 5 casi siempre es un dia roto: conservarlo lo perpetuaria');
process.env.BARRIDO_COMPLETO = '1';
ok('se puede forzar a mano para probarlo',    esBarridoCompleto(listado(170), martes).si === true);
delete process.env.BARRIDO_COMPLETO;

console.log('\nLA CLAVE POR URL (el dedupe que faltaba)\n');
ok('la barra final no crea un concurso nuevo',
   claveURL('https://escritores.org/42034-premio/') === claveURL('https://escritores.org/42034-premio'));
ok('las mayusculas del host tampoco',
   claveURL('https://Escritores.ORG/42034') === claveURL('https://escritores.org/42034'));
ok('el ancla y la querystring tampoco',
   claveURL('https://x.es/a?utm=1#bases') === claveURL('https://x.es/a'));
ok('dos concursos distintos NO colisionan',
   claveURL('https://x.es/a') !== claveURL('https://x.es/b'));
ok('una url invalida da cadena vacia y no agrupa a nadie',
   claveURL('no soy una url') === '' && claveURL('') === '' && claveURL(null) === '');

console.log('\nLA FUSION\n');
const fijo      = { titulo: 'Premio Fijo',            url: 'https://x.es/fijo',  premio: 'ficha a mano' };
const conocido  = { titulo: 'XII Certamen de Poesia', url: 'https://x.es/p12',   premio: '500 €' };
/* El caso real del 20/09: el mismo concurso, la misma URL, el titulo reescrito. */
const mismoOtro = { titulo: 'CERTAMEN XII DE POESIA', url: 'https://x.es/p12/',  premio: '500 euros' };
const nuevo     = { titulo: 'Nuevo Relato',           url: 'https://x.es/nuevo', premio: '300 €' };

let r = fusionar([fijo], [conocido], [mismoOtro, nuevo]);
ok('el mismo concurso con el titulo reescrito NO se duplica', r.length === 3,
   'salen ' + r.length + ': ' + r.map(c => c.titulo).join(' | '));
ok('gana el titulo del listado de ayer, que es el estable',
   r.some(c => c.titulo === 'XII Certamen de Poesia') && !r.some(c => c.titulo === 'CERTAMEN XII DE POESIA'));
ok('el concurso nuevo si entra', r.some(c => c.titulo === 'Nuevo Relato'));
ok('el fijo va primero y gana', r[0].titulo === 'Premio Fijo');

r = fusionar([], [], [nuevo, { ...nuevo }]);
ok('dos copias identicas del rastreo se quedan en una', r.length === 1);

r = fusionar([], [], [{ titulo: 'Sin url A', url: '' }, { titulo: 'Sin url B', url: '' }]);
ok('dos concursos SIN url no se fusionan entre si', r.length === 2,
   'la url vacia no puede agrupar: se perderian concursos buenos');

r = fusionar([], [conocido], []);
ok('un dia sin nada nuevo conserva el listado entero', r.length === 1);

r = fusionar([], [], []);
ok('todo vacio no revienta', Array.isArray(r) && r.length === 0);

console.log('\nEL CHIVATO DE FUENTE MUDA\n');
ok('una fuente que ha dejado de leerse se detecta',
   fuentesMudas({ 'escritores.org': 0, 'guiadeconcursos.com': 170 }).join() === 'escritores.org');
ok('un dia normal no avisa de nada',
   fuentesMudas({ 'escritores.org': 411, 'guiadeconcursos.com': 170 }).length === 0);
ok('el umbral es bajo a proposito, no salta por poco',
   fuentesMudas({ 'a': MIN_ENLACES }).length === 0 && fuentesMudas({ 'a': MIN_ENLACES - 1 }).length === 1);

console.log('\n' + (fallos ? fallos + ' FALLO(S)' : 'Todo correcto') + '\n');
process.exit(fallos ? 1 : 0);
