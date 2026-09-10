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

/* El tope global estaba en 3 minutos y el script ya tardaba 3m16s: iba justo a
   quedarse a medias. Peor aun, salia con process.exit(0), o sea EXITO, asi que un
   planton se veia en el log como un dia normal. Ahora hay margen (el paso del workflow
   corta a los 10 min de todas formas) y sale con codigo 1 para que el run se marque en
   rojo y se vea. */
/* .unref() NO ES OPCIONAL: sin el, este temporizador mantiene vivo el proceso aunque el
   trabajo ya este hecho, asi que Node se queda esperando los 210 s y dispara el aviso
   DESPUES de haber actualizado el listado. Paso en la prueba del 6/09: escribio los 94
   concursos y aun asi el run acabo en rojo. Con unref, el temporizador solo salta si de
   verdad queda algo pendiente. Es el mismo fallo que tuvo el bot de novedades. */
const topeGlobal = setTimeout(() => {
  console.error('TIMEOUT GLOBAL: el script no ha terminado a tiempo. El listado NO se ha actualizado.');
  process.exit(1);
}, 540000);
topeGlobal.unref();

function httpsPost(hostname, path, headers, bodyBuf) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, port: 443, path, method: 'POST',
      headers: { ...headers, 'Content-Length': bodyBuf.length },
      /* 90 s bastaban con max_tokens en 8.000. Al subirlo a 16.000 la respuesta de
         escritores.org tarda unos 90 s y empezo a dar Timeout: se arreglaba el truncado
         y se caia por el otro lado.
         EL 10/09 SE PLANTO OTRA VEZ, y el motivo es que 150 s nunca fueron aire: la
         llamada de escritores.org tardo 147 s en la ejecucion de las 07:09 de ESE MISMO
         DIA (18.186 tokens de salida), o sea que pasaba por tres segundos. A las 10:32
         no paso y el listado se quedo congelado. La causa de fondo es que max_tokens
         subio de 16.000 a 24.000 y este tope no se toco con el: correccion a medias.
         Ahora 240 s, que son 63 % de margen sobre lo medido, y el tope global sube a
         540 s para que sea SIEMPRE este timeout el que corte una fuente lenta y la otra
         se pueda seguir intentando. */
      timeout: 240000,
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

/* Los listados enlazan la ficha de cada convocatoria con rutas RELATIVAS
   ("/recursos-para-escritores/42034-..."). Antes se copiaban tal cual al texto que ve el
   modelo, y el prompt le prohibe inventarse URLs: una ruta suelta no es una URL, asi que
   la descartaba. Resultado, el 08/09/2026: de los 8 concursos con enlace, 6 eran de
   guiadeconcursos.com (que enlaza en absoluto) y los otros 2 estaban metidos a mano en
   concursos-fijos.json. Del raspado de escritores.org no salia NI UNO.
   Aqui se resuelven contra la URL de la fuente antes de ensenarselas al modelo.
   Devuelve '' para mailto:, javascript:, #anclas y href rotos, para no meterle ruido. */
