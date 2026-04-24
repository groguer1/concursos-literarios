const fs = require('fs');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 180000);

function httpsPost(hostname, path, headers, bodyBuf) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, port: 443, path, method: 'POST',
      headers: { ...headers, 'Content-Length': bodyBuf.length },
      timeout: 90000,
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

async function llamarIA(texto, fuente) {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  const textoLimpio = limpiarHTML(texto).substring(0, 15000);
  console.log('Texto limpio de ' + fuente + ': ' + textoLimpio.length + ' chars');
  console.log('Muestra: ' + textoLimpio.substring(0, 200));

  if (textoLimpio.length < 100) {
    console.warn('Texto demasiado corto, saltando ' + fuente);
    return '[]';
  }

  const prompt = 'Analiza este texto de una web de concursos literarios españoles. Extrae TODOS los concursos con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Si no hay fecha clara incluye el concurso con fecha_limite vacia. Devuelve SOLO array JSON sin texto adicional: [{"titulo":"nombre","organizacion":"entidad","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion","fecha_limite":"DD/MM/YYYY o vacia","descripcion":"descripcion breve","url":"url o vacia","nuevo":false}] Si no hay ninguno devuelve: []\n\n' + textoLimpio;

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
  console.log('Respuesta IA: ' + respuesta.substring(0, 300));
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

  const fuentes = [
    { archivo: '/tmp/fuente1.html', nombre: 'escritores.org' },
    { archivo: '/tmp/fuente2.html', nombre: 'culturamas.es' },
  ];

  let todos = [];
  for (const f of fuentes) {
    try {
      const html = fs.readFileSync(f.archivo, 'utf8');
      console.log('Leido ' + f.nombre + ': ' + html.length + ' bytes');
      const respuesta = await llamarIA(html, f.nombre);
      const match = respuesta.match(/\[[\s\S]*\]/);
      if (!match) { console.warn('Sin JSON para ' + f.nombre); continue; }
      const concursos = JSON.parse(match[0]);
      console.log('Encontrados en ' + f.nombre + ': ' + concursos.length);
      todos = todos.concat(concursos);
    } catch(e) {
      console.error('Error con ' + f.nombre + ': ' + e.message);
    }
  }

  if (!todos.length) { console.log('Sin concursos nuevos'); process.exit(0); }

  const filtrados = todos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= 61; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos en rango: ' + filtrados.length);
  if (!filtrados.length) { console.log('Ninguno en rango'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(filtrados) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;
  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  fs.writeFileSync('index.html', html_file.replace(regex, concursosJS), 'utf8');
  console.log('Actualizado con ' + filtrados.length + ' concursos:');
  filtrados.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
