const fs = require('fs');
const https = require('https');
const zlib = require('zlib');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

// Afiliación: programa de la librería (Awin). El deep link se monta con estos dos
// identificadores y la URL de la ficha; Awin le añade su token de seguimiento al redirigir.
const AWIN_MID = '21491';
const AWIN_AFFID = '3033279';
const AWIN_SUBID = 'letras-libros';

// Guardian por si una peticion se queda colgada. Va con unref() a proposito: asi NO mantiene
// vivo el bucle de eventos cuando el trabajo ya esta hecho. Sin unref el proceso nunca
// terminaba solo y dependia de que este temporizador lo matara, que es lo que rompio el
// 21/08/2026 al subirlo de 180 s a 300 s sin tocar el timeout-minutes del workflow.
setTimeout(() => { console.log('Timeout global'); process.exit(0); }, 300000).unref();

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

// ─────────────────────────────────────────────────────────────────────────────
// ISBN → ficha de la librería
//
// El ISBN no viene en los datos de CEGAL, pero sí dentro de la URL de la portada:
// static.cegal.es/imagenes/marcadas/9788433/978843398083.gif → los 12 primeros
// dígitos del ISBN-13. El decimotercero es un dígito de control y se calcula.
//
// Y la ficha de la librería NO se puede construir solo con el ISBN: su URL lleva
// además un id interno (/libro-{slug}/{isbn}/{id}), y su buscador no resuelve por
// ISBN (comprobado el 13/08: /libros?q= ignora el parámetro y devuelve la portada
// de la sección). La vía que sí funciona son sus sitemaps públicos de más vendidos,
// que traen la URL completa de cada ficha con el ISBN dentro. Son 39 ficheros .gz,
// unos 43 MB, y se leen en streaming quedándose solo con los ISBN que interesan.
// ─────────────────────────────────────────────────────────────────────────────

function isbnDesdePortada(url) {
  const m = String(url || '').match(/(\d{12})\.(?:gif|jpg|jpeg|png)/i);
  if (!m) return null;
  const p = m[1];
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += (+p[i]) * (i % 2 ? 3 : 1);
  return p + ((10 - (suma % 10)) % 10);
}

function httpsGet(url, comoTexto) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpsGet(res.headers.location, comoTexto));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const flujo = url.endsWith('.gz') ? res.pipe(zlib.createGunzip()) : res;
      const trozos = [];
      flujo.on('data', c => trozos.push(c));
      flujo.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')));
      flujo.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function resolverFichas(isbnsBuscados) {
  const encontrados = new Map();
  if (!isbnsBuscados.size) return encontrados;
  const pendientes = new Set(isbnsBuscados);
  let indice;
  try {
    indice = await httpsGet('https://www.casadellibro.com/sitemap-cdl-libros-tematicas.xml');
  } catch (e) {
    console.log('No se pudo leer el indice de sitemaps (' + e.message + '); los botones se quedan como estaban');
    return encontrados;
  }
  const ficheros = [...indice.matchAll(/<loc>([^<]+\.xml\.gz)<\/loc>/g)].map(m => m[1]);
  console.log('Sitemaps de la libreria: ' + ficheros.length);

  for (const f of ficheros) {
    if (!pendientes.size) break;
    let xml;
    try { xml = await httpsGet(f); }
    catch (e) { console.log('  salto ' + f.split('/').pop() + ': ' + e.message); continue; }
    for (const m of xml.matchAll(/<loc>(https:\/\/www\.casadellibro\.com\/libro-[^<\/]+\/(\d{13})\/\d+)<\/loc>/g)) {
      if (pendientes.has(m[2]) && !encontrados.has(m[2])) {
        encontrados.set(m[2], m[1]);
        pendientes.delete(m[2]);
      }
    }
  }
  console.log('Fichas resueltas: ' + encontrados.size + ' de ' + isbnsBuscados.size);
  return encontrados;
}

function enlaceAfiliado(urlFicha) {
  return 'https://www.awin1.com/cread.php?awinmid=' + AWIN_MID +
         '&awinaffid=' + AWIN_AFFID +
         '&clickref=' + encodeURIComponent(AWIN_SUBID) +
         '&ued=' + encodeURIComponent(urlFicha);
}

