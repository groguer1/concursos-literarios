/* Los concursos METIDOS A MANO se publican aunque cierren mas alla de la ventana de 90
   dias; los RASTREADOS, no. Nacio del I Concurso de Relatos con IA, que cierra el
   15/01/2027 —a 116 dias de cuando se metio— y que sin esto no habria salido hasta el
   17/10 sin que nadie entendiera por que. */
const VENTANA_DIAS = 90;

function diasHasta(fechaStr) {
  if (!fechaStr) return 30;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return 30;
  return Math.ceil((new Date(parts[2], parts[1]-1, parts[0]) - new Date()) / 86400000);
}
function enPlazo(c) {
  const d = diasHasta(c.fecha_limite);
  return d > 0 && (c.fijo === true || d <= VENTANA_DIAS);
}

function fechaDentroDe(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
}

const casos = [
  ['fijo lejano (116 dias) SI se publica',        {fijo:true,  fecha_limite: fechaDentroDe(116)}, true],
  ['fijo cercano (10 dias) SI se publica',        {fijo:true,  fecha_limite: fechaDentroDe(10)},  true],
  ['fijo YA VENCIDO no se publica',               {fijo:true,  fecha_limite: fechaDentroDe(-1)},  false],
  ['fijo que vence hoy no se publica',            {fijo:true,  fecha_limite: fechaDentroDe(0)},   false],
  ['rastreado lejano (116 dias) NO se publica',   {            fecha_limite: fechaDentroDe(116)}, false],
  ['rastreado dentro de ventana SI se publica',   {            fecha_limite: fechaDentroDe(45)},  true],
  ['rastreado justo en el borde (90) SI',         {            fecha_limite: fechaDentroDe(90)},  true],
  ['rastreado vencido no se publica',             {            fecha_limite: fechaDentroDe(-5)},  false],
  ['fijo:false se trata como rastreado',          {fijo:false, fecha_limite: fechaDentroDe(116)}, false],
];

let fallos = 0;
for (const [nombre, c, esperado] of casos) {
  const real = enPlazo(c);
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'ok  ' : 'FALLA') + '  ' + nombre.padEnd(48) + (real ? 'publica' : 'fuera'));
}
if (fallos) { console.error('\n' + fallos + ' caso(s) mal'); process.exit(1); }
console.log('\n✅ Los ' + casos.length + ' casos, correctos.');
