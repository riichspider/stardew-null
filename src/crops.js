// Crop definitions: stages (visual), days per stage, harvested item, regrow.
// stages includes seedling -> ready stages.

export const CROPS = {
  parsnip:     { name:'Pastinaca',  stages: 4, daysPerStage: 1, item:'parsnip',     color:'#e8c98a', flower:'#fff' },
  potato:      { name:'Batata',     stages: 5, daysPerStage: 1, item:'potato',      color:'#a26a3a', flower:'#d6c0ff' },
  cauliflower: { name:'Couve-flor', stages: 6, daysPerStage: 2, item:'cauliflower', color:'#f6f0c2', flower:'#fff' },
  melon:       { name:'Melão',      stages: 6, daysPerStage: 2, item:'melon',       color:'#c8d770', flower:'#ffe' },
  tomato:      { name:'Tomate',     stages: 5, daysPerStage: 2, item:'tomato',      color:'#e84a3c', flower:'#fff', regrow: 4 },
  pumpkin:     { name:'Abóbora',    stages: 6, daysPerStage: 2, item:'pumpkin',     color:'#e88a30', flower:'#ffeb70' },
  corn:        { name:'Milho',      stages: 6, daysPerStage: 2, item:'corn',        color:'#ffe066', flower:'#ffeb70', regrow: 4 },
};

export function getCrop(id) {
  const c = CROPS[id];
  if (!c) throw new Error(`Unknown crop: ${id}`);
  return c;
}
