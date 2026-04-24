const fs = require('fs');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 240000);

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

async function buscarConcursos() {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + 61);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  const prompt = 'Busca en internet concursos literarios en español convocados en España con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Usa fuentes como escritores.org, culturamas.es, guiadeconcursos.com o similares. Devuelve SOLO un array JSON valido sin texto adicional ni explicaciones: [{"titulo":"nombre del concurso","organizacion":"entidad convocante","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion economica","fecha_limite":"DD/MM/YYYY","descripcion":"descripcion breve","url":"url del concurso","nuevo":false}] Si no encuentras ninguno devuelve exactamente: []';

  const body = Buffer.from(JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }]
  }), 'utf8');

  const result = await httpsPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
  }, body);

  if (result.error) throw new Error(JSON.stringify(result.error));

  const texto = result.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  console.log('DEBUG respuesta IA:', texto.substring(0, 800));
  return texto;
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

  let concursos = [];
  try {
    const respuesta = await buscarConcursos();
    const match = respuesta.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Sin JSON en respuesta');
    concursos = JSON.parse(match[0]);
    console.log('Encontrados: ' + concursos.length);
  } catch(e) {
    console.error('Error: ' + e.message);
    process.exit(0);
  }

  if (!concursos.length) { console.log('Sin concursos nuevos'); process.exit(0); }

  const filtrados = concursos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= 61; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos en rango: ' + filtrados.length);
  if (!filtrados.length) { console.log('Ninguno en rango de 2 meses'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(filtrados) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  fs.writeFileSync('index.html', html_file.replace(regex, concursosJS), 'utf8');
  console.log('Actualizado con ' + filtrados.length + ' concursos:');
  filtrados.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
