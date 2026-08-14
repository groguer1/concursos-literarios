/* Desplegables del menú superior.
   En escritorio abren al pasar el ratón (CSS); esto añade el clic, que es lo único
   que funciona en móvil, más cierre al pulsar fuera y con Escape. */
(function () {
  var grupos = document.querySelectorAll('.nav-grupo');
  if (!grupos.length) return;

  function cerrarTodos(menos) {
    grupos.forEach(function (g) {
      if (g === menos) return;
      g.classList.remove('abierto');
      var b = g.querySelector('.nav-toggle');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }

  grupos.forEach(function (g) {
    var boton = g.querySelector('.nav-toggle');
    if (!boton) return;
    boton.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var abierto = g.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      cerrarTodos(g);
    });
  });

  /* En escritorio el CSS abre el submenú al pasar el ratón, pero un grupo que se
     abrió con clic conserva la clase .abierto y nadie se la quitaba: al pasar al
     grupo de al lado quedaban los DOS desplegados a la vez. El ratón mandando
     sobre el clic es lo que arregla eso. En táctil no se hace: ahí no hay hover
     y el mouseenter llegaría junto al clic, cerrando lo que se acaba de abrir. */
  var hayRaton = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (hayRaton) {
    grupos.forEach(function (g) {
      g.addEventListener('mouseenter', function () { cerrarTodos(g); });
    });
    /* Y si el ratón se va a una entrada normal del menú, tampoco tiene sentido
       dejar colgando el desplegable que se abrió con clic. */
    document.querySelectorAll('.header-nav a').forEach(function (a) {
      if (a.closest('.nav-grupo')) return;
      a.addEventListener('mouseenter', function () { cerrarTodos(null); });
    });

    /* Cierre al salir del grupo con el teclado. Antes lo hacía `:focus-within` en
       el CSS, pero ese selector no distingue teclado de ratón: con Tab abría bien,
       y con un clic dejaba el submenú enganchado. Abrir con teclado lo hace el
       propio botón (Enter y Espacio disparan click); esto solo cierra.
       Va dentro de `hayRaton` a propósito, o sea SOLO en escritorio: en táctil un
       enlace no siempre recibe el foco al tocarlo (iOS), así que el focusout del
       botón llegaría con relatedTarget vacío, cerraría el submenú antes del click
       y el toque en el enlace se perdería. En móvil ya cierra el clic fuera. */
    grupos.forEach(function (g) {
      g.addEventListener('focusout', function (e) {
        if (g.contains(e.relatedTarget)) return;
        g.classList.remove('abierto');
        var b = g.querySelector('.nav-toggle');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-grupo')) cerrarTodos(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarTodos(null);
  });
})();
