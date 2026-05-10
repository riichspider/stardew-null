# Pixel Engine — Noir (ex-Stardew Null)

Esqueleto de **RPG noir de investigação side-view** em JavaScript puro (sem frameworks, sem bundlers). Inspirado em Blade Runner / Backbone — pixel art usada para iluminação cinemática, foco em diálogo dinâmico e investigação.

Tudo é desenhado proceduralmente em canvas (sprites, áudio, cenas). PNGs hand-drawn opcionais podem ser dropados em `assets/` e o motor os usa no lugar dos procedurais — veja `assets/README.md`.

> Demo ao vivo: https://stardew-clone-rfhmzkbr.devinapps.com

## Histórico

Originalmente um clone mini de Stardew Valley (PR #1). Depois cleanup técnico (PR #3 — `config.js`, fix de path bloqueado, scripts npm). Depois gut completo de fazenda → engine genérica (PR #4). Agora pivotou para side-view noir (este PR).

## Status atual

**Funcional hoje**

- Renderização side-view com câmera horizontal e parallax em 5 camadas (sky → far skyline → mid buildings → street → foreground)
- Detetive side-profile com fedora + sobretudo + cigarro aceso (procedural, 24×32, 2 idle + 4 walk frames; flip horizontal para left-facing)
- Cena `street01` (2400 px de largura) com hotspots placeholder (porta de prédio, porta de bar)
- Movimento horizontal com clamp em walkable bounds; câmera seguindo player com clamp em `[0, sceneWidth - canvasW]`
- HUD: relógio (`Noite N — HH:MM`), dinheiro, barra de energia, hotbar
- Inventário, diálogo overlay, title screen — todos os overlays do gut
- Save/load automático em localStorage (`stardew-null:save:v3` — bumpou da v2 do gut)
- Asset loader (`src/assets.js`) que tenta carregar PNGs declarados no manifest e cai pro procedural quando ausente
- SFX WebAudio procedurais (framework, sem cues específicas ainda)

**A construir (PRs futuros, ordem provisória)**

- **PR #6** — lighting cinemático noir: chuva animada, neon piscando, point lights nos postes, fog volumétrico
- **PR #7** — sistema de cenas com transições (fade in/out entre `street01` → `apartment` → `bar`)
- **PR #8** — árvore de diálogo com escolhas que setam flags de mundo
- **PR #9** — pistas/evidências/case file
- **PR #10** — gadgets (lanterna UV, scanner, gravador, taser) + ação de investigar
- **PR #11** — combate em tempo real (mira + uso de gadgets)

## Como rodar

Qualquer servidor estático moderno serve. Sem build step.

```bash
npm start              # equivalente a: python3 -m http.server 5173
```

Depois abra http://localhost:5173/.

```bash
npm run lint           # checa sintaxe de todos os módulos com `node --check`
```

### Controles

| Tecla | Ação |
|------:|:-----|
| `A`/`D` ou `←`/`→` | andar pela rua (esquerda/direita) |
| `W`/`↑` | interagir com hotspot (porta, NPC, evidência) |
| `Espaço` | interagir · avançar diálogo |
| `1`–`9` | selecionar slot da hotbar |
| `I` | abrir inventário |
| `ESC` | fechar menu |

## Arquitetura

```
stardew-clone/
├── index.html         # canvas + overlays HTML (HUD, dialog, inventory, title)
├── styles.css         # estilo dos overlays
├── assets/            # PNGs hand-drawn opcionais (procedural fallback se vazio)
│   └── README.md      # convenções de slot, paleta, dimensões
└── src/
    ├── main.js        # boot (buildSprites + loadAssets em paralelo)
    ├── config.js      # constantes de balance + paleta noir
    ├── game.js        # loop, update, render side-view, save/load orchestration
    ├── scenes.js      # registry de cenas
    ├── scenes/
    │   └── street01.js  # primeira cena noir (rua, prédios, hotspots)
    ├── player.js      # movimento horizontal 2-direção, hotspot picking
    ├── sprites.js     # geradores procedurais (detetive, sky, prédios, calçada, fg)
    ├── assets.js      # loader de PNGs com fallback
    ├── items.js       # registro de itens (vazio até gadgets entrarem)
    ├── inventory.js   # hotbar + bag
    ├── ui.js          # HUD, diálogo, inventário, title
    ├── audio.js       # SFX WebAudio
    ├── input.js       # teclado
    └── save.js        # localStorage v3
```

Para mudar paleta, dimensões da cena, velocidade do player, duração do dia, etc., edite **`src/config.js`** — é o ponto único de tuning.

Para adicionar uma nova cena: criar `src/scenes/<id>.js` com width/groundY/walkable/layers/hotspots, registrar em `src/scenes.js`, e (opcional) dropar PNGs em `assets/scenes/<id>/` seguindo a convenção em `assets/README.md`.

## Licença

MIT.
