#!/usr/bin/env node
/**
 * Comprobador de sincronía de los tres directorios de letrasespanolas.org.
 *
 * Cada ficha vive en TRES sitios del mismo HTML y los tres tienen que decir lo mismo:
 *   1. el array JS (EDITORIALES / AGENTES / REVISTAS), que alimenta la vista de detalle;
 *   2. el <details class="dir-ficha">, que es lo que indexa Google;
 *   3. el atributo data-search de la tarjeta, que es lo que usa el buscador de la web.
 *
 * El (3) se quedaba fuera de las comprobaciones anteriores: al corregir un dato en el
 * array y en el <details>, el buscador seguía encontrando la ficha por el dato viejo.
 *
 * Uso:  node scripts/comprobar-sincronia.js
 * Sale con código 1 si hay algún campo desincronizado.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// Las etiquetas del <details> NO son iguales en los tres directorios.
const DIRECTORIOS = [
  {
    archivo: 'editoriales.html',
    variable: 'EDITORIALES',
    // Campos del array que se vuelcan en data-search (lo que busca el usuario).
    busqueda: ['nombre', 'desc', 'ciudad', 'tipo', 'autores'],
    etiquetas: {
      envio: 'Cómo enviar tu manuscrito',
      colecciones: 'Colecciones',
      autores: 'Autores de su catálogo actual',
      nota: 'Nuestra valoración (opinión de Letras Españolas)',
    },
  },
  {
    archivo: 'agentes.html',
    variable: 'AGENTES',
    busqueda: ['nombre', 'desc', 'ciudad'],
    etiquetas: {
      contacto: 'Cómo enviar tu propuesta',
      autores: 'Autores representados',
      nota: 'Nuestra valoración (opinión de Letras Españolas)',
    },
  },
  {
    archivo: 'revistas.html',
    variable: 'REVISTAS',
    busqueda: ['nombre', 'desc', 'ciudad'],
    etiquetas: {
      colaboraciones: 'Cómo colaborar',
      periodicidad: 'Periodicidad',
      nota: 'Nuestra valoración (opinión de Letras Españolas)',
    },
  },
];

/** Extrae el array JS del HTML y lo evalúa (nada de regex sobre los campos: ver CLAUDE.md). */
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

/** Decodifica las entidades HTML que usan estos ficheros. */
function decodificar(s) {
  return s
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function sinEtiquetas(s) {
  return decodificar(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Trocea el HTML en tarjetas: cada <div class="dir-item" ...> con su <details>. */
function leerTarjetas(html) {
  const tarjetas = new Map();
  const re = /<div class="dir-item"([^>]*)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const atributos = m[1];
    const id = (atributos.match(/data-id="([^"]*)"/) || [])[1];
    if (!id) continue;
    const busqueda = (atributos.match(/data-search="([^"]*)"/) || [])[1] || '';
    // El <details> de esta tarjeta es el primero que aparece antes de la tarjeta siguiente.
    const siguiente = html.indexOf('<div class="dir-item"', re.lastIndex);
    const trozo = html.slice(re.lastIndex, siguiente === -1 ? html.length : siguiente);
    const det = trozo.match(/<details class="dir-ficha"[\s\S]*?<\/details>/);
    tarjetas.set(id, { busqueda: decodificar(busqueda), ficha: det ? det[0] : null });
  }
  return tarjetas;
}

/** Saca el valor de un campo del <details> por su etiqueta en <strong>. */
function campoDeLaFicha(ficha, etiqueta) {
  const parrafos = ficha.match(/<p>[\s\S]*?<\/p>/g) || [];
  for (const p of parrafos) {
    const cabecera = p.match(/<strong>([\s\S]*?)<\/strong>/);
    if (!cabecera) continue;
    const nombre = sinEtiquetas(cabecera[1]).replace(/\.$/, '');
    if (nombre === etiqueta) {
      return sinEtiquetas(p.slice(p.indexOf('</strong>') + 9));
    }
  }
  return null;
}

let campos = 0;
let problemas = 0;
const aviso = (msg) => { problemas++; console.log(`  ✗ ${msg}`); };

for (const dir of DIRECTORIOS) {
  const html = fs.readFileSync(path.join(RAIZ, dir.archivo), 'utf8');
  const fichas = leerArray(html, dir.variable);
  const tarjetas = leerTarjetas(html);
  console.log(`\n${dir.archivo} — ${fichas.length} fichas en el array, ${tarjetas.size} tarjetas en el HTML`);

  if (fichas.length !== tarjetas.size) {
    aviso(`el array tiene ${fichas.length} fichas y el HTML ${tarjetas.size} tarjetas`);
  }

  for (const ficha of fichas) {
    const tarjeta = tarjetas.get(ficha.id);
    if (!tarjeta) { aviso(`${ficha.id}: está en el array pero no tiene tarjeta en el HTML`); continue; }
    if (!tarjeta.ficha) { aviso(`${ficha.id}: la tarjeta no tiene <details> (Google no ve la ficha)`); continue; }

    // 1 y 2: array ↔ <details>
    for (const [clave, etiqueta] of Object.entries(dir.etiquetas)) {
      const valor = ficha[clave];
      const enFicha = campoDeLaFicha(tarjeta.ficha, etiqueta);
      if (valor === undefined || valor === null || valor === '') {
        if (enFicha !== null) aviso(`${ficha.id} · ${etiqueta}: el array no lo trae pero el <details> dice "${enFicha}"`);
        continue;
      }
      campos++;
      // El array guarda entidades HTML (&quot;) que el navegador ya renderiza al inyectarlas.
      const esperado = decodificar(String(valor)).replace(/\s+/g, ' ').trim();
      if (enFicha === null) aviso(`${ficha.id} · ${etiqueta}: falta en el <details> (el array dice "${esperado}")`);
      else if (enFicha !== esperado) aviso(`${ficha.id} · ${etiqueta}:\n      array    → ${esperado}\n      <details> → ${enFicha}`);
    }

    // 3: array ↔ data-search (lo que usa el buscador de la web)
    for (const clave of dir.busqueda) {
      if (!ficha[clave]) continue;
      campos++;
      const esperado = decodificar(String(ficha[clave])).replace(/\s+/g, ' ').trim().toLowerCase();
      if (!tarjeta.busqueda.toLowerCase().includes(esperado)) {
        aviso(`${ficha.id} · ${clave}: data-search NO lo contiene (el buscador sigue usando el dato viejo)\n      array       → ${esperado}\n      data-search → ${tarjeta.busqueda}`);
      }
    }

    // Ningún dato retirado del array debe seguir vivo en el <details>
    if (/undefined|null/.test(sinEtiquetas(tarjeta.ficha))) {
      aviso(`${ficha.id}: el <details> imprime "undefined" o "null"`);
    }
  }
}

console.log(`\n${campos} campos comprobados · ${problemas} problema(s)`);
process.exit(problemas ? 1 : 0);
