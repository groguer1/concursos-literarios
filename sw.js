/* Service worker de letrasespanolas.org.
 *
 * Lo que hace posible: instalar el sitio en la pantalla de inicio y que siga
 * funcionando sin cobertura. Lo que NO hace todavia: notificaciones push, porque eso
 * necesita un servicio que las envie (ver CLAUDE.md).
 *
 * LA DECISION IMPORTANTE ES LA ESTRATEGIA DE CACHE, y aqui no puede ser la habitual.
 * En un sitio normal se sirve primero de cache y se actualiza por detras. Aqui NO:
 * index.html lo reescribe un bot cada dia a las 06:00 con las convocatorias del dia, y
 * servir una copia guardada significaria ensenarle a un escritor plazos ya cerrados.
 * Asi que el HTML y los datos van SIEMPRE a la red primero, y la cache solo entra
 * cuando no hay red. Lo que si se guarda de forma agresiva es lo que no caduca: CSS,
 * JS e iconos.
 *
 * COMO DESACTIVARLO SI DA PROBLEMAS: poner SW_ACTIVO = false en nav.js. Un service
 * worker se queda instalado en el navegador del visitante, asi que sin una salida de
 * emergencia un fallo aqui no se puede recoger. Esa bandera desinstala el que ya
 * estuviera puesto y vacia sus caches.
 */

const VERSION = 'le-v1';
const CACHE = 'letras-' + VERSION;

/* Solo lo que no caduca, MAS la portada. La portada es una excepcion pensada: como
   arriba se sirve siempre de red primero, la copia guardada solo se usa sin cobertura y
   se refresca en cada visita con red, asi que no puede quedarse vieja a la vista de
   nadie. Sin precargarla, el visitante que abre el sitio por primera vez y luego se
   queda sin cobertura no tiene ni portada: la primera carga ocurre antes de que el
   service worker tome el control, asi que no pasa por aqui y no se guarda. */
const ESTATICOS = [
  '/',
  '/offline.html',
  '/nav.css',
  '/nav.js',
  '/favicon.svg',
  '/img/icon-192.png',
  '/img/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla entero si UN fichero falla, y entonces no se instala nada. Se
      // guardan de uno en uno para que un 404 tonto no tumbe el service worker.
      .then(c => Promise.all(ESTATICOS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const esNavegacion = (req) => req.mode === 'navigate';
const esDato = (url) => url.pathname.endsWith('.json');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* Nada de otros dominios: AdSense, Analytics, Brevo, las fuentes de Google y el
     worker de Cloudflare se dejan en paz. Guardar peticiones de terceros en cache es
     como se rompen las cosas de formas dificiles de encontrar. */
  if (url.origin !== self.location.origin) return;

  // HTML y datos: la red manda. La cache es el plan B de cuando no hay cobertura.
  if (esNavegacion(req) || esDato(url)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => {
          if (r) return r;
          /* A un .json NO se le puede contestar con la pagina de sin conexion: quien lo
             pide espera JSON, y recibir HTML le rompe el JSON.parse con un error raro en
             vez de con el fallo que sabe manejar. Response.error() es exactamente «no hay
             red», que es lo que index.html ya sabe tratar (se queda con CONCURSOS_BASE). */
          if (esDato(url)) return Response.error();
          return caches.match('/offline.html');
        }))
    );
    return;
  }

  // El resto (CSS, JS, imagenes): se sirve de cache y se refresca por detras.
  e.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
