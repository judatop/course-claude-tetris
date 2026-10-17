# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Tema claro / oscuro** con botón o tecla `T`; se guarda en `localStorage` y por defecto sigue `prefers-color-scheme`.

Además incluye mecánicas extra:

- **Sistema de Hold** (`C` o `Shift`): guarda la pieza actual o la intercambia con la reservada. Solo se puede usar una vez por pieza; mientras está bloqueado, el slot se ve atenuado.
- **Power-ups**: cada 5 líneas, una pieza de la cola trae una celda especial que se activa al fijarla:
  - ✹ **Bomba**: destruye un área de 3×3.
  - ↔/↕ **Rayo**: limpia una fila o una columna.
  - ◈ **Tinte**: el color más abundante se vuelve comodín; los comodines desaparecen en la siguiente limpieza y dan puntos extra.
  - ⇓ **Gravedad**: compacta los huecos.
  - ❄ **Congelar**: detiene la caída 5 segundos.
- **Piezas no estándar**:
  - Pentominós `+`, `U` e `Y` que aparecen de vez en cuando.
  - Pieza 1×1 de recompensa tras un Tetris.
  - Pieza 3×3 hueca como reto, desde el nivel 3.
- **Combos y bonus**:
  - Cada limpieza consecutiva aumenta el multiplicador (x2, x3, x4…).
  - Bonus por **T-spin**, **Back-to-Back** (×1.5) y **Perfect Clear** (+3000 × nivel).
  - Cada limpieza muestra textos flotantes, destellos y sonidos. La tecla `M` activa o silencia el sonido.
- **Habilidades cargables**: la barra de energía se llena limpiando líneas. Cuando está llena, `E` abre un selector (teclas `1`–`5`):
  1. Ver las siguientes 5 piezas durante 20 s.
  2. Intercambiar la pieza actual por otra al azar.
  3. Ralentizar el tiempo durante 10 s.
  4. Deshacer la última colocación.
  5. Hold libre: desbloquea el Hold para la pieza actual.
- **Modos de juego** (se eligen al iniciar):

  | Modo          | Regla                                         | Objetivo                       |
  | ------------- | --------------------------------------------- | ------------------------------ |
  | Clásico       | Partida infinita                              | —                              |
  | Sprint        | Límite de 2 minutos                           | 40 líneas                      |
  | Basura        | Sube una fila de basura cada 10 s             | Sobrevivir 3 minutos           |
  | Bloques fijos | El tablero empieza con bloques preubicados    | Eliminar todos los bloques fijos |
  | Invisible     | Las piezas desaparecen al tocar el suelo      | 20 líneas                      |
  | Inversión     | La rotación se invierte desde el nivel 3      | 30 líneas                      |

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `C` o `Shift` | Guardar / intercambiar pieza (Hold) |
| `E`       | Usar habilidad (con energía llena) |
| `1`–`5` / `Esc` | Elegir habilidad / cancelar |
| `P`       | Pausar / reanudar                 |
| `M`       | Activar / silenciar sonido        |
| `T`       | Alternar tema claro / oscuro      |

En el modo Inversión, a partir del nivel 3 la rotación pasa a ser antihoraria.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel izquierdo con `HOLD`, la barra de energía, el combo, el modo con su objetivo, el tiempo y los efectos activos.
- Un panel derecho con `SCORE`, `LINES`, `LEVEL` y la vista de la siguiente pieza. Con la habilidad activa, también muestra 4 piezas más.
- La lista de controles debajo del tablero.
- Un overlay con cuatro vistas: menú de modos, **PAUSA**, selector de habilidades y fin de partida (**GAME OVER** o **¡DESAFÍO SUPERADO!**).

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Cola de piezas** (`queue`): array de descriptores `{ type, power }` con al menos 5 elementos. `rollType()` decide si sale un tetrominó, un pentominó o la pieza hueca.
- **Power-ups** (`grantPower`, `applyPower`): se activan al fijar la pieza, antes de `clearLines()`.
- **Combos** (`clearLines(tspin)`): aplican el multiplicador de combo, el T-spin, el B2B, el Perfect Clear y los comodines.
- **Modos** (`MODES`, `checkObjectives`): el tiempo de partida (`gameTime`) solo avanza dentro del loop, así que la pausa no lo consume.

### Flujo del juego

```
carga → showMenu()  (overlay con los modos)
init(mode)
  ├─ createBoard() (+ seedFixedBlocks() en "Bloques fijos")
  ├─ fillQueue()
  ├─ spawn()                        → saca queue[0] a current y rellena la cola
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt en gameTime y dropAccum (no avanza con Congelar, más lento con Ralentizar)
     ├─ si dropAccum ≥ intervalo → baja la pieza o llama a lockPiece()
     ├─ modo Basura: cada 10 s addGarbageRow()
     ├─ checkObjectives() + updateStatus()
     ├─ draw()  (grid + tablero + ghost + pieza actual + efectos)
     └─ requestAnimationFrame(loop)

   lockPiece()
     → snapshot para deshacer → isTSpin() → merge() → applyPower() → clearLines() → spawn()

   keydown → mover / rotar / soft-drop / hard-drop / hold / habilidad / pausa / sonido / tema
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~1000 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta por tipo de celda (piezas, basura, fijos, comodín) | 15 colores |
| `POWER_EVERY`  | Líneas entre power-ups                   | `5`                   |
| `MODES`        | Reglas y objetivos de cada modo          | 6 modos               |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
