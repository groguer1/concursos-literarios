#!/usr/bin/env node
/**
 * Comprobador de enlaces de los directorios de letrasespanolas.org.
 *
 * Automatiza lo que hasta ahora se hacía a mano y de cuatro en cuatro (los commits
 * «Agentes, tanda 6/7», «Abiali: retirado el aviso de dominio caido»): recorrer las
 * fichas y mirar si la web que le damos al escritor sigue en pie.
 *
 * Uso:  node scripts/comprobar-enlaces.js
 *       node scripts/comprobar-enlaces.js --todos    (no oculta los que están bien)
 *
 * Sale con código 1 SOLO si hay enlaces rotos o dominios caídos, que es lo que hay que
 * arreglar. Los "dudoso" y los "redirige" se listan pero no tumban la ejecución: ver
 * más abajo por qué.
 */

const http = require('http');
const https = require('https');
const { DIRECTORIOS, leerFichas } = require('./lib/directorios.js');

const TIEMPO_MAXIMO = 15000;
const REDIRECCIONES_MAXIMAS = 5;
const A_LA_VEZ = 6;

/* Sin User-Agent de navegador, unas cuantas webs editoriales contestan 403 a un script.
   Eso saldría como "roto" y mandaría a revisar a mano una ficha que está perfecta. */
const CABECERAS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LetrasEspanolas-comprobador/1.0; +https://letrasespanolas.org/)',
  'Accept': 'text/html,application/xhtml+xml,*/*',
};

/** Dominio registrable, para saber si una redirección nos saca del sitio de verdad. */
function dominio(url) {
  try {
    const partes = new URL(url).hostname.replace(/^www\./, '').split('.');
    // "editorial.co.uk" y "editorial.com.ar" necesitan tres trozos, no dos.
    const compuesto = /^(co|com|org|net|gob|gov|edu)\.[a-z]{2}$/.test(partes.slice(-2).join('.'));
    return partes.slice(compuesto ? -3 : -2).join('.');
  } catch (e) { return ''; }
}

/**
 * Una petición, siguiendo redirecciones a mano para poder contar cuántas hubo y dónde
 * acaba. Se prueba HEAD primero (más barato) y se repite con GET si el servidor no lo
 * admite: hay servidores que contestan 405 o 501 a HEAD y 200 a GET.
 */
function pedir(url, metodo, saltos) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { return resolve({ estado: 'url-invalida', url }); }
    const lib = u.protocol === 'https:' ? https : http;

    const req = lib.request(u, { method: metodo, headers: CABECERAS, timeout: TIEMPO_MAXIMO }, (res) => {
      res.resume(); // hay que consumir el cuerpo o el socket se queda colgado
      const codigo = res.statusCode;

      if (codigo >= 300 && codigo < 400 && res.headers.location) {
        if (saltos >= REDIRECCIONES_MAXIMAS) return resolve({ estado: 'bucle', url, codigo });
        let destino;
        try { destino = new URL(res.headers.location, u).href; }
        catch (e) { return resolve({ estado: 'redireccion-rota', url, codigo }); }
        return resolve(pedir(destino, metodo, saltos + 1));
      }

      resolve({ estado: 'respuesta', url, codigo, final: u.href });
    });

    req.on('timeout', () => { req.destroy(); resolve({ estado: 'timeout', url }); });
    req.on('error', (e) => resolve({ estado: 'error-red', url, detalle: e.code || e.message }));
    req.end();
  });
}

async function comprobar(url) {
  let r = await pedir(url, 'HEAD', 0);
  // El servidor no admite HEAD: se reintenta con GET antes de darlo por malo.
  if (r.estado === 'respuesta' && [403, 405, 501].includes(r.codigo)) {
    r = await pedir(url, 'GET', 0);
  }

  if (r.estado === 'url-invalida') return { nivel: 'roto', texto: 'la URL no es válida' };
  if (r.estado === 'timeout')      return { nivel: 'dudoso', texto: 'no contesta en 15 s' };
  if (r.estado === 'bucle')        return { nivel: 'roto', texto: 'bucle de redirecciones' };
  if (r.estado === 'redireccion-rota') return { nivel: 'roto', texto: 'redirige a una URL inválida' };
  if (r.estado === 'error-red') {
    /* ENOTFOUND es el dominio caído de verdad: ya no resuelve. El resto de fallos de red
       pueden ser del runner, así que se marcan como dudosos y no tumban la ejecución. */
    const caido = ['ENOTFOUND', 'EAI_AGAIN'].includes(r.detalle);
    return { nivel: caido ? 'caido' : 'dudoso', texto: 'no se puede conectar (' + r.detalle + ')' };
  }

  const c = r.codigo;
  if (c >= 200 && c < 300) {
    const origen = dominio(url), destino = dominio(r.final);
    if (origen && destino && origen !== destino) {
      /* Esto es lo que más veces ha pasado: el dominio caduca, alguien lo compra y
         redirige a otra cosa. Responde 200, así que un comprobador ingenuo lo da por
         bueno y el escritor acaba en una web que no tiene nada que ver. */
      return { nivel: 'redirige', texto: 'acaba en otro dominio: ' + destino };
    }
    return { nivel: 'ok', texto: String(c) };
  }
  if (c === 403 || c === 429) return { nivel: 'dudoso', texto: c + ' (puede ser protección antibots)' };
  return { nivel: 'roto', texto: 'HTTP ' + c };
}

