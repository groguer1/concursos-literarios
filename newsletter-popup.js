// newsletter-popup.js — popup de suscripción Brevo para letrasespanolas.org
// Copiado del de davidmateos.com (15/08/2026) y adaptado al nicho: aquí lo que se
// promete NO son novedades de un autor, sino el aviso de convocatorias abiertas.
//
// Se muestra una vez a los 18 s o al 55 % de scroll; si se cierra, no vuelve a
// aparecer en 30 días; si el usuario se suscribe, no vuelve a aparecer nunca.
//
// ⚠️ NO SE ENVÍA CON mode:'no-cors'. Así estaba el de davidmateos y escondió
// durante un mes que ningún alta llegaba: la respuesta es ilegible y el código
// daba la bienvenida igual. Brevo permite CORS desde este dominio, así que se lee
// la respuesta y solo se confirma con success:true. Si un formulario no puede
// fallar nunca a la vista, es que no se está mirando si falla.
//
// LA URL DEL FORMULARIO VIVE SOLO AQUÍ, a propósito: `suscribete.html` llama a
// window.LE_NEWSLETTER.suscribir() en vez de repetirla. Si algún día se cambia la
// lista de Brevo, se toca UN sitio y no dos.
(function () {
  var KEY = 'leNewsletterPopup';

  /* Formulario de Brevo de la lista «Letras Españolas — Avisos de convocatorias»,
     creado por David el 19/08/2026 con doble confirmación activada.
     Es la URL EXACTA del atributo action del propio formulario, «==» incluidos y con
     el tramo /v2/ que Brevo usa en los formularios nuevos: NO es el mismo formato que
     el de davidmateos (/serve/ sin v2 y sin «=='), así que no se copia de allí.
     Si algún día se cambia la lista, se toca esta línea y nada más: suscribete.html
     consume esta misma constante a través de window.LE_NEWSLETTER.
     Si se deja vacía, el popup no se muestra y el formulario avisa de que la
     suscripción no está activa. */
  var FORM_URL = 'https://9a7395d6.sibforms.com/v2/serve/MUIFAI_Ox9v6F1ZwvVeY_cvIcUpI3bbp8_OJo60TNn8Sc1lEYYC99XJMSTP4LolE0ffUH79KABxPF7FrXhk_KP3wYdrrg2EyibzdkdcAnkf1SeivkdJP9UHUfEtJ_yREYgdghrYx5zig8-MgSylivnJoa9YJRMyf79Wo1B76poq5NH47JmHB3F3xncmEZLGUFAggq1WIly2ivXiKaA==';

  function suscribir(email) {
    if (!FORM_URL) return Promise.reject(new Error('sin-formulario'));
    var data = new FormData();
    data.append('EMAIL', email);
    data.append('email_address_check', '');
    data.append('locale', 'es');
    return fetch(FORM_URL, { method: 'POST', body: data })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.success !== true) throw new Error(j.message || ('HTTP ' + r.status));
          return j;
        });
      });
  }
  function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  window.LE_NEWSLETTER = { suscribir: suscribir, valido: emailValido, activo: !!FORM_URL };

  if (!FORM_URL) return;

  var page = window.location.pathname.split('/').pop();
  if (page === 'suscribete.html') return;

  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  if (state.subscribed) return;
  if (state.dismissedAt && Date.now() - state.dismissedAt < 30 * 24 * 60 * 60 * 1000) return;

  var css = '' +
    '#le-np-overlay{position:fixed;inset:0;background:rgba(26,26,24,.55);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1.2rem;opacity:0;transition:opacity .35s}' +
    '#le-np-overlay.le-np-visible{opacity:1}' +
    '#le-np{position:relative;max-width:430px;width:100%;background:#f5f2eb;border:1px solid #d4cfc5;border-top:3px solid #c8392b;box-shadow:0 24px 60px rgba(0,0,0,.3);padding:2.6rem 2.4rem 2.2rem;text-align:center;transform:translateY(14px);transition:transform .35s}' +
    '#le-np-overlay.le-np-visible #le-np{transform:translateY(0)}' +
    '#le-np-close{position:absolute;top:.5rem;right:.8rem;background:none;border:none;color:#7a7670;font-size:1.6rem;line-height:1;cursor:pointer;padding:.3rem}' +
    '#le-np-close:hover{color:#1a1a18}' +
    '#le-np .le-np-eyebrow{font-family:"IBM Plex Sans",sans-serif;font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:#b8860b;margin-bottom:.7rem}' +
    '#le-np h2{font-family:"Playfair Display",serif;font-size:1.6rem;line-height:1.25;color:#1a1a18;margin:0 0 .9rem;font-weight:700}' +
    '#le-np p{font-family:"IBM Plex Sans",sans-serif;font-size:.88rem;color:#3d3b37;line-height:1.7;margin:0 0 1.4rem;font-weight:300}' +
    '#le-np form{display:flex;flex-direction:column;gap:.7rem}' +
    '#le-np input[type=email]{width:100%;padding:.85rem 1rem;background:#fff;border:1px solid #d4cfc5;font-family:"IBM Plex Sans",sans-serif;font-size:.9rem;color:#1a1a18;outline:none;text-align:center}' +
    '#le-np input[type=email]:focus{border-color:#c8392b}' +
    '#le-np button[type=submit]{width:100%;padding:.9rem;background:#c8392b;color:#fff;border:none;font-family:"IBM Plex Sans",sans-serif;font-size:.78rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s}' +
    '#le-np button[type=submit]:hover{background:#a52e22}' +
    '#le-np .le-np-note{font-size:.7rem;color:#7a7670;margin:1rem 0 0;line-height:1.6}' +
    '#le-np .le-np-note a{color:#7a7670;text-decoration:underline}' +
    '#le-np .le-np-error{display:none;font-size:.78rem;color:#c8392b;margin:.2rem 0 0}' +
    '@media(max-width:520px){#le-np{padding:2.1rem 1.4rem 1.8rem}#le-np h2{font-size:1.32rem}}';

  function show() {
    if (document.getElementById('le-np-overlay')) return;
    // Si el aviso de cookies está abierto, esperar: dos modales a la vez es
    // insufrible, y además el usuario tiene que poder leer lo que acepta.
    if (document.documentElement.hasAttribute('data-cookies-abierto')) {
      setTimeout(show, 2000);
      return;
    }

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'le-np-overlay';
    overlay.innerHTML =
      '<div id="le-np" role="dialog" aria-modal="true" aria-labelledby="le-np-title">' +
        '<button id="le-np-close" aria-label="Cerrar">&times;</button>' +
        '<div class="le-np-eyebrow">Avisos de convocatorias</div>' +
        '<h2 id="le-np-title">&iquest;Se te pasan los plazos?</h2>' +
        '<p>Una vez al mes te enviamos las convocatorias que se abren y las que est&aacute;n a punto de cerrar, con su dotaci&oacute;n y su fecha l&iacute;mite. Sin cuota de inscripci&oacute;n y verificadas una a una.</p>' +
        '<form novalidate>' +
          '<input type="email" name="EMAIL" placeholder="Tu correo electr&oacute;nico" autocomplete="email" required>' +
          '<div class="le-np-error">Escribe un correo v&aacute;lido para suscribirte.</div>' +
          '<button type="submit">Avisadme gratis</button>' +
        '</form>' +
        '<p class="le-np-note">Una al mes. Sin spam. Te das de baja con un clic. <a href="/privacidad.html">Privacidad</a></p>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('le-np-visible'); });

    function dismiss() {
      state.dismissedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      overlay.classList.remove('le-np-visible');
      setTimeout(function () { overlay.remove(); }, 350);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') dismiss(); }

    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.getElementById('le-np-close').addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);

    overlay.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = overlay.querySelector('input[type=email]');
      var error = overlay.querySelector('.le-np-error');
      var email = input.value.trim();
      if (!emailValido(email)) { error.style.display = 'block'; return; }
      error.style.display = 'none';
      var btn = overlay.querySelector('button[type=submit]');
      btn.textContent = 'Enviando…';
      btn.disabled = true;

      function done() {
        state.subscribed = true;
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
        document.getElementById('le-np').innerHTML =
          '<div class="le-np-eyebrow">Ya casi est&aacute;</div>' +
          '<h2>Revisa tu correo</h2>' +
          '<p>Te hemos enviado un mensaje para confirmar la suscripci&oacute;n. Hasta que no pulses el enlace no te llegar&aacute; nada m&aacute;s: as&iacute; nos aseguramos de que la direcci&oacute;n es tuya.</p>';
        setTimeout(function () {
          overlay.classList.remove('le-np-visible');
          setTimeout(function () { overlay.remove(); }, 350);
        }, 4000);
      }
      suscribir(email).then(done).catch(function () {
        error.innerHTML = 'No se ha podido completar la suscripci&oacute;n. Int&eacute;ntalo de nuevo o escribe a <a href="mailto:dmateos.pascual@gmail.com" style="color:#7a7670">dmateos.pascual@gmail.com</a>.';
        error.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Avisadme gratis';
      });
    });
  }

  var shown = false;
  function trigger() {
    if (shown) return;
    shown = true;
    show();
    window.removeEventListener('scroll', onScroll);
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY / max > 0.55) trigger();
  }
  setTimeout(trigger, 18000);
  window.addEventListener('scroll', onScroll, { passive: true });
})();
