const fs = require('fs');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.finalescerrados.com/p/concursos.html',
  'https://www.guiadeconcursos.com/',
];
setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 120000);

function httpsPost(hostname, path, headers, bodyBuf) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, port: 443, path, method: 'POST',
      headers: { ...headers, 'Content-Length': bodyBuf.length },
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch(e) { reject(new Error('JSON invalido')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyBuf);
    req.end();
  });
}

async function fetchUrl(url) {
  try {
    const urlObj = new URL(PROXY_URL);
    const body = Buffer.from(JSON.stringify({ type: 'fetch', url }), 'utf8');
    const result = await httpsPost(urlObj.hostname, urlObj.pathname, {
      'Content-Type': 'application/json',
    }, body);
    console.log('DEBUG proxy keys:', Object.keys(result));
    console.log('DEBUG primeros 300 chars:', JSON.stringify(result).substring(0, 300));
    return result.contents || result.content || result.html || result.text || null;
  } catch(e) {
    console.warn('Error leyendo ' + url + ': ' + e.message);
    return null;
  }
}

function limpiarHTML(texto) {
  return texto
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function llamarIA(textoFuente, urlFuente) {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  const textoLimpio = limpiarHTML(textoFuente).substring(0, 15000);

  console.log('DEBUG texto limpio chars:', textoLimpio.length);
  console.log('DEBUG muestra texto:', textoLimpio.substring(0, 400));

  const prompt = 'Analiza este texto de la web ' + urlFuente + ' sobre concursos literarios. Extrae TODOS los concursos que encuentres, especialmente los que tengan fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Si no ves fechas claras, incluye igualmente los concursos con fecha_limite vacia. Devuelve SOLO array JSON valido sin texto adicional: [{"titulo":"nombre del concurso","organizacion":"entidad convocante","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion economica","fecha_limite":"DD/MM/YYYY o vacia","descripcion":"descripcion breve","url":"url si aparece o vacia","nuevo":false}] Si no encuentras ninguno devuelve exactamente: []\n\n' + textoLimpio;

  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  }), 'utf8');

  const result = await httpsPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
  }, body);

  if (result.error) throw new Error(JSON.stringify(result.error));

  const respuesta = result.content[0].text;
  console.log('DEBUG respuesta IA:', respuesta.substring(0, 500));
  return respuesta;
}

function diasHasta(fechaStr) {
  if (!fechaStr) return 30;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return 30;
  return Math.ceil((new Date(parts[2], parts[1]-1, parts[0]) - new Date()) / 86400000);
}

async function main() {
  console.log('Iniciando busqueda de concursos...');
  if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_KEY no configurado'); process.exit(1); }

  let todosLosConcursos = [];

  for (const url of FUENTES) {
    console.log('Leyendo ' + url);
    const contents = await fetchUrl(url);
    if (!contents) { console.warn('No se pudo leer ' + url); continue; }
    console.log('Leido OK (' + contents.length + ' chars)');

    console.log('Analizando ' + url + ' con IA...');
    try {
      const respuesta = await llamarIA(contents, url);
      const match = respuesta.match(/\[[\s\S]*\]/);
      if (!match) { console.warn('Sin JSON en respuesta para ' + url); continue; }
      const concursos = JSON.parse(match[0]);
      console.log('Encontrados en ' + url + ': ' + concursos.length);
      todosLosConcursos = todosLosConcursos.concat(concursos);
    } catch(e) {
      console.error('Error IA para ' + url + ': ' + e.message);
    }
  }

  if (!todosLosConcursos.length) { console.log('Sin concursos nuevos'); process.exit(0); }

  const concursos = todosLosConcursos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= 61; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos en rango: ' + concursos.length);
  if (!concursos.length) { console.log('Ninguno en rango de 2 meses'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(concursos) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  fs.writeFileSync('index.html', html_file.replace(regex, concursosJS), 'utf8');
  console.log('Actualizado con ' + concursos.length + ' concursos:');
  concursos.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
