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
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, ' [IMG:$1] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function llamarIA(texto) {
  const textoLimpio = limpiarHTML(texto).substring(0, 25000);
  console.log('Texto limpio: ' + textoLimpio.length + ' chars');

  if (textoLimpio.length < 100) {
    console.warn('Texto demasiado corto');
    return '[]';
  }

  const prompt = 'Analiza este texto de una web de novedades editoriales españolas. Extrae los 20 libros mas recientes. Para cada libro busca la URL de imagen de portada que aparece como [IMG:url]. Devuelve SOLO array JSON sin texto adicional ni marcadores de codigo: [{"titulo":"titulo del libro","autor":"nombre autor","editorial":"nombre editorial","genero":"Narrativa|Poesia|Ensayo|Infantil|Teatro|Otro","fecha":"MM/YYYY","portada":"url completa de la imagen o vacia","descripcion":"descripcion breve max 100 caracteres"}] Si no encuentras ninguno devuelve solo: []\n\n' + textoLimpio;

  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
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

async function main() {
  console.log('Iniciando busqueda de libros...');
  if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_KEY no configurado'); process.exit(1); }

  let libros = [];
  try {
    const html = fs.readFileSync('/tmp/libros.html', 'utf8');
    console.log('Leido casadellibro: ' + html.length + ' bytes');
    const respuesta = await llamarIA(html);
    const inicio = respuesta.indexOf('[');
    const fin = respuesta.lastIndexOf(']');
    if (inicio === -1 || fin === -1) throw new Error('Sin JSON en respuesta');
    libros = JSON.parse(respuesta.substring(inicio, fin + 1));
    console.log('Encontrados: ' + libros.length + ' libros');
  } catch(e) {
    console.error('Error: ' + e.message);
    process.exit(0);
  }

  if (!libros.length) { console.log('Sin libros nuevos'); process.exit(0); }

  let html_file = fs.readFileSync('libros.html', 'utf8');
  const librosJS = 'const LIBROS_BASE = ' + JSON.stringify(libros) + ';';
  const regex = /const LIBROS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro LIBROS_BASE'); process.exit(1); }

  fs.writeFileSync('libros.html', html_file.replace(regex, librosJS), 'utf8');
  console.log('Actualizado con ' + libros.length + ' libros:');
  libros.forEach(l => console.log('  - ' + l.titulo + ' (' + l.autor + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
