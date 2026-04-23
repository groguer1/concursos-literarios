const fs = require('fs');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.escritores.org/becas-y-concursos/',
  'https://culturamas.es/category/concursos/',
];

setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 120000);

function httpsPost(hostname, path, headers, bodyBuf) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
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

// Leer URL via Worker de Cloudflare
async function fetchUrl(url) {
  try {
    const urlObj = new URL(PROXY_URL);
    const body = Buffer.from(JSON.stringify({ type: 'fetch', url }), 'utf8');
    const result = await httpsPost(urlObj.hostname, urlObj.pathname, {
      'Content-Type': 'application/json',
    }, body);
    return result.contents || null;
  } catch(e) {
    console.warn('Error leyendo ' + url + ': ' + e.message);
    return null;
  }
}

// Llamar a Anthropic directamente
async function llamarIA(texto) {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  const textoLimpio = texto
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim()
    .substring(0, 6000);

  const prompt = 'Analiza estos textos de webs de concursos literarios espanoles. Extrae TODOS los concursos con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Devuelve SOLO array JSON: [{"titulo":"nombre","organizacion":"quien convoca","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion","fecha_limite":"DD/MM/YYYY","descripcion":"breve","url":"","nuevo":false}] Si no hay concursos devuelve: []\n\n' + textoLimpio;

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
  return result.content[0].text;
}

function diasHasta(fechaStr) {
  if (!fechaStr) return -1;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return -1;
  return Math.ceil((new Date(parts[2], parts[1]-1, parts[0]) - new Date()) / 86400000);
}

async function main() {
  console.log('Iniciando busqueda de concursos...');
  if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_KEY no configurado'); process.exit(1); }

  let html = '';
  for (const url of FUENTES) {
    console.log('Leyendo ' + url);
    const contents = await fetchUrl(url);
    if (contents) {
      html += '\nFUENTE: ' + url + '\n' + contents.substring(0, 8000);
      console.log('Leido OK');
    } else {
      console.warn('No se pudo leer ' + url);
    }
  }

  if (!html) { console.log('Sin fuentes, saliendo'); process.exit(0); }

  console.log('Analizando con IA...');
  let concursos = [];
  try {
    const respuesta = await llamarIA(html);
    console.log('Respuesta recibida');
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
  console.log('Actualizado con ' + concursos.length + ' concursos:');
  concursos.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
