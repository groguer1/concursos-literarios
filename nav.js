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

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-grupo')) cerrarTodos(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarTodos(null);
  });
})();