function absolutizar(href, base) {
  const h = String(href || '').trim();
  /* Las anclas ("#arriba") resuelven a la URL del propio listado, y entonces el modelo
     ve la portada de la fuente colgando de un enlace cualquiera y se la puede colocar a
     un concurso como si fueran sus bases. Fuera antes de resolver nada. */
  if (!h || h.startsWith('#')) return '';
  try {
    const u = new URL(h, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    u.hash = '';
    /* Mismo motivo con los enlaces a la propia pagina (el logo, "volver al listado",
       la paginacion): no son las bases de nada. */
    const sinBarra = x => String(x).replace(/\/+$/, '');
    if (sinBarra(u.href) === sinBarra(base)) return '';
    return u.href;
  } catch (e) { return ''; }
}

/* Filtro de lo que devuelve el modelo. Ahora que ve muchos mas enlaces, conviene
   comprobar que lo que pone en "url" es de verdad una URL y no un trozo de texto. */
function urlValida(u) {
  if (!u) return '';
  try {
    const x = new URL(String(u).trim());
    return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : '';
  } catch (e) { return ''; }
}

function limpiarHTML(texto, base) {
  return texto
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    /* Los enlaces se conservan COMO TEXTO antes de barrer las etiquetas. Si no, el
       replace de abajo se lleva por delante todos los href y luego le pedimos al modelo
       que rellene el campo "url" con enlaces que nunca ha visto: por eso salian 167
       concursos y solo 2 con enlace a las bases. Queda "titulo del enlace [URL]", que es
       justo lo que el prompt le pide que copie. */
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
             (m, url, dentro) => {
               const abs = absolutizar(url, base);
               const txt = dentro.replace(/<[^>]+>/g, ' ');
               return abs ? txt + ' [' + abs + '] ' : txt + ' ';
             })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/* Saca el array de concursos de la respuesta del modelo, AUNQUE VENGA CORTADO.
   Antes esto era un indexOf('[') + lastIndexOf(']'), y si la respuesta se truncaba no
   habia corchete de cierre: lastIndexOf devolvia -1 y se tiraba la fuente entera. Asi se
   perdio escritores.org —la fuente grande— dia tras dia, y el listado se quedaba en los
   fijos sin que nadie se enterase. Ahora, si falta el cierre, se recorta hasta el ultimo
   objeto completo y se cierra el array a mano: se pierde el ultimo concurso a medias, no
   los cincuenta que si habian llegado bien. */
function extraerJSON(respuesta, fuente) {
  const inicio = respuesta.indexOf('[');
  if (inicio === -1) return null;

  const fin = respuesta.lastIndexOf(']');
  if (fin > inicio) {
    try { return JSON.parse(respuesta.substring(inicio, fin + 1)); }
    catch (e) { console.warn('JSON ilegible en ' + fuente + ', intentando rescatarlo: ' + e.message); }
  }

  /* Rescate: cortar por el ultimo objeto que cerro y cerrar el array. */
  const trozo = respuesta.substring(inicio);
  const ultimo = trozo.lastIndexOf('}');
  if (ultimo === -1) return null;
  try {
    const rescatado = JSON.parse(trozo.substring(0, ultimo + 1) + ']');
    console.warn('RESCATADOS ' + rescatado.length + ' concursos de una respuesta cortada de ' + fuente);
    return rescatado;
  } catch (e) {
    console.error('No se ha podido rescatar el JSON de ' + fuente + ': ' + e.message);
    return null;
  }
}

/* LA SONDA DE GASTO. Este bot llama a un modelo todos los dias y hasta hoy no
   registraba lo que costaba: se estimaba a ojo, que es justo lo que no vale.
   Precios de Claude Haiku 4.5 a 09/09/2026: 1,00 $ por millon de tokens de
   entrada y 5,00 $ por millon de salida. SI SE CAMBIA DE MODELO HAY QUE CAMBIAR
   ESTO, o el numero que imprime deja de significar nada. */
const PRECIO_ENTRADA_POR_MILLON = 1.00;
const PRECIO_SALIDA_POR_MILLON  = 5.00;
const gasto = { entrada: 0, salida: 0, cacheLeida: 0, cacheEscrita: 0, llamadas: 0 };

function dolares() {
  return (gasto.entrada / 1e6) * PRECIO_ENTRADA_POR_MILLON +
         (gasto.salida  / 1e6) * PRECIO_SALIDA_POR_MILLON;
}

/* LA DECISION DE PUBLICAR O NO, aparte para poder probarla sin llamar a la API.
   Devuelve {bloquear, motivo}. Se exigen DOS condiciones para bloquear:
     a) el listado cae por debajo del 60 % de lo que habia ayer, y
     b) alguna fuente ha devuelto CERO concursos.
   Solo con (a) se bloquearia un dia en que venzan muchas convocatorias de golpe, y
   el bloqueo no se levantaria nunca. Atado a (b), en cuanto la fuente vuelve, publica. */
function decidirPublicacion(anterior, ahora, porFuente) {
  const caidas = Object.keys(porFuente || {}).filter(n => porFuente[n] === 0);
  const base = Array.isArray(anterior) ? anterior.length : 0;
  const desplome = base >= 12 && ahora < base * 0.6;
  if (desplome && caidas.length) {
    return { bloquear: true, caidas,
             motivo: 'el listado cae de ' + base + ' a ' + ahora +
                     ' y estas fuentes han dado cero: ' + caidas.join(', ') };
  }
  if (desplome) {
    return { bloquear: false, caidas,
             motivo: 'cae de ' + base + ' a ' + ahora + ', pero ninguna fuente ha fallado: parece real' };
  }
  return { bloquear: false, caidas, motivo: 'sin desplome' };
}

async function llamarIA(texto, fuente, base) {
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
  const limite = new Date();
  limite.setDate(limite.getDate() + VENTANA_DIAS);
  const fechaLimite = limite.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

  /* Antes se cortaba en 25.000 caracteres y la pagina de escritores.org tiene 57.000
     de texto limpio: se tiraba el 56% SIN MIRARLO. Asi se perdio el certamen Mariana
     de Carvajal, que cae en el caracter 39.110. Cabe entero de sobra en el contexto. */
  const textoLimpio = limpiarHTML(texto, base).substring(0, 120000);
  /* Cuantos enlaces le llegan de verdad al modelo. Si esto sale 0 para una fuente, el
     problema esta en el raspado (o la fuente ha cambiado de plantilla), no en el prompt:
     es el dato que faltaba para saber por que escritores.org no daba ni un enlace. */
  const enlacesVisibles = (textoLimpio.match(/\[https?:\/\//g) || []).length;
  console.log('Texto limpio de ' + fuente + ': ' + textoLimpio.length + ' chars, ' +
              enlacesVisibles + ' enlaces visibles para el modelo');

  if (textoLimpio.length < 100) {
    console.warn('Texto demasiado corto, saltando ' + fuente);
    return '[]';
  }

  /* El tope de 15 por fuente era el que mas convocatorias se comia: escritores.org
     publica cientos y la IA devolvia solo las 15 mas cercanas, que a 14/08/2026 no
     pasaban del 30/08. Por eso quedaban fuera el Perez-Taybili (31/08) y LuchaLibro
     (04/09), aun estando los dos dentro del plazo que el filtro si acepta. */
  const prompt = 'Analiza este texto de una web de concursos literarios espanoles. Extrae TODOS los concursos que encuentres, hasta un maximo de 60, con fecha limite entre hoy (' + hoy + ') y ' + fechaLimite + '. Si no hay fecha clara incluye el concurso con fecha_limite vacia. IMPORTANTE: incluye SOLO concursos LITERARIOS (poesia, relato, cuento, novela, teatro, ensayo, microrrelato, literatura infantil o juvenil). NO incluyas premios de pintura, fotografia, comic, musica, cine ni artes plasticas aunque aparezcan en el mismo listado. En "pais" indica el pais del organizador deducido del texto (nombre de la entidad, ciudad, moneda del premio): "Espana" si es de Espana o no hay indicios en contra, o el nombre del pais si es de Hispanoamerica u otro. Si el texto incluye el enlace a las bases o a la convocatoria, ponlo en "url"; no inventes URLs. Devuelve SOLO array JSON sin texto adicional ni marcadores de codigo. Ejemplo: [{"titulo":"nombre","organizacion":"entidad","categoria":"Poesia|Relato corto|Novela|Infantil|Teatro|Otro","premio":"dotacion","fecha_limite":"DD/MM/YYYY o vacia","descripcion":"descripcion breve max 100 caracteres","url":"url o vacia","pais":"Espana u otro pais","nuevo":false}] Si no hay ninguno devuelve solo: []\n\n' + textoLimpio;

  /* max_tokens estaba en 8.000 y ESA ERA LA CAUSA de que el listado se quedara en 9
     concursos. Se piden hasta 60 con nueve campos cada uno: eso son unos 9.000 tokens de
     respuesta, o sea que la respuesta se cortaba a mitad, el array se quedaba sin cerrar
     y mas abajo se descartaba la fuente ENTERA. Cuantos mas concursos encontraba, mas
     probable era que fallase. Se subio a 16.000, y al empezar a incluir tambien los
     enlaces la respuesta volvio a cortarse (el rescate salvo 121 de los concursos, que
     para eso esta), asi que 24.000. */
  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 24000,
    messages: [{ role: 'user', content: prompt }]
  }), 'utf8');

  const result = await httpsPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
  }, body);

  if (result.error) throw new Error(JSON.stringify(result.error));

  /* El uso REAL, no una estimacion. Sin esto no se puede decidir si merece la pena
     enriquecer las fichas: el coste se adivinaba. */
  const u = result.usage || {};
  gasto.entrada      += u.input_tokens  || 0;
  gasto.salida       += u.output_tokens || 0;
  gasto.cacheLeida   += u.cache_read_input_tokens     || 0;
  gasto.cacheEscrita += u.cache_creation_input_tokens || 0;
  gasto.llamadas     += 1;
  console.log('Gasto de ' + fuente + ': ' + (u.input_tokens || 0) + ' tokens de entrada, ' +
              (u.output_tokens || 0) + ' de salida');

  const respuesta = result.content[0].text;
  /* Si la respuesta se corta por el tope, el modelo lo dice en stop_reason. Antes no se
     miraba, asi que un truncado se veia igual que "no hay concursos": en silencio. */
  if (result.stop_reason === 'max_tokens') {
    console.warn('AVISO: la respuesta de ' + fuente + ' se ha CORTADO por max_tokens. ' +
                 'Se rescatara lo que haya llegado entero, pero conviene subir el tope.');
  }
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

