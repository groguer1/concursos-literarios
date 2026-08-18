const fs = require('fs');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

/* Ventana de convocatorias que se publican. Estaba en 60 dias y por eso el certamen
   Mariana de Carvajal (15/10/2026) no entraba: quedaba a 62. */
const VENTANA_DIAS = 90;

/* Convocatorias metidas a mano, normalmente las que llegan por correo y el rastreo
   no ve. Se juntan con las rastreadas y CADUCAN SOLAS al pasar su fecha limite,
   asi que no hay que acordarse de retirarlas. Fichero: concursos-fijos.json */
function leerFijos() {
  try {
    const arr = JSON.parse(fs.readFileSync('concursos-fijos.json', 'utf8'));
    console.log('Concursos fijos leidos: ' + arr.length);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('Sin concursos fijos (' + e.message + ')');
    return [];
  }
}

function claveTitulo(t) {
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

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
  limite.setDate(limite.getDate() + VENTANA_DIAS);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  /* Antes se cortaba en 25.000 caracteres y la pagina de escritores.org tiene 57.000
     de texto limpio: se tiraba el 56% SIN MIRARLO. Asi se perdio el certamen Mariana
     de Carvajal, que cae en el caracter 39.110. Cabe entero de sobra en el contexto. */
  const textoLimpio = limpiarHTML(texto).substring(0, 120000);
  console.log('Texto limpio de ' + fuente + ': ' + textoLimpio.length + ' chars');

  if (textoLimpio.length < 100) {
    console.warn('Texto demasiado corto, saltando ' + fuente);
    return '[]';
  }

  /* El tope de 15 por fuente era el que mas convocatorias se comia: escritores.org
     publica cientos y la IA devolvia solo las 15 mas cercanas, que a 14/08/2026 no
     pasaban del 30/08. Por eso quedaban fuera el Perez-Taybili (31/08) y LuchaLibro
     (04/09), aun estando los dos dentro del plazo que el filtro si acepta. */
  const prompt = 'Analiza este texto de una web de concursos literarios espanoles. Extrae TODOS los concursos que encuentres, hasta un maximo de 60, con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Si no hay fecha clara incluye el concurso con fecha_limite vacia. IMPORTANTE: incluye SOLO concursos LITERARIOS (poesia, relato, cuento, novela, teatro, ensayo, microrrelato, literatura infantil o juvenil). NO incluyas premios de pintura, fotografia, comic, musica, cine ni artes plasticas aunque aparezcan en el mismo listado. En "pais" indica el pais del organizador deducido del texto (nombre de la entidad, ciudad, moneda del premio): "Espana" si es de Espana o no hay indicios en contra, o el nombre del pais si es de Hispanoamerica u otro. Si el texto incluye el enlace a las bases o a la convocatoria, ponlo en "url"; no inventes URLs. Devuelve SOLO array JSON sin texto adicional ni marcadores de codigo. Ejemplo: [{"titulo":"nombre","organizacion":"entidad","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion","fecha_limite":"DD/MM/YYYY o vacia","descripcion":"descripcion breve max 100 caracteres","url":"url o vacia","pais":"Espana u otro pais","nuevo":false}] Si no hay ninguno devuelve solo: []\n\n' + textoLimpio;

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

function diasHasta(fechaStr) {
  if (!fechaStr) return 30;
  const parts = fechaStr.split('/');
  if (parts.length !== 3) return 30;
  return Math.ceil((new Date(parts[2], parts[1]-1, parts[0]) - new Date()) / 86400000);
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStaticCardsHTML(arr) {
  return arr.map(c => {
    const cat = escapeHtml(c.categoria || 'Otro');
    const premio = escapeHtml(c.premio || 'Sin especificar');
    const fecha = c.fecha_limite ? ('Hasta ' + escapeHtml(c.fecha_limite)) : '';
    return '<div class="card"><div class="card-meta"><span class="card-cat">' + cat + '</span></div><h3 class="card-title">' + escapeHtml(c.titulo) + '</h3><div class="card-org">' + escapeHtml(c.organizacion || '') + '</div><div class="card-footer"><span class="card-premio">' + premio + '</span><span class="card-fecha">' + fecha + '</span></div></div>';
  }).join('');
}

/* PUBLICIDAD (tarifas y condiciones en PUBLICIDAD.md). El bloque destacado NO puede
   escribirse a mano en index.html: este script reescribe el fichero entero cada dia a
   las 06:00 y se lo llevaria por delante. Vive en publicidad.json y CADUCA SOLO al
   pasar su fecha "hasta", igual que los concursos fijos, para que no siga publicado un
   anuncio ya vencido. Si algo falta o no cuadra, no se publica nada: mas vale hueco
   que un anuncio a medias. */
function leerPublicidad() {
  let p;
  try {
    p = JSON.parse(fs.readFileSync('publicidad.json', 'utf8'));
  } catch (e) {
    console.warn('Sin publicidad (' + e.message + ')');
    return null;
  }
  if (!p || p.activo !== true) { console.log('Publicidad: sin anunciante activo'); return null; }
  if (!p.titulo || !p.url) { console.warn('Publicidad ACTIVA pero le falta titulo o url: no se publica'); return null; }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(p.hasta || ''))) {
    console.warn('Publicidad ACTIVA sin fecha "hasta" valida (DD/MM/AAAA): no se publica');
    return null;
  }
  const dias = diasHasta(p.hasta);
  if (dias <= 0) { console.log('Publicidad caducada el ' + p.hasta + ': no se publica'); return null; }
  console.log('Publicidad activa: ' + p.titulo + ' (quedan ' + dias + ' dias)');
  return p;
}

