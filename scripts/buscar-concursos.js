// scripts/buscar-concursos.js
const fs = require('fs');
const https = require('https');

const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.escritores.org/becas-y-concursos/',
  'https://culturamas.es/category/concursos/',
];

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON invalido: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function fetchUrl(url) {
  try {
    const result = await httpPost(PROXY_URL, { type: 'fetch', url });
    return result.contents || null;
  } catch(e) {
    console.warn('Error leyendo ' + url + ': ' + e.message);
    return null;
  }
}

async function llamarIA(prompt) {
  const result = await httpPost(PROXY_URL, {
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
  const fecha = new Date(parts[2], parts[1] - 1, parts[0]);
  return Math.ceil((fecha - new Date()) / 86400000);
}

async function main() {
  console.log('Iniciando busqueda de concursos...');

  if (!PROXY_URL) {
    console.error('PROXY_URL no configurado');
    process.exit(1);
  }

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

  if (!html) {
    console.log('No se pudieron leer las fuentes, saliendo');
    process.exit(0);
  }

  console.log('Analizando con IA...');
  const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const prompt = 'Analiza este HTML de webs de concursos literarios espanoles y extrae TODOS los concursos con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Devuelve SOLO array JSON sin texto adicional ni markdown: [{"titulo":"nombre exacto","organizacion":"entidad convocante","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion en euros","fecha_limite":"DD/MM/YYYY","descripcion":"descripcion breve","url":"URL exacta o cadena vacia","nuevo":false}] Si no encuentras concursos devuelve exactamente: []\n\n' + html;

  let concursos = [];
  try {
    const respuesta = await llamarIA(prompt);
    const match = respuesta.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No se encontro JSON');
    concursos = JSON.parse(match[0]);
    console.log('Encontrados ' + concursos.length + ' concursos');
  } catch(e) {
    console.error('Error IA: ' + e.message);
    process.exit(0);
  }

  if (concursos.length === 0) {
    console.log('Sin concursos nuevos');
    process.exit(0);
  }

  concursos = concursos.filter(c => {
    const dias = diasHasta(c.fecha_limite);
    return dias > 0 && dias <= 61;
  }).sort((a, b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Concursos validos: ' + concursos.length);

  if (concursos.length === 0) {
    console.log('Ninguno dentro del rango');
    process.exit(0);
  }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(concursos) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) {
    console.error('No se encontro CONCURSOS_BASE en index.html');
    process.exit(1);
  }

  html_file = html_file.replace(regex, concursosJS);
  fs.writeFileSync('index.html', html_file, 'utf8');
  console.log('index.html actualizado con ' + concursos.length + ' concursos');
  concursos.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => {
  console.error('Error fatal: ' + e.message);
  process.exit(0);
});
