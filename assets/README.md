# Assets

Esta pasta é onde você dropa os PNGs hand-drawn que devem **substituir** os sprites procedurais do motor. O carregador (`src/assets.js`) tenta `fetch()` cada arquivo declarado no manifest; se o arquivo não existe, o motor cai de volta no canvas procedural — então **a pasta vazia ainda funciona**, e você pode adicionar PNGs incrementalmente.

## Convenções

- Formato: PNG (transparência suportada). Sem JPG, GIF ou SVG por enquanto.
- Pixel art: salve com **nearest-neighbor**, sem antialiasing. O canvas do jogo já está com `imageSmoothingEnabled = false`, então qualquer escala do navegador preserva o look pixelado.
- Origem: top-left, igual ao canvas (`drawImage(img, x, y)`).
- Paleta sugerida (definida em `src/config.js`):
  - Sky: `#0a0a14` → `#1a1030` → `#2a1840`
  - Neon: rosa `#ff3a8c`, ciano `#3afff0`, âmbar `#ffaa3a`, vermelho `#ff2244`
  - Concreto/asfalto: `#1a1a22` → `#2c2c34`
  - Skin/sobretudo: tons dessaturados (`#3a3a44`, `#5a4a3a`)

## Slots disponíveis

### Player (detetive)

Side-profile, 24×32 px (ou múltiplo proporcional). Vira automaticamente no eixo Y quando o player anda pra esquerda — só desenhe **olhando para a direita**.

| Arquivo | Descrição |
|---|---|
| `sprites/detective_idle_0.png` | Idle frame 1 (respirando) |
| `sprites/detective_idle_1.png` | Idle frame 2 (cigarro tremendo) |
| `sprites/detective_walk_0.png` | Walk frame 1 (passo direito) |
| `sprites/detective_walk_1.png` | Walk frame 2 (passagem neutra) |
| `sprites/detective_walk_2.png` | Walk frame 3 (passo esquerdo) |
| `sprites/detective_walk_3.png` | Walk frame 4 (passagem neutra) |

### Scene `street01`

A cena é um corredor horizontal de **2400 px de largura** × **640 px de altura**, montado em camadas com paralaxe. Cada camada é uma imagem com largura ≥ 2400 px (ou um tile horizontal repetível — declare `repeat: true` no manifest se for tile).

| Arquivo | Camada | Paralaxe | Tamanho sugerido |
|---|---|---|---|
| `scenes/street01/sky.png` | Sky / lua | 0.10 | 2400×640 (ou 1280×640 com repeat) |
| `scenes/street01/far.png` | Skyline distante (silhuetas de prédios + luzes) | 0.40 | 2400×640 |
| `scenes/street01/mid.png` | Prédios midground com janelas/neon | 0.80 | 2400×640 |
| `scenes/street01/street.png` | Calçada/rua (chão onde o player anda) | 1.00 | 2400×640 |
| `scenes/street01/fg.png` | Foreground (postes, hidrantes, occlusion) | 1.20 | 2400×640 com transparência |

> **Importante:** o motor desenha cada layer offset por `-cameraX * parallax`. A `street.png` (parallax 1.0) deve conter o chão visualmente onde o player vai pisar — ajuste `groundY` em `src/scenes/street01.js` para casar.

## Como o motor decide

No boot, `src/main.js` chama `await loadAssets()`. Pra cada slot:

1. Se o PNG existe e carrega sem erro → o motor usa a imagem hand-drawn.
2. Se o PNG não existe (404) ou falha → o motor desenha proceduralmente pelo gerador equivalente em `src/sprites.js`.

Você pode dropar **um único arquivo de cada vez** e ir testando — a integração é incremental.

## Adicionando novas cenas

1. Crie `assets/scenes/<scene_id>/` com os mesmos 5 layers (sky, far, mid, street, fg).
2. Crie `src/scenes/<scene_id>.js` declarando largura, groundY, walkable bounds, hotspots e (opcional) NPCs.
3. Adicione o slot no manifest em `src/assets.js`.
4. Registre a cena em `src/scenes.js` (`SCENES.<scene_id> = ...`).
