# Stardew Null

Um mini-jogo de fazenda inspirado em Stardew Valley, feito em **JavaScript puro** (sem frameworks, sem bundlers, sem assets externos). Tudo é desenhado proceduralmente em canvas — incluindo sprites, áudio e o mapa do mundo.

> Demo: <substitua-pelo-link-publico-quando-deploy-rodar>

## Como jogar

Abra `index.html` em qualquer servidor estático moderno (ou direto pelo navegador via `file://` na maioria dos browsers).

```bash
# Opção rápida: servidor estático com Python
python3 -m http.server 5173
# depois abra http://localhost:5173/
```

### Controles

| Tecla | Ação |
|------:|:-----|
| `WASD` / setas | andar |
| `Espaço` | usar ferramenta · interagir · avançar diálogo |
| `1`–`9` | selecionar slot da hotbar |
| `I` | abrir inventário |
| `ESC` | fechar menu |

## Mecânicas implementadas

- Mapa tile-based (50×32 tiles) com casa, loja, lago, floresta e fazenda
- Movimento 4-direcional com animação de caminhada
- Ferramentas: enxada, regador, machado, picareta, foice
- Cultivos: arar → plantar semente → regar → colher
- 7 culturas com estágios visuais e estações próprias (pastinaca, batata, couve-flor, melão, tomate, milho, abóbora)
- Regrow para tomate e milho
- Árvores corta-com-machado (3 acertos → 4 madeiras), pedras quebráveis (2 acertos → 2 pedras)
- Mato e tufos cortáveis com a foice (dropam fibra/feno)
- Inventário + hotbar com 27 slots, equipar com clique
- Loja com NPC (Pierre): comprar sementes da estação, vender colheitas
- Energia (gasta a cada ação) e desmaio se zerar / passar das 02h
- Ciclo dia/noite com tinta noturna progressiva
- Estações de 28 dias (primavera → verão → outono → inverno → ano+1)
- Save/load automático ao dormir (localStorage)
- HUD: relógio, dinheiro, energia, hotbar, clima
- SFX procedurais via WebAudio (sem assets externos)

## Arquitetura

```
stardew-clone/
├── index.html        # canvas + overlays HTML
├── styles.css        # HUD, menus
└── src/
    ├── main.js       # boot
    ├── game.js       # game loop + render
    ├── world.js      # mapa, tiles, objetos
    ├── player.js     # movimento, animação, mira
    ├── sprites.js    # sprites pixel-art proceduriais
    ├── items.js      # registro de itens
    ├── crops.js      # definições de cultivos
    ├── inventory.js  # hotbar + bag
    ├── ui.js         # HUD, diálogo, loja, inventário, sleep
    ├── audio.js      # SFX WebAudio
    ├── input.js      # teclado
    └── save.js       # localStorage
```

## Limitações conhecidas

Esse é um demo de uma sessão de algumas horas — **muito** menor que o Stardew Valley original (~5 anos de dev). Faltam: combate, mina, pesca, casamento, festivais, animais, interior da casa, multiplayer, balanceamento, e arte feita à mão. Mas o loop básico de fazenda funciona.

## Licença

MIT.
