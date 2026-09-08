#!/usr/bin/env node
/**
 * Todas las comprobaciones que NO necesitan salir a internet, de una vez.
 *
 * Es lo que hay que ejecutar antes de subir cualquier cambio, y lo que lanza solo el
 * hook de arranque de Claude (.claude/hooks/session-start.sh). Tarda menos de un
 * segundo, así que no hay excusa para saltárselo.
 *
 * Lo que NO entra aquí es comprobar-enlaces.js, porque necesita internet y tarda
 * minutos: ese va aparte, semanalmente, en su propio workflow.
 *
 * Uso:  node scripts/comprobar-todo.js
 * Sale con código 1 si algo falla.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const PRUEBAS = [
  {
    nombre: 'Sintaxis de los scripts',
    // node --check no ejecuta nada: solo comprueba que el fichero parsea. Barato y
    // atrapa el error tonto de haber dejado un paréntesis a medias.
    ejecutar: () => {
      const dirs = ['scripts', 'scripts/lib', 'scripts/pruebas'];
      const ficheros = dirs.flatMap(d => {
        const abs = path.join(RAIZ, d);
        if (!fs.existsSync(abs)) return [];
        return fs.readdirSync(abs).filter(f => f.endsWith('.js')).map(f => path.join(d, f));
      });
      for (const f of ficheros) execFileSync('node', ['--check', path.join(RAIZ, f)]);
      return ficheros.length + ' ficheros';
    },
  },
  {
    nombre: 'Los JSON de datos son válidos',
    // Si concursos.json se corrompe, la portada se queda sin listado. Es barato mirarlo.
    ejecutar: () => {
      const ficheros = ['concursos.json', 'concursos-fijos.json', 'publicidad.json'];
      for (const f of ficheros) JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
      return ficheros.length + ' ficheros';
    },
  },
  {
    nombre: 'Sincronía de las fichas de los directorios',
    // Las seis capas de cada ficha tienen que decir lo mismo. Ver CLAUDE.md.
    ejecutar: () => {
      const salida = execFileSync('node', [path.join(RAIZ, 'scripts/comprobar-sincronia.js')], { encoding: 'utf8' });
      return (salida.trim().split('\n').pop() || '').trim();
    },
  },
  {
    nombre: 'Pruebas del comprobador de enlaces',
    ejecutar: () => {
      const salida = execFileSync('node', [path.join(RAIZ, 'scripts/pruebas/comprobar-enlaces.test.js')], { encoding: 'utf8' });
      return (salida.trim().split('\n').pop() || '').trim();
    },
  },
];

let fallos = 0;
for (const prueba of PRUEBAS) {
  try {
    const detalle = prueba.ejecutar();
    console.log('  ok   ' + prueba.nombre + (detalle ? ' — ' + detalle : ''));
  } catch (e) {
    fallos++;
    console.log('  MAL  ' + prueba.nombre);
    const texto = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n').trim();
    console.log(texto.split('\n').map(l => '         ' + l).join('\n'));
  }
}

console.log(fallos ? '\n' + fallos + ' comprobación(es) fallan' : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