/* El rotulo "Publicidad" y el rel="sponsored nofollow noopener" NO son opcionales:
   el primero lo exige la LSSI-CE art. 20 y el segundo evita que Google lo lea como
   venta de enlaces, que penaliza la web entera. Ver PUBLICIDAD.md, punto 4. */
function buildPublicidadHTML(p) {
  const url = escapeHtml(p.url);
  const img = p.imagen
    ? '<img class="publi-img" src="' + escapeHtml(p.imagen) + '" alt="' + escapeHtml(p.alt || p.titulo) + '" loading="lazy">'
    : '';
  const meta = [p.dotacion ? '<strong>' + escapeHtml(p.dotacion) + '</strong>' : '', escapeHtml(p.plazo || '')]
    .filter(Boolean).join(' &middot; ');
  return '<aside class="publi">' +
    '<span class="publi-label">Publicidad</span>' +
    '<a class="publi-in" href="' + url + '" rel="sponsored nofollow noopener" target="_blank">' +
    img +
    '<span class="publi-txt">' +
    '<span class="publi-tit">' + escapeHtml(p.titulo) + '</span>' +
    (p.organizacion ? '<span class="publi-org">' + escapeHtml(p.organizacion) + '</span>' : '') +
    (p.descripcion ? '<span class="publi-desc">' + escapeHtml(p.descripcion) + '</span>' : '') +
    (meta ? '<span class="publi-meta">' + meta + '</span>' : '') +
    '<span class="publi-cta">' + escapeHtml(p.cta || 'Ver las bases') + '</span>' +
    '</span></a></aside>';
}

