# Análise do Projeto: Noir Detective Game

## 📁 Estrutura do Projeto

```
/stardew-null/
├── src/
│   ├── main.js          # Boot do jogo
│   ├── game.js         # Motor principal (Game class)
│   ├── config.js       # Constantes configuráveis
│   ├── player.js       # Movemento side-view
│   ├── input.js       # Controles de teclado
│   ├── inventory.js  # Sistema de inventário (27 slots)
│   ├── items.js      # Registry de itens (vazio, preenchido porEvidence/Gadgets)
│   ├── evidence.js  # Sistema de evidências (5 itens)
│   ├── dialogs.js   # Sistema de diálogos ramificados
│   ├── gadgets.js   # Sistema de gadgets (4 itens)
│   ├── save.js     # Persistence (localStorage)
│   ├── ui.js       # HUD + diálogos + inventário
│   ├── scenes/
│   │   ├── street01.js   # Primeira cena (parallax noir)
│   │   └── apartment01.js  # Apartamento do jogador
│   ├── cutscene.js      # Motor de cutscenes
│   ├── cutscene-director.js  # Dirección cinematic
│   ├── cutscene-shots.js    # Shots individuais
│   ├── cutscene-timeline.js # Timeline da cutscene de abertura
│   ├── lighting.js    #Iluminação noir (rain, neon, fog)
│   ├── sprites.js    # Sprites procedurais
│   └── assets.js     # Carregamento de assets
├── index.html
├── styles.css
└── README.md
```

---

## 🎮 Arquitetura do Jogo

### Motor Principal (game.js)
- **Game class**: orchestrador principal
  - `createInitialState()`: cria estado inicial com gadgets
  - `update(dt)`: loop de update
  - `render()`: rendering com parallax e lighting
  - `changeScene()`: transição entre cenas

### Estado do Jogo
```javascript
{
  sceneId: "street01",
  inventory: { slots: [], selected: 0 },
  player: { x, y, dir, moving },
  money: 500,
  energy: 100,
  day: 1,
  hour: 21,
  minute: 0
}
```

### Sistema de Hotspots
- `hotspots[]`: áreas interativas na cena
  - `{ id, x, w, label, action }`
  - Actions: `{ goto: "scene" }`, `"collect:id"`, `"talk:id"`, `"examine:name"`

### Sistema de NPCs
- `npcs[]`: personagens
  - `{ id, x, y, label, action }`
  - Interação: 50px de proximidade

---

## ✅ Funcionalidades Implementadas

### 1. Cutscene de Abertura
- 4-shot noir intro (logo → city → rain → door)
- Skippable com ESPAÇO/ENTER/ESC
- Flag `cutsceneSeen` persistida

### 2. Sistema de Evidências (evidence.js)
5 evidências colecionáveis:
| ID | Ícone | Nome | Combinável Com |
|---|---|---|---|
| `evidence_photo_scene` | 📸 | Foto do Local | `evidence_bloody_handprint` |
| `evidence_bloody_handprint` | 🩸 | Mancha de Sangue | `evidence_photo_scene` |
| `evidence_witness_card` | 🪪 | Cartão da Testemunha | - |
| `evidence_diary_page` | 📄 | Página de Diário | - |
| `evidence_conclusion_1` | 🔍 | Conclusão: Sangue e Foto | - |

- Coleta via hotspot: `action: "collect:evidence_id"`
- Combinação no inventário (click em evidence → click em outra)
- UI com tooltip (hover) e zoom (right-click)

### 3. Sistema de Diálogos (dialogs.js)
7 nós de diálogo:
```
witness_initial
  ├─ "Quem é você?" → witness_who
  │   ├─ "Conte-me." → witness_tell
  │   └─ "Você está seguro." → witness_safe
  │
  └─ "O que você sabe?" → witness_what (requer evidence_witness_card)
       └── witness_address (requer evidence_witness_card)
```
- Choices desbloqueadas baseado em evidências
- Flags setadas para estado do mundo

### 4. Sistema de Gadgets (gadgets.js)
4 gadgets dados no início:
| ID | Ícone | Função |
|---|---|---|
| `gadget_lantern` | 🔦 | Revela evidências ocultas (UV) |
| `gadget_recorder` | 🎤 | Grava conversas |
| `gadget_scanner` | 📡 | Detecta sinais |
| `gadget_taser` | ⚡ | Defesa (placeholder) |

- Ativação: selecionar + pressionar ESPAÇO/↑
- Efeitos em zonas específicas da cena

### 5. Sistema de Cenas
- Parallax 5 camadas (sky → far → mid → street → fg)
- Iluminação noir: rain, neon lights, fog
- Transições com fade

### 6. UI/HUD
- Relógio (Noite X — HH:MM)
- Dinheiro (💰)
- Energia (barra)
- Hotbar (1-9)
- Inventário (I) - 27 slots
- Diálogos com escolhas clicáveis

---

## 🎯 Como Testar / Jogar

### 1. Iniciar Servidor
```bash
cd /workspace/project/stardew-null
python3 -m http.server 8000
```

### 2. Abrir Navegador
http://localhost:8000

### 3. Controles
| Tecla | Ação |
|---|---|
| A/D ou ←/→ | Andar |
| ↑ ou W | Interagir (porta, NPC, evidência) |
| ESPAÇO | Interagir / Cutscene skip |
| I | Inventário |
| ESC | Fechar menu |
| 1-4 | Selecionar gadget |

### 4. Test Quick Guide
1. Começar (clique no botão)
2. ESPAÇO pular cutscene
3. Andar → X=400: press ↑ = coletar **Foto**
4. Andar → X=900: press ↑ = falar com **Testemunha**
5. Ver escolhas e evidências
6. Andar → X=1200: press ↑ = coletar **Mancha de Sangue**
7. No inventário: combinar Foto + Mancha = **Conclusão**
8. Selecionar **Lanterna UV** (1): ESPAÇO na área X=1200
9. Selecionar **Scanner** (3): ESPAÇO na área X=1650 (bar)

---

## 🐛 Possíveis Issues Conhecidas

1. **Imagens não carregam**: fallback para sprites procedurais (esperado)
2. **Áudio não funciona**: placeholder (falta implementasi audio)
3. **NPC não visível**: usa retângulo cinza (precisa sprite)
4. **Evidências precisam de polimento UI**: básico por enquanto

---

## 📌 Referências

- **Repo**: https://github.com/riichspider/stardew-null
- **PR Atual**: https://github.com/riichspider/stardew-null/pull/14 (Draft)
- **Branch**: `devin/1778414534-space-key-plays-cutscene`

---

## 🤖 Prompt para Claude

Quer анализируй:

1. **Qualidade do código** - padrões, estrutura
2. **Segurança** - XSS, validação
3. **Performance** - rendering, loops
4. **Manutenibilidade** - código legível
5. **Melhorias sugeridas** - next steps
6. **Bugs potenciais** - edge cases
7. **arquitetura geral** - desacoplamento

Me dá um relatório completo!