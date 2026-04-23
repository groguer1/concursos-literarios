const fs = require('fs');
const https = require('https');

const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.escritores.org/becas-y-concursos/',
  'https://culturamas.es/category/concursos/',
];

setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 120000);

// Usar https nativo con soporte explícito de encoding
function postProxy(data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const bodyBuf = Buffer.from(bodyStr, 'utf8');
    const urlObj = new URL(PROXY_URL);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': bodyBuf.length,
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(JSON.parse(text));
        } catch(e) {
          reject(new Error('JSON invalido'));
        }
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
    const result = await postProxy({ type: 'fetch', url });
    return result.contents || null;
  } catch(e) {
    console.warn('Error leyendo ' + url + ': ' + e.message);
    return null;
  }
}

async function llamarIA(htmlTexto) {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  // Limpiar el HTML de caracteres problemáticos
  const htmlLimpio = htmlTexto
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim()
    .substring(0, 6000);

  const prompt = [
    'Analiza estos textos de webs de concursos literarios espanoles.',
    'Extrae TODOS los concursos con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '.',
    'Devuelve SOLO array JSON valido:',
    '[{"titulo":"nombre","organizacion":"quien convoca","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion","fecha_limite":"DD/MM/YYYY","descripcion":"breve descripcion","url":"","nuevo":false}]',
    'Si no hay concursos devuelve: []',
    '',
    htmlLimpio
  ].join('\n');

  const result = await postProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

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
  if (!PROXY_URL) { console.error('PROXY_URL no configurado'); process.exit(1); }

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

  if (!html) { console.log('Sin fuentes disponibles, saliendo'); process.exit(0); }

  console.log('Analizando con IA...');
  let concursos = [];
  try {
    const respuesta = await llamarIA(html);
    console.log('Respuesta IA recibida');
    const match = respuesta.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Sin JSON en respuesta');
    concursos = JSON.parse(match[0]);
    console.log('Encontrados: ' + concursos.length);
  } catch(e) {
    console.error('Error IA: ' + e.message);
    process.exit(0);
  }

  if (!concursos.length) { console.log('Sin concursos nuevos'); process.exit(0); }

  concursos = concursos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= 61; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos en rango: ' + concursos.length);
  if (!concursos.length) { console.log('Ninguno en rango de 2 meses'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(concursos) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  fs.writeFileSync('index.html', html_file.replace(regex, concursosJS), 'utf8');
  console.log('index.html actualizado con ' + concursos.length + ' concursos:');
  concursos.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