/* El bloque de la pagina de relato corto. El marcado es LETRA POR LETRA el mismo que
   pinta el <script> de esa pagina, para que lo que ve Google y lo que ve el visitante
   sean lo mismo. Si se cambia alli, hay que cambiarlo aqui. */
function buildRelatoHTML(arr) {
  return arr.map(c =>
    '<div class="concurso-item" style="border:1px solid #e2d9c8;border-radius:8px;padding:1rem 1.2rem;margin-bottom:.9rem;background:#fff">' +
    '<div style="font-weight:700;font-size:1rem;line-height:1.4;margin-bottom:.35rem">' + escapeHtml(c.titulo) + '</div>' +
    '<div style="font-size:.85rem;color:#6b5d4a;margin-bottom:.4rem">&#127942; ' + escapeHtml(c.premio || '—') +
    ' &nbsp;·&nbsp; &#128197; Cierre: ' + escapeHtml(c.fecha_limite || 'Consultar bases') +
    ' &nbsp;·&nbsp; ' + escapeHtml(c.organizacion || '') + '</div>' +
    '<p style="font-size:.88rem;margin:0;line-height:1.6">' + escapeHtml(c.descripcion || '') + '</p></div>'
  ).join('');
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

  /* "base" tiene que ser la MISMA URL que descarga el workflow en el paso
     "Descargar paginas de concursos" (.github/workflows/actualizar-concursos.yml).
     Es contra lo que se resuelven los enlaces relativos de cada listado: si aqui se
     pone otra cosa, los enlaces salen apuntando a donde no es. */
  const fuentes = [
    { archivo: '/tmp/fuente1.html', nombre: 'escritores.org',
      base: 'https://www.escritores.org/concursos/concursos-1/concursos-literarios' },
    { archivo: '/tmp/fuente2.html', nombre: 'guiadeconcursos.com',
      base: 'https://www.guiadeconcursos.com/' },
  ];

  let todos = [];
  /* Cuantos ha dado cada fuente. Es lo que permite distinguir "hoy hay menos
     concursos" de "una fuente se ha caido", que es la diferencia entre publicar y
     no publicar. */
  const porFuente = {};
  for (const f of fuentes) {
    porFuente[f.nombre] = 0;
    try {
      const html = fs.readFileSync(f.archivo, 'utf8');
      console.log('Leido ' + f.nombre + ': ' + html.length + ' bytes');
      const respuesta = await llamarIA(html, f.nombre, f.base);
      const concursos = extraerJSON(respuesta, f.nombre);
      if (concursos === null) { console.warn('Sin JSON para ' + f.nombre); continue; }
      /* Se normaliza aqui, fuente a fuente, para poder decir en el log cuantos traen
         enlace. Es la cifra que hay que vigilar: si una fuente da 40 concursos y 0
         enlaces, algo se ha roto en esa fuente aunque el listado siga saliendo lleno. */
      concursos.forEach(c => { c.url = urlValida(c.url); });
      const conEnlace = concursos.filter(c => c.url).length;
      console.log('Encontrados en ' + f.nombre + ': ' + concursos.length +
                  ' (' + conEnlace + ' con enlace a las bases)');
      porFuente[f.nombre] = concursos.length;
      todos = todos.concat(concursos);
    } catch(e) {
      console.error('Error con ' + f.nombre + ': ' + e.message);
    }
  }

  /* Los fijos van PRIMERO para que, si una convocatoria esta en los dos sitios, gane
     nuestra ficha revisada a mano y no la que saque la IA del listado ajeno. */
  const fijos = leerFijos();
  fijos.forEach(c => { c.url = urlValida(c.url); });
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

  /* EL GUARD QUE FALTABA. El de arriba solo salta si NO queda ninguno, y como los fijos
     nunca fallan, nunca saltaba: se publicaban 9 concursos con toda normalidad mientras
     la fuente grande llevaba dias cayendose. Entre el 25/08 y el 05/09 el listado salto
     entre 74 y 8 sin que nadie lo notara. Una caida asi casi siempre es un raspado roto,
     no que se hayan acabado los concursos de Espana, asi que se avisa. */
  /* EL GUARD, AHORA CON FRENO. Antes solo AVISABA en el log, y el log de una Action
     que nadie abre no lo lee nadie: entre el 24/08 y el 09/09, OCHO de veintiun dias
     la portada se publico con 8-10 concursos porque una fuente se habia caido. Google
     veia una portada que perdia el 90 % de su contenido un dia si y otro no.

     La regla: si una fuente se ha caido (cero concursos) Y ademas el listado cae por
     debajo del 60 % de lo que habia ayer, NO SE PUBLICA. Se deja lo del dia anterior,
     que son concursos que siguen abiertos, y se sale con codigo 0 para no llenar de
     rojo el historial por algo que se arregla solo mañana.

     Se exigen las DOS condiciones a proposito. Solo con la caida se bloquearia un dia
     en que de verdad venzan muchas convocatorias a la vez, y el bloqueo se quedaria
     puesto para siempre; atandolo a que una fuente haya fallado, en cuanto la fuente
     vuelve, se publica. */
  try {
    const anterior = JSON.parse(fs.readFileSync('concursos.json', 'utf8'));
    const veredicto = decidirPublicacion(anterior, filtrados.length, porFuente);
    if (veredicto.bloquear) {
      console.warn('==================================================================');
      console.warn('NO SE PUBLICA: ' + veredicto.motivo + '.');
      console.warn('Se conserva el listado de ayer, que son concursos que siguen abiertos.');
      console.warn('Recuento por fuente: ' + JSON.stringify(porFuente));
      console.warn('==================================================================');
      console.log('Gasto de esta ejecucion: ' + gasto.entrada + ' tokens de entrada, ' +
                  gasto.salida + ' de salida, ' + dolares().toFixed(4) + ' $');
      process.exit(0);
    }
    if (veredicto.motivo !== 'sin desplome') console.warn('AVISO: ' + veredicto.motivo);
  } catch (e) { /* la primera vez no hay fichero previo: no es un fallo */ }

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

  /* LAS PAGINAS POR CATEGORIA. Servian su lista escrita a mano, y nadie la actualizaba:
     la de relato corto llego a mostrarle a Google TRES concursos ya vencidos, dos con fecha
     de julio, porque el JavaScript los sustituia solo para el visitante. Como el dato ya
     esta calculado para la portada, escribir estas paginas no cuesta ni un token mas.

     Anadir una categoria nueva es anadir una linea a esta tabla y poner los marcadores en
     el HTML. El filtro es por SUBCADENA a proposito: 'relato' recoge «Relato corto» y
     «Microrrelato», y 'poes' recoge «Poesia» con y sin tilde y las categorias compuestas
     del tipo «Relato corto|Poesia». */
  const PAGINAS_CATEGORIA = [
    { archivo: 'concursos-relato-corto.html', marca: 'RELATO', contador: 'num-relato', filtro: 'relato' },
    { archivo: 'concursos-poesia.html',       marca: 'POESIA', contador: 'num-poesia',  filtro: 'poes'   },
  ];
  for (const pg of PAGINAS_CATEGORIA) {
    try {
      let hp = fs.readFileSync(pg.archivo, 'utf8');
      const rx = new RegExp('<!-- ' + pg.marca + '-STATIC-START -->[\\s\\S]*?<!-- ' + pg.marca + '-STATIC-END -->');
      if (!rx.test(hp)) {
        console.warn('Sin marcadores ' + pg.marca + '-STATIC en ' + pg.archivo + ': se omite');
        continue;
      }
      const sel = filtrados.filter(c => String(c.categoria || '').toLowerCase().includes(pg.filtro));
      hp = hp.replace(rx, '<!-- ' + pg.marca + '-STATIC-START -->' + buildRelatoHTML(sel) + '<!-- ' + pg.marca + '-STATIC-END -->');
      hp = hp.replace(new RegExp('<span id="' + pg.contador + '">[^<]*</span>'),
                      '<span id="' + pg.contador + '">' + sel.length + '</span>');
      fs.writeFileSync(pg.archivo, hp, 'utf8');
      console.log(pg.archivo + ': ' + sel.length + ' convocatorias escritas en el HTML');
    } catch (e) {
      console.warn('No se ha podido actualizar ' + pg.archivo + ': ' + e.message);
    }
  }
  fs.writeFileSync('concursos.json', JSON.stringify(filtrados.length ? filtrados : JSON.parse(html_file.match(/const CONCURSOS_BASE = (\[[\s\S]*?\]);/)[1])), 'utf8');
  const totalConEnlace = filtrados.filter(c => c.url).length;
  console.log('Actualizado con ' + filtrados.length + ' concursos, ' + totalConEnlace +
              ' con enlace a las bases (' + Math.round(totalConEnlace / filtrados.length * 100) + ' %):');
  console.log('---');
  console.log('GASTO DE ESTA EJECUCION: ' + gasto.llamadas + ' llamadas · ' +
              gasto.entrada + ' tokens de entrada · ' + gasto.salida + ' de salida · ' +
              dolares().toFixed(4) + ' $  (a ' + (dolares() * 30).toFixed(2) + ' $/mes a este ritmo)');
  console.log('Recuento por fuente: ' + JSON.stringify(porFuente));
  console.log('---');
  filtrados.forEach(c => console.log('  - ' + c.titulo + ' (' + c.fecha_limite + ')'));
}

if (typeof module !== 'undefined') module.exports = { decidirPublicacion, buildRelatoHTML, escapeHtml };

/* Solo arranca si se ejecuta directamente, no si lo carga la prueba. */
if (require.main === module) {
  main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(0); });
}
