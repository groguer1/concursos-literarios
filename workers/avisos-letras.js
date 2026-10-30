// Worker de Cloudflare «avisos-letras»: manda un Telegram a David por cada solicitud
// que entra por los formularios de servicios (informe, correccion, Premio Amazon).
//
// Por que existe: el 29/10/2026 Formspree bloqueo en silencio el correo de David tras un
// rebote. Seguia guardando los envios en su panel, con el check verde, pero dejo de mandar
// el aviso, y nadie se entero hasta que David probo el formulario. Este es un segundo aviso
// por un canal que no depende del correo.
//
// Privacidad: la pagina solo manda aqui datos que no identifican a nadie (tipo de
// formulario, servicio, genero, extension, estado y si Formspree acepto el envio). Nombre,
// correo y mensaje se quedan en Formspree. Asi Telegram y Cloudflare no reciben datos
// personales y no hace falta citarlos como encargados en privacidad.html.
//
// Secretos (Workers > avisos-letras > Settings > Variables and Secrets):
//   TELEGRAM_TOKEN    token del bot (BotFather)
//   TELEGRAM_CHAT_ID  chat de David con el bot
//
// Este fichero es la copia de referencia: lo que corre es lo que esta pegado en el panel
// de Cloudflare. Si se cambia alli, copiarlo aqui.

const ORIGENES = ['https://letrasespanolas.org', 'https://www.letrasespanolas.org'];
const CAMPOS = ['formulario', 'servicio', 'premio_amazon', 'genero', 'palabras', 'estado'];
const PANEL = 'https://formspree.io/forms/xqewlzgj/submissions';

export default {
  async fetch(req, env) {
    const origen = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // GET /chat: devuelve el numero de chat de quien le ha escrito al bot, para rellenar
    // TELEGRAM_CHAT_ID sin que nadie tenga que manejar el token fuera de Cloudflare.
    // El numero de chat no es secreto: sin el token no sirve para escribir a nadie.
    if (req.method === 'GET' && new URL(req.url).pathname === '/chat') {
      if (!env.TELEGRAM_TOKEN) return new Response('falta TELEGRAM_TOKEN', { status: 500, headers: cors });
      const u = await (await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN + '/getUpdates')).json();
      const chats = [...new Set((u.result || []).map((x) => x.message && x.message.chat && x.message.chat.id).filter(Boolean))];
      return new Response(chats.length ? 'chat: ' + chats.join(', ') : 'nadie ha escrito al bot todavia', { headers: cors });
    }

    // GET: comprueba que los secretos estan puestos sin mandar nada.
    if (req.method === 'GET') {
      const listo = Boolean(env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID);
      return new Response(listo ? 'avisos-letras: listo' : 'avisos-letras: faltan los secretos', {
        status: listo ? 200 : 500, headers: cors,
      });
    }

    // Solo la propia web puede pedir avisos: evita que cualquiera nos llene el Telegram.
    if (req.method !== 'POST' || !ORIGENES.includes(origen)) {
      return new Response('no', { status: 403, headers: cors });
    }

    let d;
    try {
      // La pagina manda JSON como text/plain para que el navegador no haga preflight.
      d = JSON.parse((await req.text()).slice(0, 4000));
    } catch (e) {
      return new Response('json', { status: 400, headers: cors });
    }
    if (d._gotcha) return new Response('ok', { headers: cors }); // bot: el campo trampa viene relleno

    const limpio = (v) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, 80);
    const lineas = ['📩 Nueva solicitud en letrasespanolas.org'];
    for (const c of CAMPOS) if (d[c]) lineas.push(c.replace('_', ' ') + ': ' + limpio(d[c]));
    lineas.push(d.formspree === 'ok'
      ? 'Formspree: aceptada ✅ (te llegará también por correo)'
      : 'Formspree: ERROR ❌ (' + limpio(d.formspree) + '). La persona ha visto un error y puede que no la haya guardado.');
    lineas.push('Ver: ' + PANEL);

    const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lineas.join('\n'), disable_web_page_preview: true }),
    });
    return new Response(r.ok ? 'ok' : 'telegram ' + r.status, { status: r.ok ? 200 : 502, headers: cors });
  },
};
