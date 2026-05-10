// Gadget System — ferramentas do detetive.
//
// GADGETS:
// - São itens ativáveis (clicáveis na hotbar)
// - Têm efeitos específicos em contextos bestimmten
// - Podem desbloquear evidências

import { ITEMS } from './items.js';
import { addItem, removeFromSlot, totalQty } from './inventory.js';
import { toast } from './ui.js';
import { setFlag, getFlag } from './save.js';

// ---------- Registry ----------

export const GADGETS = {
  gadget_lantern: {
    gadget: true,
    icon: '🔦',
    name: 'Lanterna UV',
    description: 'Luz UV revela coisas invisíveis. Use em áreas escuras.',
    revealsEvidence: 'evidence_bloody_handprint',
  },
  gadget_recorder: {
    gadget: true,
    icon: '🎤',
    name: 'Gravador',
    description: 'Grava interrogations. Use ao falar com NPCs.',
    autoRecord: true,
  },
  gadget_scanner: {
    gadget: true,
    icon: '📡',
    name: 'Scanner',
    description: 'Escaneia sinais eletrônicos próximos.',
  },
  gadget_taser: {
    gadget: true,
    icon: '⚡',
    name: 'Taser',
    description: 'Defesa pessoal. Use em emergências.',
  },
};

// Register in ITEMS
for (const [id, def] of Object.entries(GADGETS)) {
  ITEMS[id] = def;
}

// ---------- API ----------

export function useGadget(state, gadgetId) {
  const def = GADGETS[gadgetId];
  if (!def) {
    console.warn('gadget: unknown', gadgetId);
    return false;
  }
  
  // Lantern UV effect
  if (gadgetId === 'gadget_lantern') {
    return useLanternUV(state, def);
  }
  
  // Recorder effect
  if (gadgetId === 'gadget_recorder') {
    return useRecorder(state, def);
  }
  
  // Scanner effect
  if (gadgetId === 'gadget_scanner') {
    return useScanner(state, def);
  }
  
  // Taser effect (combat)
  if (gadgetId === 'gadget_taser') {
    return useTaser(state, def);
  }
  
  toast(`📦 ${def.name} — sem efeito aqui.`);
  return false;
}

function useLanternUV(state, def) {
  // Check if there's hidden evidence nearby
  const scene = state.sceneId;
  
  // In street01, UV reveals blood if player has photo but not blood yet
  if (scene === 'street01') {
    const hasPhoto = totalQty(state.inventory, 'evidence_photo_scene') > 0;
    const hasBlood = totalQty(state.inventory, 'evidence_bloody_handprint') > 0;
    
    if (hasPhoto && !hasBlood) {
      // Find blood hotspot is nearby
      const playerX = state.player.x;
      if (playerX >= 1150 && playerX <= 1250) {
        addItem(state.inventory, 'evidence_bloody_handprint', 1);
        toast('🔦 UV revelou algo!血迹!');
        setFlag('uv_revealed_blood', true);
        return true;
      }
    }
    
    toast('🔦 A luz UV não revela nada aqui.');
    return true;
  }
  
  toast('🔦 Não há nada para revelar.');
  return true;
}

function useRecorder(state, def) {
  // Records current conversation if talking to NPC
  const recording = getFlag('last_npc_talked');
  if (recording) {
    setFlag('recorded_' + recording, true);
    toast('🎤 Gravando conversa com ' + recording);
    return true;
  }
  
  toast('🎤 Aperte para gravar. Use próximo a um NPC.');
  return true;
}

function useScanner(state, def) {
  const scene = state.sceneId;
  
  // In street01, scanner picks up a signal near the bar
  if (scene === 'street01') {
    const playerX = state.player.x;
    if (playerX >= 1600 && playerX <= 1700) {
      toast('📡 Sinal detectado! Rádio aktiv. Origem: dentro do bar.');
      setFlag('scanner_bar_signal', true);
      return true;
    }
  }
  
  toast('📡 Nenhum sinal detectado.');
  return true;
}

function useTaser(state, def) {
  // Combat placeholder
  toast('⚡ Sem ameaça próxima.');
  return true;
}

// Check if player has gadget
export function hasGadget(state, gadgetId) {
  return totalQty(state.inventory, gadgetId) > 0;
}

// Get all gadgets
export function getPlayerGadgets(state) {
  const result = [];
  for (const slot of state.inventory.slots) {
    if (slot && GADGETS[slot.id]) {
      result.push({ id: slot.id, qty: slot.qty });
    }
  }
  return result;
}

// Check if current selected item is a gadget
export function selectedIsGadget(state) {
  const slot = state.inventory.slots[state.inventory.selected];
  return slot && GADGETS[slot.id] ? GADGETS[slot.id] : null;
}