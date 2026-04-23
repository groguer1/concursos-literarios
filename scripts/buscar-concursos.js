const fs = require('fs');

const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.escritores.org/becas-y-concursos/',
  'https://culturamas.es/category/concursos/',
];

setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 120000);

async function postProxy(data) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(25000),
  });
  return res.json();
}

async function fetchUrl(url) {
  try {
    const result = await postProxy({ type: 'fetch', url });
    return result.contents || null;
  } catch(e) {
    console.warn('Error leyendo ' + url + ': ' + e.message);
    return null;
  }
}

async function llamarIA(prompt) {
  const result = await postProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  if (result.error) throw new Error(result.error.message || result.error);
  return result.content[0].text;
}

function diasHasta(fechaStr) {
  if (!fechaStr) return -1;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return -1;
  return Math.ceil((new Date(parts[2], parts[1]-1, parts[0]) - new Date()) / 86400000);
}

async function main() {
  console.log('Iniciando busqueda...');
  if (!PROXY_URL) { console.error('PROXY_URL no configurado'); process.exit(1); }

  let html = '';
  for (const url of FUENTES) {
    console.log('Leyendo ' + url);
    const contents = await fetchUrl(url);
    if (contents) {
const limpio = contents.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, 8000);
html += '\nFUENTE: ' + url + '\n' + limpio;
      console.log('OK');
    } else {
      console.warn('No se pudo leer ' + url);
    }
  }

  if (!html) { console.log('Sin fuentes, saliendo'); process.exit(0); }

  console.log('Llamando a IA...');
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date(); limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  const htmlSeguro = Buffer.from(html).toString('utf8').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
const prompt = 'Analiza este HTML...\n\n' + htmlSeguro;

  let concursos = [];
  try {
    const respuesta = await llamarIA(prompt);
    const match = respuesta.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Sin JSON');
    concursos = JSON.parse(match[0]);
    console.log('Encontrados: ' + concursos.length);
  } catch(e) {
    console.error('Error IA: ' + e.message);
    process.exit(0);
  }

  if (!concursos.length) { console.log('Sin concursos'); process.exit(0); }

  concursos = concursos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= 61; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos: ' + concursos.length);
  if (!concursos.length) { console.log('Ninguno en rango'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(concursos) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  fs.writeFileSync('index.html', html_file.replace(regex, concursosJS), 'utf8');
  console.log('Actualizado con ' + concursos.length + ' concursos');
  concursos.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error: ' + e.message); process.exit(0); });
