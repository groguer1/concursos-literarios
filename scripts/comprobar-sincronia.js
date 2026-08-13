#!/usr/bin/env node
/**
 * Comprobador de sincronía de los tres directorios de letrasespanolas.org.
 *
 * Cada ficha vive en CUATRO sitios del mismo HTML y los cuatro tienen que decir lo mismo:
 *   1. el array JS (EDITORIALES / AGENTES / REVISTAS), que alimenta la vista de detalle;
 *   2. el <details class="dir-ficha">, que es lo que indexa Google;
 *   3. el atributo data-search de la tarjeta, que es lo que usa el buscador de la web;
 *   4. los atributos data-* de filtro (data-tipo, data-generos…) y el año visible en la
 *      rejilla, que es lo que ve el lector y lo que devuelven los botones de filtro.
 *
 * El (3) se quedaba fuera hasta el 4/08: al corregir un dato en el array y en el <details>,
 * el buscador seguía encontrando la ficha por el dato viejo.
 * El (4) se quedaba fuera hasta el 11/08, y se pagó dos veces: los cuatro sellos
 * reclasificados de independiente a grande el 4/08 seguían saliendo al pulsar
 * «Independientes», y los 37 años de fundación retirados el 2/08 seguían impresos en la
 * rejilla. Un dato corregido solo en el array no está corregido.
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
    // Atributos data-* de la tarjeta que usan los botones de filtro.
    filtros: {
      'data-tipo': 'tipo',
      'data-generos': 'generos',
      'data-sinagente': 'sinAgente',
      'data-premio': 'premio',
      'data-noveles': 'noveles',
    },
    anioVisible: true, // la rejilla imprime el año de fundación como etiqueta
    // Capa 6: los badges de la rejilla, que es lo que el lector lee sin abrir la ficha.
    badges: [
      { nombre: 'premio',       campo: 'premio',    marca: /🏆/,             valor: v => v === true },
      { nombre: 'independiente', campo: 'tipo',     marca: /Independiente/,  valor: v => v === 'independiente' },
    ],
    // Capa 5: el interruptor y el texto que lo explica tienen que decir lo mismo.
    // Nació el 12/08: seis fichas llevaban el badge verde «Sin agente» y un texto que decía
    // «NO acepta manuscritos no solicitados». El texto se corrigió el 2/08 y el interruptor no.
    coherencia: [
      {
        campo: 'sinAgente', cuando: true, texto: 'envio',
        contradice: /\bno\s+(?:se\s+)?(?:acepta|admite|reciben?)\w*\s+(?:actualmente\s+)?(?:manuscritos|originales|propuestas|envíos)|(?:recepción|convocatoria)[^.]{0,40}\b(?:cerrada|cerrado)|ha\s+cerrado\s+la\s+recepción|solo\s+(?:trabaja|trabajan)\s+con\s+agentes|la\s+vía\s+es\s+el\s+agente/i,
      },
      {
        campo: 'sinAgente', cuando: false, texto: 'envio',
        contradice: /manuscritos\.penguinrandomhouse|admite\s+originales|acepta\s+(?:propuestas|originales|manuscritos)|por\s+correo\s+postal/i,
        // «no acepta originales no solicitados» contiene «acepta originales»: si la frase es
        // negativa manda la negación, no la coincidencia suelta.
        salvoQue: /\bno\s+(?:se\s+)?(?:acepta|admite|reciben?)\w*|solo\s+(?:trabaja|trabajan|publica)|cerrada|cerrado/i,
      },
    ],
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
    filtros: { 'data-especialidades': 'especialidades' },
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
    filtros: { 'data-tipo': 'tipo', 'data-acepta': 'acepta' },
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
    // Atributos data-* de filtro y año impreso en la rejilla (capa 4).
    const atribs = {};
    for (const a of atributos.matchAll(/(data-[a-z-]+)="([^"]*)"/g)) atribs[a[1]] = decodificar(a[2]);
    const tags = trozo.match(/<div class="dir-tags">[\s\S]*?<\/div>/);
    const anio = tags ? (tags[0].match(/<span class="tag">(1[89]\d\d|20\d\d)<\/span>/) || [])[1] || null : null;
    // Capa 6: los badges de la rejilla. Son el resumen que el lector lee sin abrir la ficha.
    const badges = (trozo.match(/<div class="dir-badges">([\s\S]*?)<\/div>/) || [])[1] || '';
    tarjetas.set(id, { busqueda: decodificar(busqueda), ficha: det ? det[0] : null, atribs, anio, badges });
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

    // 4a: array ↔ atributos data-* de filtro (lo que devuelven los botones de la web)
    for (const [atributo, clave] of Object.entries(dir.filtros || {})) {
      const valor = ficha[clave];
      if (valor === undefined || valor === null) continue;
      campos++;
      const esperado = Array.isArray(valor) ? valor.join(',') : String(valor);
      const enTarjeta = tarjeta.atribs[atributo];
      if (enTarjeta === undefined) {
        aviso(`${ficha.id} · ${atributo}: falta en la tarjeta (el array dice "${esperado}")`);
      } else if (enTarjeta !== esperado) {
        aviso(`${ficha.id} · ${atributo}: el filtro usa el valor viejo\n      array   → ${esperado}\n      tarjeta → ${enTarjeta}`);
      }
    }

    // 4b: array ↔ año impreso en la rejilla (los años retirados no pueden seguir publicados)
    if (dir.anioVisible) {
      campos++;
      const esperado = ficha.fundada ? String(ficha.fundada) : null;
      if (esperado !== tarjeta.anio) {
        aviso(esperado === null
          ? `${ficha.id}: la tarjeta publica el año ${tarjeta.anio} y el array no lo trae (¿se retiró solo del array?)`
          : `${ficha.id}: el array dice fundada en ${esperado} y la tarjeta muestra ${tarjeta.anio || 'nada'}`);
      }
    }

    // 6: array ↔ badges de la rejilla. Nació el 13/08: al pasar Calambur a premio:false se
    // corrigieron el array y data-premio, y la tarjeta siguió luciendo «🏆 Premio propio».
    // El badge es lo único que el lector lee sin abrir la ficha, así que es el que más miente.
    for (const regla of dir.badges || []) {
      if (ficha[regla.campo] === undefined) continue;
      campos++;
      const debe = regla.valor(ficha[regla.campo]);
      const esta = regla.marca.test(tarjeta.badges);
      if (debe !== esta) {
        aviso(`${ficha.id} · badge ${regla.nombre}: la rejilla dice ${esta} y el array ${debe} (${regla.campo}=${JSON.stringify(ficha[regla.campo])})`);
      }
    }

    // 5: coherencia entre el interruptor y el texto que lo explica
    for (const regla of dir.coherencia || []) {
      const valor = ficha[regla.campo];
      const texto = decodificar(String(ficha[regla.texto] || ''));
      if (!texto) continue;
      campos++;
      if (regla.salvoQue && regla.salvoQue.test(texto)) continue;
      if (valor === regla.cuando && regla.contradice.test(texto)) {
        aviso(`${ficha.id} · ${regla.campo}=${JSON.stringify(valor)} contradice lo que dice ${regla.texto}:\n      ${texto.slice(0, 160)}`);
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
