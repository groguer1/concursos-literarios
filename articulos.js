// articulos.js — metadatos de todos los artículos de letrasespanolas.org
// Para añadir un artículo nuevo: añade un objeto a este array y crea el HTML en /articulos/
// El index.html carga este archivo y lo usa para renderizar la lista.

const ARTICULOS = [
  {
    id: 'como-escribir-sinopsis-editorial',
    cat: 'Publicación',
    titulo: 'Cómo escribir una sinopsis que conquiste a editores y agentes',
    excerpt: 'Guía completa para escribir la sinopsis de tu novela: estructura, los cinco elementos imprescindibles y los errores que la arruinan antes de que el agente pase a la segunda página.',
    tiempo: '12 min',
    url: 'articulos/como-escribir-sinopsis-editorial.html'
  },
  {
    id: 'agente-literario-espana',
    cat: 'Publicación',
    titulo: 'Cómo encontrar un agente literario en España: guía completa',
    excerpt: 'Qué hace un agente, cuándo buscarlo, cómo preparar la propuesta y qué agencias representan tu género. Todo lo que necesitas antes de enviar tu primera consulta.',
    tiempo: '14 min',
    url: 'articulos/agente-literario-espana.html'
  },
  {
    id: 'carta-presentacion-editorial',
    cat: 'Publicación',
    titulo: 'La carta de presentación a una editorial: cómo escribirla y qué no poner nunca',
    excerpt: 'La carta de presentación es lo primero que lee el agente. Esta guía explica la estructura exacta, los cuatro bloques que tiene que tener y los errores que la matan en treinta segundos.',
    tiempo: '12 min',
    url: 'articulos/carta-presentacion-editorial.html'
  },
  {
    id: 'guia-concursos-literarios-espana',
    cat: 'Concursos',
    titulo: 'Guía completa para presentarte a concursos literarios en España',
    excerpt: 'Tipos de concursos, cómo leer las bases, el seudónimo, los derechos cedidos y los errores que descalifican automáticamente. Todo lo que necesitas antes de enviar.',
    tiempo: '13 min',
    url: 'articulos/guia-concursos-literarios-espana.html'
  },
  {
    id: 'premios-literarios-espana-2026',
    cat: 'Concursos',
    titulo: 'Los grandes premios literarios de España en 2026: guía completa',
    excerpt: 'Premio Planeta, Herralde, Alfaguara, Nadal, Loewe y los Premios Nacionales: dotación, requisitos y qué tipo de obra busca cada jurado.',
    tiempo: '11 min',
    url: 'articulos/premios-literarios-espana-2026.html'
  },
  {
    id: 'como-escribir-relato-corto-concurso',
    cat: 'Escritura creativa',
    titulo: 'Cómo escribir un relato corto para ganar un concurso literario',
    excerpt: 'Guía técnica para relatos de concurso: estructura, apertura, el giro final, la extensión óptima y qué diferencia técnicamente a los finalistas del resto.',
    tiempo: '13 min',
    url: 'articulos/como-escribir-relato-corto-concurso.html'
  },
  {
    id: 'como-escribir-primer-parrafo-novela',
    cat: 'Escritura creativa',
    titulo: 'El primer párrafo: cómo atrapar al lector desde la primera línea',
    excerpt: 'Los tipos de apertura que funcionan, los errores que cierran el libro antes de empezar y por qué el primer párrafo es el que más vale la pena reescribir.',
    tiempo: '10 min',
    url: 'articulos/como-escribir-primer-parrafo-novela.html'
  },
  {
    id: 'estructura-tres-actos-novela',
    cat: 'Escritura creativa',
    titulo: 'Estructura en tres actos: la guía definitiva para novelistas',
    excerpt: 'Cómo aplicar la estructura clásica de tres actos a tu novela sin que se note: detonante, punto oscuro, clímax y el arco del personaje que hace que el lector llegue al final.',
    tiempo: '13 min',
    url: 'articulos/estructura-tres-actos-novela.html'
  },
  {
    id: 'amazon-kdp-vs-editorial-tradicional',
    cat: 'Publicación',
    titulo: 'Amazon KDP vs editorial tradicional: comparativa honesta para escritores españoles',
    excerpt: 'Regalías, distribución, control creativo y velocidad: cuándo tiene sentido cada opción y el modelo híbrido que usan cada vez más autores.',
    tiempo: '15 min',
    url: 'articulos/amazon-kdp-vs-editorial-tradicional.html'
  },
  {
    id: 'autopublicacion-papel-kdp-print',
    cat: 'Publicación',
    titulo: 'Autopublicación en papel: guía completa de KDP Print e IngramSpark',
    excerpt: 'Cómo autopublicar tu libro en papel en España: diferencias entre KDP Print e IngramSpark, costes reales, distribución en librerías y lo que nadie te cuenta.',
    tiempo: '14 min',
    url: 'articulos/autopublicacion-papel-kdp-print.html'
  },
  {
    id: 'contrato-editorial-clausulas',
    cat: 'Derechos de autor',
    titulo: 'El contrato editorial: cláusulas que debes leer (y negociar) antes de firmar',
    excerpt: 'Anticipo, regalías, territorialidad, reversión de derechos, cláusula de opción: lo que significan, qué es negociable y qué nunca deberías aceptar.',
    tiempo: '15 min',
    url: 'articulos/contrato-editorial-clausulas.html'
  },
  {
    id: 'derechos-autor-contrato-editorial',
    cat: 'Derechos de autor',
    titulo: 'Derechos de autor en contratos editoriales: qué ceder y qué conservar',
    excerpt: 'Derechos morales, patrimoniales, de traducción y audiovisuales: qué son, cuáles son inalienables y cómo proteger tus intereses sin bloquear la relación con el editor.',
    tiempo: '12 min',
    url: 'articulos/derechos-autor-contrato-editorial.html'
  },
  {
    id: 'registrar-obra-literaria-espana',
    cat: 'Derechos de autor',
    titulo: 'Cómo registrar tu obra literaria en España: guía paso a paso',
    excerpt: 'Para qué sirve el registro, dónde y cómo registrar en cada comunidad autónoma, cuánto cuesta y las alternativas gratuitas que son jurídicamente válidas.',
    tiempo: '9 min',
    url: 'articulos/registrar-obra-literaria-espana.html'
  }
];

// Función que renderiza la lista de artículos en el elemento indicado
// Se llama desde index.html: renderArticulosExternos('articulos-list')
function renderArticulosExternos(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = ARTICULOS.map(a =>
    `<a class="art-item" href="${a.url}">
       <div class="art-cat">${a.cat}</div>
       <div class="art-title">${a.titulo}</div>
       <div class="art-excerpt">${a.excerpt}</div>
       <div class="art-meta">Lectura · ${a.tiempo}</div>
     </a>`
  ).join('');
}
