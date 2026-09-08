# CLAUDE.md — letrasespanolas.org

> **Este fichero faltaba.** `scripts/comprobar-sincronia.js` lo cita desde su primera
> versión («nada de regex sobre los campos: ver CLAUDE.md») y nunca llegó a crearse, igual
> que pasó con `PUBLICIDAD.md`. Escrito el 08/09/2026.

## Lo primero: antes de subir nada

```
node scripts/comprobar-todo.js
```

Tarda menos de un segundo y comprueba la sintaxis de los scripts, que los JSON de datos
sean válidos, que las fichas de los directorios estén sincronizadas y que el comprobador
de enlaces siga clasificando bien. **Si sale en rojo, no se sube.**

Lo lanza solo el hook de arranque (`.claude/hooks/session-start.sh`), así que cada sesión
empieza sabiendo cómo está el repositorio. Eso NO exime de volver a ejecutarlo antes de
hacer commit: el hook dice cómo estaba al abrir, no cómo está después de tus cambios.

`scripts/comprobar-enlaces.js` va aparte porque necesita internet y tarda minutos. Se
ejecuta solo los lunes (`.github/workflows/comprobar-enlaces.yml`).

## Qué es esto

Directorio de recursos para escritores en español: concursos literarios, editoriales,
agentes, revistas, becas y 54 artículos. **Sitio estático servido por GitHub Pages** en
letrasespanolas.org (ver `CNAME`).

**No hay backend, ni build, ni dependencias.** No existe `package.json`: los scripts son
ficheros de Node sueltos que se ejecutan con `node scripts/loquesea.js` y solo usan la
biblioteca estándar. Servicios externos: Brevo (boletín), Formspree (formularios),
AdSense y Google Analytics, y un worker de Cloudflare que hace de proxy para las búsquedas
del modal de la portada.

## La regla que más caro se ha pagado: las seis capas

Cada ficha de `editoriales.html`, `agentes.html` y `revistas.html` vive en **seis sitios
del mismo HTML**, y los seis tienen que decir lo mismo:

1. el array JS (`EDITORIALES` / `AGENTES` / `REVISTAS`), que alimenta la vista de detalle
2. el `<details class="dir-ficha">`, que es lo que indexa Google
3. el atributo `data-search` de la tarjeta, que usa el buscador de la web
4. los `data-*` de filtro y el año impreso en la rejilla
5. la coherencia entre un interruptor y el texto que lo explica (`sinAgente` ↔ `envio`)
6. los badges de la rejilla, que es lo único que el lector lee sin abrir la ficha

**Un dato corregido solo en el array no está corregido.** Cada una de esas capas se añadió
al comprobador después de que fallara de verdad: el buscador devolviendo fichas por el dato
viejo (4/08), los sellos reclasificados que seguían saliendo al filtrar (11/08), Calambur
luciendo «🏆 Premio propio» después de quitárselo (13/08).

`scripts/comprobar-sincronia.js` las vigila. Al tocar una ficha, ejecútalo.

**Nada de regex para trocear los campos de esas fichas.** Los textos llevan comas, llaves
y comillas dentro, y cualquier patrón que intente partirlos se equivoca tarde o temprano.
`leerArray()` (en `scripts/lib/directorios.js`) recorre el HTML carácter a carácter
contando corchetes y saltando el contenido de las cadenas. Es la única forma fiable.

## Los bots que escriben solos

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `actualizar-concursos.yml` | a diario, 06:00 UTC | raspa escritores.org y guiadeconcursos.com con la API, y **reescribe `index.html` entero** y `concursos.json` |
| `actualizar-libros.yml` | días 1, 11 y 21 | novedades editoriales |
| `comprobar-enlaces.yml` | lunes, 06:00 UTC | comprueba las 95 webs de las fichas |

**`index.html` se regenera cada día.** Nunca escribas a mano dentro de los marcadores
`CONCURSOS-STATIC-START/END` ni `PUBLI-START/END`: el bot se lo lleva por delante en menos
de 24 horas. La publicidad va en `publicidad.json` (condiciones en `PUBLICIDAD.md`) y el
sidebar está fuera de los marcadores, así que sobrevive.

Cuando un bot pueda fallar en silencio, que no pueda: `buscar-concursos.js` avisa si el
listado cae más de un 40 %, y `comprobar-enlaces.js` avisa si más del 60 % de los enlaces
salen dudosos (señal de que no hay red, no de que las webs estén bien). Un script que
termina en verde cuando en realidad no ha comprobado nada es peor que no tenerlo.

## Los scripts

| Fichero | Para qué |
|---|---|
| `scripts/comprobar-todo.js` | **el que hay que ejecutar antes de subir**: lanza todo lo de abajo que no necesita red |
| `scripts/comprobar-sincronia.js` | las seis capas de cada ficha dicen lo mismo |
| `scripts/comprobar-enlaces.js` | las webs de las fichas siguen en pie (necesita internet) |
| `scripts/lib/directorios.js` | `leerArray()` y la lista de directorios, compartido por los dos anteriores |
| `scripts/pruebas/comprobar-enlaces.test.js` | prueba del comprobador contra un servidor local |
| `scripts/buscar-concursos.js` | el bot diario de convocatorias |
| `scripts/buscar-libros.js` | el bot de novedades |

## Cómo se escribe aquí

- **En español**, y dirigido al escritor que lee la web, no al programador.
- Los comentarios del código explican **por qué**, no qué: casi todos cuentan un fallo real
  con su fecha. Mantén esa costumbre, es lo que evita repetir el error.
- Los mensajes de commit describen el problema que se arregla, no el cambio. Sin tildes,
  por coherencia con el historial.

## Decisiones ya tomadas (no volver a proponerlas sin datos nuevos)

- **App móvil nativa: no.** ~400-800 visitas/mes y 3 suscriptores en el boletín no sostienen
  99 €/año de Apple más el mantenimiento. Si algún día se hace algo, es una PWA, y después
  de que el boletín crezca.
- **API pública como producto: no.** No hay consumidores, y publicar los datos en abierto
  canibaliza las visitas, que es lo único que monetiza. Además los datos vienen de raspar
  fuentes ajenas: republicarlos como API es una reutilización más fuerte que listarlos.
- **Sacar las fichas a JSON: pendiente, y solo tiene sentido entero.** Volcar los datos a
  un JSON sin más crea una séptima capa que se desincroniza como las otras seis. Solo
  compensa si se generan las seis capas desde el JSON, y eso es un proyecto de varias
  sesiones. Mientras tanto, la fuente de verdad es el HTML y el guardián es
  `comprobar-sincronia.js`.
- **`publi@letrasespanolas.org`: no se crea.** El contacto es `info@` (decidido el 28/08).
