// scripts/buscar-concursos.js
// Se ejecuta cada mañana via GitHub Actions
// Lee escritores.org via el Worker de Cloudflare y actualiza index.html con concursos reales

const fs = require('fs');
const https = require('https');

const PROXY_URL = process.env.PROXY_URL;
const FUENTES = [
  'https://www.escritores.org/becas-y-concursos/',
  'https://culturamas.es/category/concursos/',
];

// ── Hacer petición HTTPS ──
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
        catch(e) { reject(new Error('JSON inválido: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Leer URL via Worker ──
async function fetchUrl(url) {
  try {
    const result = await httpPost(PROXY_URL, { type: 'fetch', url });
    return result.contents || null;
  } catch(e) {
    console.warn(`Error leyendo ${url}:`, e.message);
    return null;
  }
}

// ── Llamar a Claude via Worker ──
async function llamarIA(prompt) {
  const result = await httpPost(PROXY_URL, {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  if (result.error) throw new Error(result.error.message || result.error);
  return result.content[0].text;
}

// ── Calcular días hasta fecha ──
function diasHasta(fechaStr) {
  if (!fechaStr) return -1;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return -1;
  const fecha = new Date(parts[2], parts[1] - 1, parts[0]);
  return Math.ceil((fecha - new Date()) / 86400000);
}

// ── Principal ──
async function main() {
  console.log('🔍 Iniciando búsqueda de concursos...');

  if (!PROXY_URL) {
    console.error('❌ PROXY_URL no configurado en secrets');
    process.exit(1);
  }

  // 1. Leer fuentes
  let html = '';
  for (const url of FUENTES) {
    console.log(`📖 Leyendo ${url}...`);
    const contents = await fetchUrl(url);
    if (contents) {
      html += `\nFUENTE: ${url}\n${contents.substring(0, 8000)}`;
      console.log(`✓ Leído (${contents.length} caracteres)`);
    } else {
      console.warn(`⚠ No se pudo leer ${url}`);
    }
  }

  if (!html) {
    console.error('❌ No se pudieron leer las fuentes');
    process.exit(0); // Salir sin error para no fallar el Action
  }

  // 2. Extraer concursos con IA
  console.log('🤖 Analizando con IA...');
  const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');

  const prompt = `Analiza este HTML de webs de concursos literarios españoles y extrae TODOS los concursos con fecha límite entre hoy (${hoy}) y ${fechaLimite}.
Para cada concurso intenta encontrar la URL exacta de la convocatoria.
Devuelve SOLO array JSON sin texto adicional ni markdown:
[{"titulo":"nombre exacto","organizacion":"entidad convocante","categoria":"Poesía|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotación en euros","fecha_limite":"DD/MM/YYYY","descripcion":"descripción breve de 1-2 frases","url":"URL exacta o cadena vacía","nuevo":false}]
Si no encuentras concursos con fecha futura devuelve exactamente: []

${html}`;

  let concursos = [];
  try {
    const respuesta = await llamarIA(prompt);
    const match = respuesta.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No se encontró JSON en la respuesta');
    concursos = JSON.parse(match[0]);
    console.log(`✓ Encontrados ${concursos.length} concursos`);
  } catch(e) {
    console.error('❌ Error procesando respuesta IA:', e.message);
    process.exit(0);
  }

  if (concursos.length === 0) {
    console.log('ℹ No se encontraron concursos nuevos');
    process.exit(0);
  }

  // 3. Filtrar solo concursos con fecha futura y dentro de 2 meses
  concursos = concursos.filter(c => {
    const dias = diasHasta(c.fecha_limite);
    return dias > 0 && dias <= 61;
  }).sort((a, b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log(`✓ ${concursos.length} concursos válidos tras filtrar`);

  if (concursos.length === 0) {
    console.log('ℹ Ningún concurso dentro del rango de 2 meses');
    process.exit(0);
  }

  // 4. Actualizar index.html
  console.log('📝 Actualizando index.html...');
  let html_file = fs.readFileSync('index.html', 'utf8');

  // Reemplazar el array CONCURSOS_BASE con los nuevos concursos reales
  const jsonConcursos = JSON.stringify(concursos, null, 0)
    .replace(/"/g, "'")
    .replace(/'([^']+)':/g, '$1:'); // Convertir a objeto JS sin comillas en keys

  // Usar JSON.stringify normal para ser seguro
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(concursos) + ';';

  // Reemplazar el bloque CONCURSOS_BASE en el HTML
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;
  if (!regex.test(html_file)) {
    console.error('❌ No se encontró CONCURSOS_BASE en index.html');
    process.exit(1);
  }

  html_file = html_file.replace(regex, concursosJS);
  fs.writeFileSync('index.html', html_file, 'utf8');

  console.log(`✅ index.html actualizado con ${concursos.length} concursos`);
  console.log('Concursos encontrados:');
  concursos.forEach(c => console.log(`  - ${c.titulo} (${c.fecha_limite})`));
}

main().catch(e => {
  console.error('❌ Error fatal:', e.message);
  process.exit(0); // No fallar el Action aunque haya error
});