async function main() {
  console.log('Iniciando busqueda de concursos...');
  if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_KEY no configurado'); process.exit(1); }

  const fuentes = [
    { archivo: '/tmp/fuente1.html', nombre: 'escritores.org' },
    { archivo: '/tmp/fuente2.html', nombre: 'guiadeconcursos.com' },
  ];

  let todos = [];
  for (const f of fuentes) {
    try {
      const html = fs.readFileSync(f.archivo, 'utf8');
      console.log('Leido ' + f.nombre + ': ' + html.length + ' bytes');
      const respuesta = await llamarIA(html, f.nombre);
      const inicio = respuesta.indexOf('[');
      const fin = respuesta.lastIndexOf(']');
      if (inicio === -1 || fin === -1) { console.warn('Sin JSON para ' + f.nombre); continue; }
      const concursos = JSON.parse(respuesta.substring(inicio, fin + 1));
      console.log('Encontrados en ' + f.nombre + ': ' + concursos.length);
      todos = todos.concat(concursos);
    } catch(e) {
      console.error('Error con ' + f.nombre + ': ' + e.message);
    }
  }

  /* Los fijos van PRIMERO para que, si una convocatoria esta en los dos sitios, gane
     nuestra ficha revisada a mano y no la que saque la IA del listado ajeno. */
  const fijos = leerFijos();
  const vistos = new Set();
  const todosConFijos = fijos.concat(todos).filter(c => {
    const k = claveTitulo(c.titulo);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  console.log('Tras juntar fijos y rastreados y quitar repetidos: ' + todosConFijos.length);

  /* Si el rastreo falla (la fuente cambia, la IA devuelve vacio), antes se salia sin
     escribir nada y la web se quedaba con lo del dia anterior. Ahora, si al menos hay
     fijos, se publica lo que haya: es preferible a no publicar. */
  if (!todosConFijos.length) { console.log('Sin concursos nuevos'); process.exit(0); }

  const filtrados = todosConFijos
    .filter(c => { const d = diasHasta(c.fecha_limite); return d > 0 && d <= VENTANA_DIAS; })
    .sort((a,b) => diasHasta(a.fecha_limite) - diasHasta(b.fecha_limite));

  console.log('Validos en rango: ' + filtrados.length);
  if (!filtrados.length) { console.log('Ninguno en rango'); process.exit(0); }

  let html_file = fs.readFileSync('index.html', 'utf8');
  const concursosJS = 'const CONCURSOS_BASE = ' + JSON.stringify(filtrados) + ';';
  const regex = /const CONCURSOS_BASE = \[[\s\S]*?\];/;
  if (!regex.test(html_file)) { console.error('No se encontro CONCURSOS_BASE'); process.exit(1); }

  const htmlConDatos = html_file.replace(regex, concursosJS);

  const staticRegex = /<!-- CONCURSOS-STATIC-START -->[\s\S]*?<!-- CONCURSOS-STATIC-END -->/;
  let htmlFinal = htmlConDatos;
  if (staticRegex.test(htmlConDatos)) {
    const staticHTML = '<!-- CONCURSOS-STATIC-START -->' + buildStaticCardsHTML(filtrados) + '<!-- CONCURSOS-STATIC-END -->';
    htmlFinal = htmlConDatos.replace(staticRegex, staticHTML);
  } else {
    console.warn('No se encontraron los marcadores CONCURSOS-STATIC-START/END; se omite la actualizacion del bloque estatico');
  }

  const publiRegex = /<!-- PUBLI-START -->[\s\S]*?<!-- PUBLI-END -->/;
  if (publiRegex.test(htmlFinal)) {
    const publi = leerPublicidad();
    htmlFinal = htmlFinal.replace(publiRegex, '<!-- PUBLI-START -->' + (publi ? buildPublicidadHTML(publi) : '') + '<!-- PUBLI-END -->');
  } else {
    console.warn('No se encontraron los marcadores PUBLI-START/END en index.html; se omite el bloque de publicidad');
  }

  fs.writeFileSync('index.html', htmlFinal, 'utf8');
  fs.writeFileSync('concursos.json', JSON.stringify(filtrados.length ? filtrados : JSON.parse(html_file.match(/const CONCURSOS_BASE = (\[[\s\S]*?\]);/)[1])), 'utf8');
  console.log('Actualizado con ' + filtrados.length + ' concursos:');
  filtrados.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
