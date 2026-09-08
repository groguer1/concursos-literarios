#!/usr/bin/env node
/**
 * Prueba de comprobar-enlaces.js.
 *
 * No sale a internet: levanta un servidor local que simula cada respuesta que el
 * comprobador tiene que saber distinguir. La gracia está en los casos que NO son
 * obvios, que son los que hacen inútil a un comprobador de enlaces:
 *
 *   - una web que contesta 403 a un script pero funciona en el navegador,
 *   - un servidor que no admite HEAD y sí GET,
 *   - un dominio caducado que alguien compró y ahora redirige a otra cosa,
 *     contestando 200 tan feliz.
 *
 * Uso:  node scripts/pruebas/comprobar-enlaces.test.js
 * Sale con código 1 si algún caso se clasifica mal.
 */

const http = require('http');
const path = require('path');
const { comprobar, dominio } = require(path.join(__dirname, '..', 'comprobar-enlaces.js'));

const PUERTO = 8901;

const servidor = http.createServer((req, res) => {
  switch (req.url) {
    case '/ok':            res.writeHead(200); return res.end('ok');
    case '/404':           res.writeHead(404); return res.end();
    case '/500':           res.writeHead(500); return res.end();
    case '/403':           res.writeHead(403); return res.end();
    // Servidor que rechaza HEAD pero responde a GET: existen, y darlos por rotos
    // mandaría a revisar a mano una ficha que está perfecta.
    case '/solo-get':      res.writeHead(req.method === 'HEAD' ? 405 : 200); return res.end();
    case '/redir-interna': res.writeHead(301, { Location: '/ok' }); return res.end();
    // El dominio caducado que alguien compró: 200, pero en otra casa.
    case '/redir-fuera':   res.writeHead(301, { Location: 'http://localhost:' + PUERTO + '/ok' }); return res.end();
    case '/bucle':         res.writeHead(301, { Location: '/bucle' }); return res.end();
    default:               res.writeHead(404); return res.end();
  }
});

const B = 'http://127.0.0.1:' + PUERTO;

const CASOS_HTTP = [
  ['200 normal',                   B + '/ok',            'ok'],
  ['404',                          B + '/404',           'roto'],
  ['500',                          B + '/500',           'roto'],
  ['403 (antibots, no es un fallo)', B + '/403',         'dudoso'],
  ['no admite HEAD pero sí GET',   B + '/solo-get',      'ok'],
  ['redirige dentro del sitio',    B + '/redir-interna', 'ok'],
  ['redirige a OTRO dominio',      B + '/redir-fuera',   'redirige'],
  ['bucle de redirecciones',       B + '/bucle',         'roto'],
  ['URL que no es una URL',        'no-soy-una-url',     'roto'],
];

// www y subdominios no son un cambio de sitio; los TLD compuestos tampoco.
const CASOS_DOMINIO = [
  ['https://www.anagrama-ed.es',                'anagrama-ed.es'],
  ['https://anagrama-ed.es/catalogo',           'anagrama-ed.es'],
  ['https://www.planetadelibros.com/editorial', 'planetadelibros.com'],
  ['https://editorial.co.uk/x',                 'editorial.co.uk'],
  ['https://www.editorial.com.ar/x',            'editorial.com.ar'],
  ['https://sub.dominio.editorial.es/x',        'editorial.es'],
];

let fallos = 0;
const anota = (bien, linea) => { if (!bien) fallos++; console.log((bien ? '  ok  ' : '  MAL ') + linea); };

servidor.listen(PUERTO, '127.0.0.1', async () => {
  console.log('comprobar-enlaces — clasificación de respuestas');
  for (const [nombre, url, esperado] of CASOS_HTTP) {
    const r = await comprobar(url);
    anota(r.nivel === esperado,
      nombre.padEnd(32) + ' → ' + r.nivel + (r.nivel === esperado ? '' : ' (se esperaba ' + esperado + ')'));
  }

  console.log('\ncomprobar-enlaces — dominio registrable');
  for (const [url, esperado] of CASOS_DOMINIO) {
    const d = dominio(url);
    anota(d === esperado, url.padEnd(46) + ' → ' + d + (d === esperado ? '' : ' (se esperaba ' + esperado + ')'));
  }

  console.log('\n' + (fallos ? fallos + ' CASO(S) MAL' : 'todos los casos correctos'));
  servidor.close();
  process.exit(fallos ? 1 : 0);
});
