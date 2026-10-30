// Segundo aviso de cada solicitud de servicio, por Telegram, a traves del Worker
// «avisos-letras» (codigo en workers/avisos-letras.js).
//
// Por que: el 29/10/2026 Formspree dejo de mandar los correos de aviso sin decir nada
// (habia bloqueado la direccion tras un rebote) y las solicitudes solo se veian entrando
// en su panel. Con esto, si el correo vuelve a fallar, el Telegram sigue llegando; y si
// falla Formspree, el Telegram lo dice.
//
// Solo se mandan campos que no identifican a nadie: nombre, correo y mensaje NO salen de
// Formspree. Ver la nota de privacidad del Worker.
//
// Hay que llamarlo ANTES de f.reset(), que es lo que vacia los campos.
(function () {
  var URL_AVISOS = 'https://avisos-letras.dmateos-pascual.workers.dev';
  var CAMPOS = ['servicio', 'premio_amazon', 'genero', 'palabras', 'estado', '_gotcha'];
  window.avisarSolicitud = function (form, estadoFormspree) {
    try {
      var datos = { formulario: form.id, formspree: estadoFormspree };
      var fd = new FormData(form);
      CAMPOS.forEach(function (c) { if (fd.get(c)) datos[c] = String(fd.get(c)); });
      // text/plain: el navegador no hace preflight. keepalive: llega aunque se cierre la pagina.
      fetch(URL_AVISOS, { method: 'POST', body: JSON.stringify(datos), headers: { 'Content-Type': 'text/plain' }, keepalive: true })
        .catch(function () {});
    } catch (e) { /* el aviso nunca debe romper el envio del formulario */ }
  };
})();
