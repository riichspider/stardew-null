// Item registry. Tools have `tool: true`. Seeds plant a crop. Crops are sellable.
// `icon` is an emoji used in HUD; the world rendering uses procedural sprites.

export const ITEMS = {
  // Tools (cannot be bought/sold; granted at start)
  hoe:        { id:'hoe',        name:'Enxada',     icon:'⛏️', tool:'hoe',     stack: 1, energy: 2 },
  watering:   { id:'watering',   name:'Regador',    icon:'🚿', tool:'watering',stack: 1, energy: 2, water: 0, waterMax: 40 },
  axe:        { id:'axe',        name:'Machado',    icon:'🪓', tool:'axe',     stack: 1, energy: 4 },
  pickaxe:    { id:'pickaxe',    name:'Picareta',   icon:'⚒️', tool:'pickaxe', stack: 1, energy: 4 },
  scythe:     { id:'scythe',     name:'Foice',      icon:'🌾', tool:'scythe',  stack: 1, energy: 1 },

  // Seeds
  parsnip_seed:     { id:'parsnip_seed',     name:'Sementes de Pastinaca', icon:'🌱', stack:99, buy: 20, sell: 5,  plants:'parsnip',     season:'spring' },
  potato_seed:      { id:'potato_seed',      name:'Sementes de Batata',    icon:'🌱', stack:99, buy: 50, sell: 12, plants:'potato',      season:'spring' },
  cauliflower_seed: { id:'cauliflower_seed', name:'Sementes de Couve-flor',icon:'🌱', stack:99, buy: 80, sell: 20, plants:'cauliflower', season:'spring' },
  melon_seed:       { id:'melon_seed',       name:'Sementes de Melão',     icon:'🌱', stack:99, buy: 80, sell: 20, plants:'melon',       season:'summer' },
  tomato_seed:      { id:'tomato_seed',      name:'Sementes de Tomate',    icon:'🌱', stack:99, buy: 50, sell: 12, plants:'tomato',      season:'summer' },
  pumpkin_seed:     { id:'pumpkin_seed',     name:'Sementes de Abóbora',   icon:'🌱', stack:99, buy: 100,sell: 25, plants:'pumpkin',     season:'fall' },
  corn_seed:        { id:'corn_seed',        name:'Sementes de Milho',     icon:'🌱', stack:99, buy: 150,sell: 38, plants:'corn',        season:'summer,fall' },

  // Harvested crops (sellable)
  parsnip:     { id:'parsnip',     name:'Pastinaca',   icon:'🥕', stack:99, sell: 35 },
  potato:      { id:'potato',      name:'Batata',      icon:'🥔', stack:99, sell: 80 },
  cauliflower: { id:'cauliflower', name:'Couve-flor',  icon:'🥦', stack:99, sell: 175 },
  melon:       { id:'melon',       name:'Melão',       icon:'🍈', stack:99, sell: 250 },
  tomato:      { id:'tomato',      name:'Tomate',      icon:'🍅', stack:99, sell: 60 },
  pumpkin:     { id:'pumpkin',     name:'Abóbora',     icon:'🎃', stack:99, sell: 320 },
  corn:        { id:'corn',        name:'Milho',       icon:'🌽', stack:99, sell: 50 },

  // Materials
  wood:  { id:'wood',  name:'Madeira', icon:'🪵', stack:99, sell: 4  },
  stone: { id:'stone', name:'Pedra',   icon:'🪨', stack:99, sell: 2  },
  hay:   { id:'hay',   name:'Feno',    icon:'🌾', stack:99, sell: 3  },
  fiber: { id:'fiber', name:'Fibra',   icon:'🍃', stack:99, sell: 2  },
};

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}

// Items shown in shop "buy" tab (filtered by season)
export const SHOP_BUY_LIST = [
  'parsnip_seed', 'potato_seed', 'cauliflower_seed',
  'melon_seed', 'tomato_seed',
  'pumpkin_seed',
  'corn_seed',
];
