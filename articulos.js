// articulos.js — metadatos de todos los artículos de letrasespanolas.org
// Para añadir un artículo nuevo: añade un objeto a este array y crea el HTML en /articulos/
// El index.html carga este archivo y lo usa para renderizar la lista.

const ARTICULOS = [
  {
    id: 'como-escribir-novela-negra',
    cat: 'Escritura creativa',
    titulo: 'Cómo escribir una novela negra: estructura, ritmo y los errores del género',
    excerpt: 'Los mecanismos narrativos que hacen funcionar una novela negra: gestión de la información, el protagonista del género, el ritmo de los capítulos y los errores que delatan al escritor novel.',
    tiempo: '14 min',
    url: 'articulos/como-escribir-novela-negra.html'
  },
  {
    id: 'beta-readers-lectores-cero',
    cat: 'El oficio',
    titulo: 'Qué es un beta reader y cómo encontrar lectores cero en España',
    excerpt: 'Para qué sirve un beta reader, cuántos necesitas, dónde encontrarlos en España y cómo pedirles el feedback que realmente te sirve.',
    tiempo: '11 min',
    url: 'articulos/beta-readers-lectores-cero.html'
  },
  {
    id: 'como-enviar-manuscrito-editorial',
    cat: 'Publicación',
    titulo: 'Cómo enviar un manuscrito a una editorial: formato, canales y tiempos de respuesta',
    excerpt: 'El formato estándar, la portada, los canales de envío, si puedes mandar a varias editoriales a la vez y los tiempos de respuesta reales en el mercado español.',
    tiempo: '12 min',
    url: 'articulos/como-enviar-manuscrito-editorial.html'
  },
  {
    id: 'fiscalidad-escritor-autonomo-espana',
    cat: 'El oficio',
    titulo: 'Fiscalidad del escritor en España: IRPF, IVA y lo que necesitas saber antes de cobrar',
    excerpt: 'Cuándo darte de alta como autónomo, cómo tributan las regalías, el IVA en los servicios del escritor, el modelo 130 y los gastos deducibles.',
    tiempo: '15 min',
    url: 'articulos/fiscalidad-escritor-autonomo-espana.html'
  },
  {
    id: 'como-escribir-poesia-concurso',
    cat: 'Concursos',
    titulo: 'Cómo escribir poesía para concursos literarios: técnica y criterios de selección',
    excerpt: 'Qué valoran los jurados de poesía, el debate entre métrica y verso libre, la imagen poética, la extensión óptima y los errores técnicos que eliminan un poema.',
    tiempo: '12 min',
    url: 'articulos/como-escribir-poesia-concurso.html'
  },
  {
    id: 'escribir-segunda-novela-sindrome',
    cat: 'El oficio',
    titulo: 'El síndrome de la segunda novela: qué es y cómo superarlo',
    excerpt: 'Por qué la segunda novela es diferente, las tres trampas más comunes, cómo volver a escribir después del primer libro y qué te enseña este proceso sobre tu oficio.',
    tiempo: '11 min',
    url: 'articulos/escribir-segunda-novela-sindrome.html'
  },
  {
    id: 'como-titular-novela',
    cat: 'Técnica narrativa',
    titulo: 'Cómo titular tu novela: técnicas, criterios y errores frecuentes',
    excerpt: 'Qué tiene que hacer un buen título, los tipos que funcionan, los errores más frecuentes y lo que opinan los editores sobre cambiar el título que tú has elegido.',
    tiempo: '10 min',
    url: 'articulos/como-titular-novela.html'
  },
  {
    id: 'crowdfunding-libro-espana',
    cat: 'Publicación',
    titulo: 'Crowdfunding para publicar un libro en España: guía práctica 2026',
    excerpt: 'Plataformas disponibles, cómo calcular el objetivo de financiación, qué recompensas funcionan y qué determina el éxito o el fracaso de una campaña editorial.',
    tiempo: '13 min',
    url: 'articulos/crowdfunding-libro-espana.html'
  },
  {
    id: 'punto-de-vista-narrativo',
    cat: 'Técnica narrativa',
    titulo: 'Punto de vista narrativo: cuál elegir y cómo no cambiar sin querer',
    excerpt: 'Primera persona, tercera limitada y omnisciente: cómo elegir el punto de vista para tu novela y cómo detectar y corregir el head hopping en tu propio texto.',
    tiempo: '13 min',
    url: 'articulos/punto-de-vista-narrativo.html'
  },
  {
    id: 'como-escribir-dialogo-novela',
    cat: 'Técnica narrativa',
    titulo: 'Cómo escribir diálogos en una novela: técnica, ritmo y puntuación en español',
    excerpt: 'Para qué sirve el diálogo, cómo crear voces individuales, el subtexto, la puntuación correcta con rayas en español y cómo modular el ritmo entre narración y diálogo.',
    tiempo: '13 min',
    url: 'articulos/como-escribir-dialogo-novela.html'
  },
  {
    id: 'como-escribir-sinopsis-editorial',
    cat: 'Publicación',
    titulo: 'Cómo escribir una sinopsis que conquiste a editores y agentes',
    excerpt: 'Guía completa para escribir la sinopsis de tu novela: estructura, los cinco elementos imprescindibles y los errores que la arruinan antes de que el agente pase a la segunda página.',
    tiempo: '12 min',
    url: 'articulos/sinopsis-novela-editorial.html'
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
  },
  {
    id: 'como-publicar-primera-novela-espana',
    cat: 'Publicación',
    titulo: 'Cómo publicar tu primera novela en España: guía paso a paso',
    excerpt: 'Desde terminar el manuscrito hasta firmar el contrato: editoriales, agentes, autopublicación y los errores que debes evitar en el mercado editorial español.',
    tiempo: '18 min',
    url: 'articulos/como-publicar-primera-novela-espana.html'
  },
  {
    id: 'cuanto-cobra-escritor-regalias-espana',
    cat: 'El oficio',
    titulo: 'Cuánto cobra un escritor por regalías en España: cifras reales',
    excerpt: 'Porcentajes de regalías, anticipos, liquidaciones y lo que nadie te dice sobre vivir de la escritura en el mercado editorial español.',
    tiempo: '16 min',
    url: 'articulos/cuanto-cobra-escritor-regalias-espana.html'
  },
  {
    id: 'editoriales-que-aceptan-manuscritos-sin-agente',
    cat: 'Publicación',
    titulo: 'Editoriales que aceptan manuscritos sin agente en España (2026)',
    excerpt: 'Lista actualizada de editoriales españolas con propuestas directas: Anagrama, Impedimenta, Siruela, Valdemar y muchas más, con sus requisitos y tiempos de respuesta.',
    tiempo: '17 min',
    url: 'articulos/editoriales-que-aceptan-manuscritos-sin-agente.html'
  },
  {
    id: 'como-escribir-novela-historica',
    cat: 'Técnica narrativa',
    titulo: 'Cómo escribir una novela histórica: técnica, documentación y errores frecuentes',
    excerpt: 'Cómo investigar sin ahogar la narrativa, qué licencias son aceptables y cómo evitar los anacronismos que delatan al escritor novel en el género histórico.',
    tiempo: '20 min',
    url: 'articulos/como-escribir-novela-historica.html'
  },
  {
    id: 'autopublicacion-vs-editorial-tradicional-espana',
    cat: 'Publicación',
    titulo: 'Autopublicación vs editorial tradicional en España: comparativa honesta 2026',
    excerpt: 'Ingresos, control, visibilidad y distribución: comparativa real de los dos modelos para que decidas cuál encaja con tu proyecto y tu momento como escritor.',
    tiempo: '19 min',
    url: 'articulos/autopublicacion-vs-editorial-tradicional-espana.html'
  },
,
{
id: 'como-leer-bases-concurso-literario',
cat: 'Concursos',
titulo: 'Cómo leer las bases de un concurso literario: guía para no descalificarte',
excerpt: 'Los once apartados que debes revisar en cualquier convocatoria: extensión, seudonóimo, derechos cedidos, plazo y los errores que descalifican automáticamente.',
tiempo: '12 min',
url: 'articulos/como-leer-bases-concurso-literario.html'
},
{
id: 'concursos-literarios-escritores-ineditos-espana',
cat: 'Concursos',
titulo: 'Concursos literarios para escritores inéditos en España 2026: dónde buscarlos y cómo presentarse',
excerpt: 'Guía completa para escritores sin obra publicada: dónde encontrar concursos, qué significa inédito en las bases, qué formatos son más accesibles y cómo preparar tu primera presentación.',
tiempo: '14 min',
url: 'articulos/concursos-literarios-escritores-ineditos-espana.html'
},
{
id: 'seudonimo-concurso-literario',
cat: 'Concursos',
titulo: 'El seudonóimo en concursos literarios: qué es, por qué existe y cómo elegirlo',
excerpt: 'Por qué los concursos usan seudonóimo, cómo funciona el sistema de sobre cerrado, cómo elegir el tuyo y los errores que rompen el anonimato sin querer (propiedades del documento, historial de cambios).',
tiempo: '10 min',
url: 'articulos/seudonimo-concurso-literario.html'
}
  {
    id: 'sinopsis-novela-editorial',
    cat: 'Publicación',
    titulo: 'Cómo escribir una sinopsis para editoriales y agentes literarios',
    excerpt: 'Estructura exacta, extensión estándar, los cinco párrafos imprescindibles y los errores que arruinan la sinopsis antes de que el agente pase a la segunda página.',
    tiempo: '12 min',
    url: 'articulos/sinopsis-novela-editorial.html'
  },
  {
    id: 'taller-escritura-creativa-espana',
    cat: 'El oficio',
    titulo: 'Talleres de escritura creativa en España: cómo elegir el que te conviene',
    excerpt: 'Cómo evaluar un taller de escritura: el currículum del docente, la metodología, el número de alumnos y las preguntas que debes hacer antes de inscribirte.',
    tiempo: '11 min',
    url: 'articulos/taller-escritura-creativa-espana.html'
  },
  {
    id: 'correccion-estilo-manuscrito',
    cat: 'El oficio',
    titulo: 'Corrector de estilo para manuscritos: qué hace, cuánto cuesta y cuándo lo necesitas',
    excerpt: 'Diferencias entre los tipos de corrección, tarifas en España 2026 y cuándo es realmente necesario contratar un corrector antes de enviar a editoriales.',
    tiempo: '10 min',
    url: 'articulos/correccion-estilo-manuscrito.html'
  },
  {
    id: 'epub-formato-ebook-espana',
    cat: 'Autopublicación',
    titulo: 'Cómo crear un epub: herramientas, formato y distribución de ebooks',
    excerpt: 'Flujo de trabajo completo para crear un epub: desde Word hasta el archivo validado listo para distribuir en Amazon KDP, Kobo, Apple Books y Google Play.',
    tiempo: '13 min',
    url: 'articulos/epub-formato-ebook-espana.html'
  },
  {
    id: 'punto-de-vista-narrativo',
    cat: 'Técnica narrativa',
    titulo: 'Punto de vista narrativo: cuál elegir y cómo evitar el head hopping',
    excerpt: 'Primera persona, tercera limitada y omnisciente: criterios para elegir el punto de vista de tu novela y cómo detectar y corregir el head hopping.',
    tiempo: '13 min',
    url: 'articulos/punto-de-vista-narrativo.html'
  },
  {
    id: 'escritura-literatura-infantil-juvenil',
    cat: 'Escritura creativa',
    titulo: 'Cómo escribir literatura infantil y juvenil: guía para autores',
    excerpt: 'El mapa del género por edades, los errores más comunes al escribir para niños, el protagonista con agencia y las editoriales de LIJ en España.',
    tiempo: '14 min',
    url: 'articulos/escritura-literatura-infantil-juvenil.html'
  },
  {
    id: 'becas-residencias-escritura-espana',
    cat: 'El oficio',
    titulo: 'Becas y residencias de escritura en España: guía completa',
    excerpt: 'Tipos de ayudas, programas del Ministerio de Cultura, residencias autonómicas, fundaciones privadas y residencias internacionales para escritores.',
    tiempo: '11 min',
    url: 'articulos/becas-residencias-escritura-espana.html'
  },
  {
    id: 'como-escribir-ciencia-ficcion',
    cat: 'Escritura creativa',
    titulo: 'Cómo escribir ciencia ficción: guía técnica para escritores',
    excerpt: 'Subgéneros de la CF, worldbuilding coherente, extrañamiento cognitivo, los errores más frecuentes y cómo publicar CF en el mercado editorial español.',
    tiempo: '14 min',
    url: 'articulos/como-escribir-ciencia-ficcion.html'
  },
  {
    id: 'como-escribir-fantasia',
    cat: 'Escritura creativa',
    titulo: 'Cómo escribir fantasía: worldbuilding, magia y estructura en el género',
    excerpt: 'Subgéneros de la fantasía, las Leyes de Sanderson para sistemas de magia, la worldbuilder\'s disease y cómo publicar fantasía en España.',
    tiempo: '15 min',
    url: 'articulos/como-escribir-fantasia.html'
  },
  {
    id: 'bloqueo-escritor-tecnicas',
    cat: 'El oficio',
    titulo: 'Cómo superar el bloqueo del escritor: técnicas que funcionan',
    excerpt: 'Los cinco tipos de bloqueo del escritor y las soluciones específicas: perfeccionismo paralizante, desorientación narrativa, miedo al fracaso y agotamiento.',
    tiempo: '12 min',
    url: 'articulos/bloqueo-escritor-tecnicas.html'
  },
  {
    id: 'cursos-online-escritores',
    cat: 'El oficio',
    titulo: 'Cursos online para escritores: ¿merecen la pena?',
    excerpt: 'Análisis de los tipos de cursos online útiles para escritores: escritura creativa, autopublicación, marketing de autor y edición. Cuándo merece la pena pagar y dónde encontrarlos.',
    tiempo: '13 min',
    url: 'articulos/cursos-online-escritores.html'
  },
  {
    id: 'cursos-online-escritores',
    cat: 'El oficio',
    titulo: 'Cursos online para escritores: ¿merecen la pena?',
    excerpt: 'Análisis de los tipos de cursos online útiles para escritores: escritura creativa, autopublicación, marketing de autor y edición. Cuándo merece la pena pagar y dónde encontrarlos.',
    tiempo: '13 min',
    url: 'articulos/cursos-online-escritores.html'
  },
  {
    id: 'aprender-escribir-novela-recursos',
    cat: 'Escritura creativa',
    titulo: 'Cómo aprender a escribir una novela: recursos gratis y de pago en España',
    excerpt: 'Comparativa de recursos para aprender a escribir una novela: gratuitos vs de pago. Qué funciona de verdad y cuándo merece la pena invertir en formación.',
    tiempo: '14 min',
    url: 'articulos/aprender-escribir-novela-recursos.html'
  },
  {
    id: 'honorarios-agente-literario-espana',
    cat: 'Agentes literarios',
    titulo: 'Cuanto cobra un agente literario en Espana? Porcentajes, contratos y que debes saber',
    excerpt: 'Un agente literario en Espana cobra entre el 10% y el 15% de tus ingresos. Descubre como funciona, que incluye y cuando compensa tener uno.',
    tiempo: '10 min',
    url: 'articulos/honorarios-agente-literario-espana.html'
  },
  {
    id: 'carta-presentacion-escritor-ejemplos',
    cat: 'Publicacion',
    titulo: 'Carta de presentacion para editorial o agente literario: ejemplos y estructura',
    excerpt: 'Como escribir una carta de presentacion literaria para editoriales y agentes. Estructura, ejemplos reales y errores que debes evitar en 2026.',
    tiempo: '12 min',
    url: 'articulos/carta-presentacion-escritor-ejemplos.html'
  },
  {
    id: 'portada-libro-autopublicacion',
    cat: 'Autopublicación',
    titulo: 'Portada libro autopublicación: Canva, Reedsy o diseñador profesional',
    excerpt: 'Cómo diseñar o contratar la portada de tu libro autopublicado: Canva Pro, Reedsy, 99designs y Fiverr con precios reales. Criterios de Amazon KDP y los errores más comunes.',
    tiempo: '13 min',
    url: 'articulos/portada-libro-autopublicacion.html'
  },
  {
    id: 'conseguir-resenas-libro-espana',
    cat: 'Marketing literario',
    titulo: 'Cómo conseguir reseñas para tu libro autopublicado en España',
    excerpt: 'Estrategia ARC, NetGalley, clubes de lectura, bloggers literarios y lectores beta para conseguir las primeras reseñas en Amazon y Goodreads. Cómo evitar las reseñas falsas.',
    tiempo: '12 min',
    url: 'articulos/conseguir-resenas-libro-espana.html'
  },
  {
    id: 'isbn-gratis-autopublicar-libro-espana',
    cat: 'Autopublicación',
    titulo: 'ISBN gratis para autopublicar tu libro en España: guía 2026',
    excerpt: 'Cómo conseguir el ISBN gratuito en España como autor autopublicado: quién puede pedirlo, el trámite paso a paso, ISBN propio vs el de Amazon KDP y el depósito legal.',
    tiempo: '13 min',
    url: 'articulos/isbn-gratis-autopublicar-libro-espana.html'
  },
  {
    id: 'promocionar-libro-booktok-instagram-espana',
      cat: 'Marketing literario',
      titulo: 'Promocionar tu libro en BookTok e Instagram: guía 2026',
      excerpt: 'Estrategia paso a paso para promocionar tu libro en BookTok e Instagram siendo autor novel: contenido que funciona, hashtags y errores frecuentes.',
      tiempo: '13 min',
      url: 'articulos/promocionar-libro-booktok-instagram-espana.html'
  },
  {
    id: 'cuanto-cuesta-autopublicar-libro-espana',
      cat: 'Autopublicación',
      titulo: 'Cuánto cuesta autopublicar un libro en España en 2026: presupuesto real',
      excerpt: 'Desglose completo de costes para autopublicar un libro en España en 2026: corrección, portada, maquetación, ISBN y marketing, con cifras reales.',
      tiempo: '14 min',
      url: 'articulos/cuanto-cuesta-autopublicar-libro-espana.html'
  },
];

// Función que renderiza la lista de artículos en el elemento indicado
function renderArticulosExternos(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = ARTICULOS.map(a =>
    `<a class="art-item" href="${a.url}" target="_top">
       <div class="art-cat">${a.cat}</div>
       <div class="art-title">${a.titulo}</div>
       <div class="art-excerpt">${a.excerpt}</div>
       <div class="art-meta">Lectura · ${a.tiempo}</div>
     </a>`
  ).join('');
}

// Auto-renderiza en cuanto el script carga (resuelve el problema de orden de carga)
document.addEventListener('DOMContentLoaded', function() {
  renderArticulosExternos('articulos-list');
});

// Dispara evento por si renderArt() ya se llamó antes de que este script cargara
window.dispatchEvent(new Event('articulosReady'));
