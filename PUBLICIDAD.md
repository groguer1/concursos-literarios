# Publicidad de letrasespanolas.org — tarifas y cómo se publica

> **Este fichero faltaba.** `publicidad.json`, la cola de letras y el diario del 18/08/2026 lo
> citaban («Tarifas y condiciones en PUBLICIDAD.md», «los tres pasos están en el apartado 5») y
> **nunca se llegó a crear**: el commit `e8fae85` solo añadió `index.html`, `publicidad.json` y
> `scripts/buscar-concursos.js`. Escrito el 28/08/2026 junto con `anunciate.html`.

## 1. Qué se vende

**Un solo espacio**: el bloque destacado de la portada, encima del listado de convocatorias.
Un anunciante a la vez, sin rotación y sin solapamiento.

**SOLO CONVOCATORIAS DE CONCURSOS.** David lo acotó el 28/08, después de ver la primera versión:
*«creo que no me gusta mezclar lo de libros, déjalo solo en anunciar concursos»*. Tiene sentido —
el espacio está encima del listado de convocatorias y quien lo mira busca dónde presentarse, no
qué leer—, así que un anuncio de libro ahí desentona con el sitio donde está puesto.

**Los libros entran cuando la newsletter crezca**, y por otra vía: enviándolos en el boletín en vez
de ponerlos en la portada (idea de David, 28/08). Hoy la lista tiene **3 suscriptores**, así que no
toca. El disparador para retomarlo es que la lista llegue a cientos.

La página pública de tarifas es **`anunciate.html`**, enlazada desde el pie de todas las páginas.

## 2. Tarifas (IVA incluido, precio final)

| Formato | Precio | Duración |
|---|---|---|
| Destacado en portada | **37 €** | 15 días |
| Destacado en portada, mes completo | **59 €** | 30 días |
| Segunda convocatoria del mismo organizador | **20 €** | el mismo periodo |

**De dónde salen estos números** (rastreo del 28/08/2026, leído en las páginas de tarifas, no en
resúmenes de buscador):

| Referencia | Formato | Precio |
|---|---|---|
| **Las Nueve Musas** (revista literaria española) | Ficha permanente + perfil de autor + 3 meses de carrusel + redes | **45 €** IVA incl. |
| Las Nueve Musas | Libro adicional del mismo autor | 25 € |
| **Letralia** (tarifa vigente agosto 2026) | Banner en portada | US$130/mes (~112 €) |
| Letralia | Campaña de evento / reseña editorial | US$80 (~69 €) |
| Letralia | Correo + redes, 80.000 seguidores | US$100/mes (~86 €) |

**El ancla es Las Nueve Musas, no Letralia, y la razón importa**: los dos venden **redes sociales**
dentro del paquete y **letras no tiene ninguna** (comprobado barriendo las 22 páginas). Letralia
además tiene 80.000 seguidores. Aplicar «−20 % sobre Letralia» habría dado 89 € por un banner, o
sea **más caro por menos producto**: lo contrario de lo que se pedía. Con la referencia española,
−18 % da los 37 €.

**Precedente que hay que conocer**: el 18/08/2026 se le ofertó a Medina Cultura (VIII Premio
Pérez-Taybilí) una «tarifa corta» de **40 € + IVA = 48,40 €** por 13 días. La tarifa publicada
ahora (37 €) queda **por debajo** de aquella oferta. David lo dio por bueno el 28/08 («ok no pasa
nada»). **No consta en `CUENTAS.md` que ese encargo se cerrara ni se cobrara.**

## 3. Lo que no se acepta

- Convocatorias **sin bases publicadas, sin jurado identificable o sin dotación concreta**.
- Las que exijan al autor **ceder derechos sin límite** solo por presentarse.
- **Reseñas u opiniones favorables a cambio de dinero.** Un anuncio es un anuncio; los artículos y
  los directorios no se tocan por haber pagado.
- Prometer resultados: no se garantiza ningún número de clics, visitas ni participantes.

## 4. Lo que va SIEMPRE, y no es opcional

- Rótulo **«Publicidad»** visible (LSSI-CE, art. 20).
- Enlace con **`rel="sponsored nofollow noopener"`** (lo que Google exige para un enlace pagado).

Las dos cosas están **dentro de `scripts/buscar-concursos.js`**, no en el HTML, así que no dependen
de que nadie se acuerde de ponerlas. **No quitarlas de ahí.**

## 5. Cómo se publica un anuncio — los tres pasos

1. **Cobrar por adelantado** y emitir la factura (serie **LE**, ver `FACTURACION.md`). Anotar el
   ingreso en `CUENTAS.md`, `CUENTAS.xlsx` y el panel: **la base imponible, no el bruto.**
2. **Rellenar `publicidad.json`**: `activo: true`, `hasta` en formato `DD/MM/AAAA`, y el resto de
   campos. El `_ejemplo` de dentro del fichero enseña el formato de cada uno. Si hay imagen, va en
   `/img/publi/`.
3. **`git push`.** El bot monta el bloque entre los marcadores `PUBLI-START/END` al generar la
   portada, y **el anuncio caduca solo** al pasar la fecha de `hasta`: no hay que acordarse de
   retirarlo.

**NUNCA escribir el banner a mano en `index.html`**: el bot reescribe esa página entera cada día a
las 06:00 y el banner duraría menos de 24 horas.

**Cuatro guardas ya probadas** (18/08): inactivo, sin título o sin URL, fecha mal escrita y fecha
pasada. En los cuatro casos deja el hueco vacío en vez de publicar algo roto.

## 6. Pendientes

- ~~`publi@letrasespanolas.org`~~ **DECIDIDO EL 28/08: no se crea.** David: *«deja el mail
  info@letrasespanolas.org y no el de publi»*. El contacto de la página es **`info@`**, que está
  verificado y funcionando. **No volver a proponerlo.**
- **La newsletter NO se vende, y ya no es por falta de dato: tiene 3 suscriptores** (David, 28/08).
  «Avisos de convocatorias» lleva captando desde el 19/08 y en nueve días van tres altas. Con ese
  número no hay alcance que vender, así que **no entra como formato publicitario**. Volver a
  mirarlo solo si la lista crece de verdad —cientos, no decenas—, y mientras tanto no mencionarla
  en `anunciate.html`. **Cuando crezca, es la vía por la que entran los libros** (ver apartado 1).
- **Fuera las cifras de audiencia** (David, 28/08): *«si ha llegado a la página pensará que la
  página se ve, no hace falta dar tanto detalle»*. La versión anterior publicaba impresiones y
  clics con su fecha. **Lo que se queda, y no se quita**, es la cláusula de que no se garantiza
  ningún número de clics, visitas ni participantes: eso no es un dato de audiencia, es lo que evita
  una reclamación. Si un anunciante pregunta por cifras, se le dan las reales; lo que se ha
  retirado es publicarlas de oficio.
- **Preguntar al gestor**: si la publicidad lleva retención de IRPF y con qué epígrafe de IAE
  (pendiente desde el 18/08).
