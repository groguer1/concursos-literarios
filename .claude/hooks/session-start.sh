#!/bin/bash
# Comprobaciones al abrir una sesion de Claude en este repositorio.
#
# El proyecto no tiene dependencias que instalar (no hay package.json): son ficheros
# estaticos y scripts de Node sueltos. Asi que este hook no instala nada, sino que
# ejecuta las comprobaciones que no necesitan internet, para que la sesion empiece
# sabiendo si el repositorio esta sano.
#
# Tarda menos de un segundo, asi que va en modo sincrono: no compensa la complejidad
# de lanzarlo en segundo plano.
#
# NUNCA sale con codigo distinto de 0: si algo esta roto, lo que hay que hacer es
# arreglarlo dentro de la sesion, no impedir que la sesion arranque.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

if ! command -v node > /dev/null 2>&1; then
  echo "Sin Node.js: no se han podido pasar las comprobaciones."
  exit 0
fi

echo "Comprobaciones del repositorio (scripts/comprobar-todo.js):"
if node scripts/comprobar-todo.js 2>&1; then
  echo ""
  echo "Recuerda: vuelve a ejecutar 'node scripts/comprobar-todo.js' ANTES de subir cambios."
else
  echo ""
  echo "HAY COMPROBACIONES EN ROJO. Estaban asi al abrir la sesion, antes de tocar nada."
  echo "Conviene arreglarlas o, al menos, no confundirlas con algo que se haya roto ahora."
fi

exit 0
