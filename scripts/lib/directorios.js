/**
 * Lectura de los arrays de fichas que viven dentro de los HTML de los directorios.
 *
 * Vive aquí, y no dentro de un script, porque lo usan dos: comprobar-sincronia.js
 * (que vigila que las seis capas de cada ficha digan lo mismo) y comprobar-enlaces.js
 * (que vigila que la web de cada ficha siga en pie). Si algún día los datos salen del
 * HTML a un JSON, este es el único sitio que hay que cambiar.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');

/* Los tres directorios con ficha: nombre del fichero, nombre del array dentro del HTML
   y campo donde vive la web de cada ficha. becas.html y libros.html no entran porque no
   tienen array: sus enlaces van sueltos en el HTML. */
const DIRECTORIOS = [
  { archivo: 'editoriales.html', variable: 'EDITORIALES', campoWeb: 'web' },
  { archivo: 'agentes.html',     variable: 'AGENTES',     campoWeb: 'web' },
  { archivo: 'revistas.html',    variable: 'REVISTAS',    campoWeb: 'web' },
];

/**
 * Extrae el array JS del HTML y lo evalúa.
 *
 * Nada de regex sobre los campos: los textos de las fichas llevan comas, llaves y
 * comillas dentro, y cualquier patrón que intente trocearlos se equivoca tarde o
 * temprano. Se recorre carácter a carácter contando corchetes y saltando el contenido
 * de las cadenas, que es la única forma de saber dónde cierra el array de verdad.
 */
function leerArray(html, variable) {
  const inicio = html.indexOf(`const ${variable} = [`);
  if (inicio === -1) throw new Error(`No encuentro "const ${variable} = [" en el HTML`);
  const abre = html.indexOf('[', inicio);
  let profundidad = 0;
  let cierra = -1;
  let enCadena = null;
  for (let i = abre; i < html.length; i++) {
    const c = html[i];
    if (enCadena) {
      if (c === '\\') i++;
      else if (c === enCadena) enCadena = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { enCadena = c; continue; }
    if (c === '[') profundidad++;
    else if (c === ']') {
      profundidad--;
      if (profundidad === 0) { cierra = i; break; }
    }
  }
  if (cierra === -1) throw new Error(`El array ${variable} no cierra`);
  // eslint-disable-next-line no-eval
  return eval(html.slice(abre, cierra + 1));
}

/** Lee el HTML de un directorio y devuelve sus fichas ya evaluadas. */
function leerFichas(dir) {
  const html = fs.readFileSync(path.join(RAIZ, dir.archivo), 'utf8');
  return leerArray(html, dir.variable);
}

module.exports = { RAIZ, DIRECTORIOS, leerArray, leerFichas };
