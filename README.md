# Pixel Engine (ex-Stardew Null)

Esqueleto de jogo 2D em **JavaScript puro** (sem frameworks, sem bundlers, sem assets externos). Tudo é desenhado proceduralmente em canvas — sprites, áudio e o mapa do mundo. Originalmente um clone mini de Stardew Valley; agora foi reduzido a um motor genérico que vai virar um **RPG noir de investigação inspirado em Blade Runner**, em PRs incrementais.

> Demo ao vivo: https://stardew-clone-rfhmzkbr.devinapps.com

## Status atual

**Funcional hoje**

- Mapa tile-based (50×32 tiles) com grama, cerca, lago e caminho
- Movimento 4-direcional com animação de caminhada e sombra suave
- Ciclo dia/noite com tinta noturna progressiva (rollover automático às 02h)
- Inventário + hotbar (9 slots) com seleção via `1`–`9`
- HUD: relógio (Dia N — HH:MM), dinheiro, barra de energia
- Diálogo com NPC (placeholder, sem árvore de escolhas ainda)
- Save/load automático ao virar o dia (localStorage, chave `stardew-null:save:v2`)
- Árvores e pedras placeholder com cortar/quebrar (geram madeira/pedra)
- SFX procedurais via WebAudio
- Camera, render por Y-sort, action-target highlighter

**A construir (PRs futuros)**

- Árvore de diálogo com escolhas que mudam o estado do mundo
- Sistema de pistas / evidências / case file
- Gadgets de investigação (lanterna UV, scanner, gravador, taser)
- Lighting cinemático: chuva animada, neon, point lights, fog volumétrico
- Combate em tempo real (mira + uso de gadgets)
- Cidade noir gerada (quarteirões, becos, prédios com interior)

## Como rodar

Qualquer servidor estático moderno serve. Não há build step, dependências ou bundler.

```bash
npm start            # equivalente a: python3 -m http.server 5173
# ou diretamente:
python3 -m http.server 5173
```

Depois abra http://localhost:5173/.

```bash
npm run lint         # checa sintaxe de todos os módulos com `node --check`
```

### Controles

| Tecla | Ação |
|------:|:-----|
| `WASD` / setas | andar |
| `Espaço` | interagir · avançar diálogo |
| `1`–`9` | selecionar slot da hotbar |
| `I` | abrir inventário |
| `ESC` | fechar menu |

## Arquitetura

```
stardew-clone/
├── index.html        # canvas + overlays HTML (HUD, dialog, inventory, title)
├── styles.css        # estilo dos overlays
└── src/
    ├── main.js       # boot
    ├── config.js     # constantes de balance (mundo, tempo, energia, dinheiro)
    ├── game.js       # game loop, update, render, day/night, save/load orchestration
    ├── world.js      # mapa, tiles, objetos
    ├── player.js     # movimento, animação, target picking
    ├── sprites.js    # sprites pixel-art proceduriais
    ├── items.js      # registro de itens
    ├── inventory.js  # hotbar + bag
    ├── ui.js         # HUD, diálogo, inventário, title
    ├── audio.js      # SFX WebAudio
    ├── input.js      # teclado
    └── save.js       # localStorage
```

Para mudar tamanho do mundo, duração do dia, energia inicial, dinheiro inicial, etc., edite **`src/config.js`** — é o ponto único de tuning.

## Histórico

Esse repo nasceu como um mini-Stardew (PR #1). Depois passou por um cleanup (PR #3 — `config.js`, fix de path bloqueado por árvore, scripts npm). Agora está sendo gutado para virar engine-only (este PR) e seguir para o noir RPG nos PRs seguintes.

## Licença

MIT.