/** Lanza las comprobaciones de A_LA_VEZ en A_LA_VEZ, para no abrir 95 sockets de golpe. */
async function enTandas(elementos, tarea) {
  const salida = [];
  for (let i = 0; i < elementos.length; i += A_LA_VEZ) {
    salida.push(...await Promise.all(elementos.slice(i, i + A_LA_VEZ).map(tarea)));
  }
  return salida;
}

async function main() {
  const verTodos = process.argv.includes('--todos');

  const objetivos = [];
  for (const dir of DIRECTORIOS) {
    for (const ficha of leerFichas(dir)) {
      const url = ficha[dir.campoWeb];
      if (url) objetivos.push({ archivo: dir.archivo, id: ficha.id, nombre: ficha.nombre, url });
    }
  }
  console.log('Comprobando ' + objetivos.length + ' enlaces de ' + DIRECTORIOS.length + ' directorios...\n');

  const resultados = await enTandas(objetivos, async (o) => ({ ...o, ...(await comprobar(o.url)) }));

  const orden = ['caido', 'roto', 'redirige', 'dudoso', 'ok'];
  const titulos = {
    caido:    'DOMINIO CAÍDO — la ficha manda a una puerta cerrada',
    roto:     'ROTO — el servidor contesta con un error',
    redirige: 'REDIRIGE A OTRO DOMINIO — comprobar a mano si sigue siendo quien decimos',
    dudoso:   'DUDOSO — puede ser protección antibots o un fallo de red, mirar a mano',
    ok:       'BIEN',
  };

  for (const nivel of orden) {
    const grupo = resultados.filter(r => r.nivel === nivel);
    if (!grupo.length) continue;
    if (nivel === 'ok' && !verTodos) { console.log('BIEN: ' + grupo.length + ' enlaces\n'); continue; }
    console.log(titulos[nivel] + ' (' + grupo.length + ')');
    for (const r of grupo) {
      console.log('  ' + r.archivo.replace('.html', '') + ' · ' + r.id + ' — ' + (r.nombre || ''));
      console.log('      ' + r.url);
      console.log('      ' + r.texto);
    }
    console.log('');
  }

  /* Solo lo que hay que arreglar tumba la ejecución. Si un 403 antibots pusiera el run en
     rojo cada semana, en un mes nadie miraría ya el aviso. */
  const paraArreglar = resultados.filter(r => r.nivel === 'caido' || r.nivel === 'roto').length;
  const paraMirar = resultados.filter(r => r.nivel === 'redirige' || r.nivel === 'dudoso').length;
  console.log(resultados.length + ' enlaces · ' + paraArreglar + ' para arreglar · ' + paraMirar + ' para mirar a mano');

  /* LA GUARDA QUE FALTABA, y es el mismo fallo que tuvo buscar-concursos.js: si la
     comprobación se rompe entera (sin salida a internet, un proxy que contesta 403 a
     todo, DNS caído en el runner), TODOS salen "dudoso", no hay ninguno "para arreglar"
     y el script terminaría en verde diciendo que está todo bien. Un comprobador que
     falla en silencio es peor que no tenerlo, porque además da confianza. */
  const dudosos = resultados.filter(r => r.nivel === 'dudoso').length;
  if (resultados.length >= 10 && dudosos > resultados.length * 0.6) {
    console.error('\n==================================================================');
    console.error('LA COMPROBACIÓN NO ES FIABLE: ' + dudosos + ' de ' + resultados.length + ' enlaces han salido dudosos.');
    console.error('Eso no son 60 webs con antibots a la vez: lo normal es que no haya');
    console.error('salida a internet o que algo esté contestando 403 a todo.');
    console.error('NO te fies del recuento de arriba.');
    console.error('==================================================================');
    process.exit(1);
  }

  process.exit(paraArreglar ? 1 : 0);
}

/* Solo arranca si se ejecuta directamente; si se hace require() desde una prueba, se
   exponen las piezas para poder comprobarlas sin salir a internet. */
if (require.main === module) {
  main().catch(e => { console.error('Error fatal: ' + e.message); process.exit(1); });
}

module.exports = { comprobar, dominio };