function escHtml(s) {
return String(s == null ? '' : s)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function jsEsc(s) {
return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const NO_RESULTS_DIV = '<div class="empty" id="no-results" style="display:none;grid-column:1/-1">No se encontraron libros con esos criterios</div>';

function generarTarjetas(libros, fichas) {
return libros.map(l => {
const isbn = isbnDesdePortada(l.portada);
const urlFicha = isbn && fichas ? fichas.get(isbn) : null;
// Si se ha resuelto la ficha, el botón lleva al libro concreto con el enlace de
// afiliado. Si no, se deja el buscador de siempre: es preferible a mandar al
// lector a la portada de una tienda que no ha pedido.
const botón = urlFicha
? '<a class="book-search-btn" href="' + escHtml(enlaceAfiliado(urlFicha)) + '" target="_blank" rel="sponsored nofollow noopener">📖 Comprar el libro</a>'
: '<button class="book-search-btn" onclick="buscarEnGoogle(\'' + jsEsc(l.titulo) + '\',\'' + jsEsc(l.autor) + '\')">🔍 Buscar en Google</button>';
const searchData = ((l.titulo || '') + ' ' + (l.autor || '') + ' ' + (l.editorial || '')).toLowerCase();
const generoAttr = (l.genero || '').toLowerCase();
const coverBlock = l.portada
? '<img class="book-cover" src="' + escHtml(l.portada) + '" alt="' + escHtml(l.titulo) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
: '';
return '<div class="book-card" data-genero="' + escHtml(generoAttr) + '" data-search="' + escHtml(searchData) + '">\n' +
coverBlock + '\n' +
'<div class="book-cover-placeholder" style="' + (l.portada ? 'display:none' : '') + '">\n' +
'<div>\n' +
'<div style="font-weight:700;margin-bottom:.5rem">' + escHtml(l.titulo) + '</div>\n' +
'<div style="font-size:.7rem">' + escHtml(l.autor) + '</div>\n' +
'</div>\n' +
'</div>\n' +
'<div class="book-info">\n' +
'<div class="book-title">' + escHtml(l.titulo) + '</div>\n' +
'<div class="book-author">' + escHtml(l.autor) + '</div>\n' +
'<div class="book-editorial">' + escHtml(l.editorial) + ' · ' + escHtml(l.fecha) + '</div>\n' +
'<div class="book-genre">' + escHtml(l.genero) + '</div>\n' +
botón + '\n' +
'</div>\n' +
'</div>';
}).join('\n');
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

  // Resolver la ficha de cada libro en la librería afiliada. Si falla, el guard de
  // resolverFichas() devuelve un mapa vacío y las tarjetas salen con el botón de
  // siempre: nunca se queda la página sin botón.
  const isbns = new Set(libros.map(l => isbnDesdePortada(l.portada)).filter(Boolean));
  console.log('ISBN calculados: ' + isbns.size + ' de ' + libros.length);
  let fichas = new Map();
  try { fichas = await resolverFichas(isbns); }
  catch (e) { console.log('Resolucion de fichas fallida: ' + e.message); }

  let html_file = fs.readFileSync('libros.html', 'utf8');
  const librosJS = 'const LIBROS_BASE = ' + JSON.stringify(libros) + ';';
  const regex = /const LIBROS_BASE = \[[\s\S]*?\];/;

  if (!regex.test(html_file)) { console.error('No se encontro LIBROS_BASE'); process.exit(1); }

  html_file = html_file.replace(regex, librosJS);

const gridStartTag = '<div class="books-grid" id="books-grid">';
const gridStartIdx = html_file.indexOf(gridStartTag);
const mainCloseIdx = html_file.indexOf('</main>', gridStartIdx);

if (gridStartIdx === -1 || mainCloseIdx === -1) {
console.error('No se encontro books-grid o </main>, se actualiza solo LIBROS_BASE');
} else {
const cardsHtml = generarTarjetas(libros, fichas);
const newGridBlock = gridStartTag + '\n' + cardsHtml + '\n' + NO_RESULTS_DIV + '\n</div>\n';
html_file = html_file.substring(0, gridStartIdx) + newGridBlock + html_file.substring(mainCloseIdx);
}

fs.writeFileSync('libros.html', html_file, 'utf8');
  console.log('Actualizado con ' + libros.length + ' libros:');
  libros.forEach(l => console.log('  - ' + l.titulo + ' (' + l.autor + ')'));
  process.exit(0);
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
