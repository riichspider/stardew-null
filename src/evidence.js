// Evidence System — colecionáveis que afetam diálogos e podem ser combinados.
//
// Evidências são itens especiais que:
// - Podem ser coletadas em hotspots do cenário
// - Podem ser combinadas para criar novas conclusões
// - Desbloqueiam opções em diálogos
// - Têm UI com tooltip/zoom no inventário

import { ITEMS, getItem } from './items.js';
import { addItem, removeFromSlot, totalQty } from './inventory.js';
import { toast } from './ui.js';
import { getFlag, setFlag } from './save.js';

// ---------- Registry ----------

// Evidências têm campos extras além de ITEMS padrão:
// - evidence: true — marca como evidência
// - description: string — texto exibido no tooltip
// - combinableWith: [{ id, result }] — combinations possíveis
// - revealsDialogs: [dialogId] — diálogos desbloqueados ao coletar
export const EVIDENCE = {
  evidence_photo_scene: {
    evidence: true,
    icon: '📸',
    name: 'Foto do Local',
    description: 'Uma foto Polaroid do beco onde o corpo foi encontrado. O flash captou algo que ninguém notou...',
    combinableWith: [
      { id: 'evidence_bloody_handprint', result: 'evidence_conclusion_1' },
    ],
    revealsDialogs: ['witness_questions'],
  },
  evidence_bloody_handprint: {
    evidence: true,
    icon: '🩸',
    name: 'Mancha de Sangue',
    description: 'Uma mancha de sangue no muro. Parece ter sido transferida, não spray...',
    combinableWith: [
      { id: 'evidence_photo_scene', result: 'evidence_conclusion_1' },
    ],
  },
  evidence_witness_card: {
    evidence: true,
    icon: '🪪',
    name: 'Cartão da Testemunha',
    description: 'Cartão de identificação de uma testemunha. O nome está borrado, mas o endereço é legível.',
    combinableWith: [],
    revealsDialogs: ['witness_location'],
  },
  evidence_diary_page: {
    evidence: true,
    icon: '📄',
    name: 'Página de Diário',
    description: 'Uma página arrancada de um caderno. A caligrafia é nervosa: "Eles me viram falar com o detetive..."',
    combinableWith: [],
    revealsDialogs: ['diary_revelation'],
  },
  // Conclusões = resultado da combinação
  evidence_conclusion_1: {
    evidence: true,
    icon: '🔍',
    name: 'Conclusão: Sangue e Foto',
    description: 'A foto mostra que a transferência de sangue aconteceu DEPOIS do flash. Alguém plantou a evidência?',
    combinableWith: [],
  },
};

// Alias para itêm registry
for (const [id, def] of Object.entries(EVIDENCE)) {
  ITEMS[id] = def;
}

// ---------- API ----------

export function registerEvidence(key, def) {
  EVIDENCE[key] = def;
  ITEMS[key] = def;
}

// Collect evidence from a hotspot
export function collectEvidence(state, evidenceId) {
  const def = EVIDENCE[evidenceId];
  if (!def) {
    console.warn('evidence: unknown', evidenceId);
    return false;
  }
  
  // Already collected this specific evidence? (more robust check)
  const collectedFlag = `collected_${evidenceId}`;
  if (getFlag(collectedFlag, false)) {
    toast(`Você já tem: ${def.name}`);
    return false;
  }
  
  // Already have it in inventory?
  if (totalQty(state.inventory, evidenceId) > 0) {
    toast(`Você já tem: ${def.name}`);
    return false;
  }
  
  const remaining = addItem(state.inventory, evidenceId, 1);
  if (remaining > 0) {
    toast('Inventário cheio!');
    return false;
  }
  
  toast(`➕ ${def.name}`);
  
  // Mark as collected to prevent duplicate pickup
  setFlag(collectedFlag, true);
  
  // Unlock dialogs
  if (def.revealsDialogs) {
    for (const dialogId of def.revealsDialogs) {
      setFlag(`dialog_unlocked_${dialogId}`, true);
    }
  }
  
  // Play pickup sound (placeholder)
  // Audio.effect('pickup') — falta áudio
  return true;
}

// Get available combination options for a slot
export function getAvailableCombinations(state, slotIdx) {
  const slot = state.inventory.slots[slotIdx];
  if (!slot) return [];
  
  const def = EVIDENCE[slot.id];
  if (!def || !def.combinableWith) return [];
  
  const combos = [];
  for (const combo of def.combinableWith) {
    // Check if player has the required evidence
    if (totalQty(state.inventory, combo.id) > 0) {
      combos.push({
        with: combo.id,
        result: combo.result,
        withDef: EVIDENCE[combo.id],
        resultDef: EVIDENCE[combo.result],
      });
    }
  }
  return combos;
}

// Attempt to combine two evidence items (returns { success, result } or null if invalid)
export function tryCombineEvidence(state, slotIdxA, slotIdxB) {
  const slotA = state.inventory.slots[slotIdxA];
  const slotB = state.inventory.slots[slotIdxB];
  
  if (!slotA || !slotB) return null;
  
  const defA = EVIDENCE[slotA.id];
  const defB = EVIDENCE[slotB.id];
  
  if (!defA || !defB) return null;
  
  // Try A → B combination
  if (defA.combinableWith) {
    const combo = defA.combinableWith.find(c => c.id === slotB.id);
    if (combo) {
      // Check for empty slot BEFORE removing items
      const hasSpace = state.inventory.slots.some(s => !s);
      if (!hasSpace) {
        toast('Sem espaço no inventário!');
        return { success: false, result: null };
      }
      removeFromSlot(state.inventory, slotIdxA, 1);
      removeFromSlot(state.inventory, slotIdxB, 1);
      addItem(state.inventory, combo.result, 1);
      const resultDef = EVIDENCE[combo.result];
      toast(`🔬 ${defA.name} + ${defB.name} = ${resultDef.name}`);
      return { success: true, result: combo.result };
    }
  }
  
  // Try B → A combination
  if (defB.combinableWith) {
    const combo = defB.combinableWith.find(c => c.id === slotA.id);
    if (combo) {
      // Check for empty slot BEFORE removing items
      const hasSpace = state.inventory.slots.some(s => !s);
      if (!hasSpace) {
        toast('Sem espaço no inventário!');
        return { success: false, result: null };
      }
      removeFromSlot(state.inventory, slotIdxA, 1);
      removeFromSlot(state.inventory, slotIdxB, 1);
      addItem(state.inventory, combo.result, 1);
      const resultDef = EVIDENCE[combo.result];
      toast(`🔬 ${defA.name} + ${defB.name} = ${resultDef.name}`);
      return { success: true, result: combo.result };
    }
  }
  
  return { success: false, result: null };
}

// Check if player has a specific evidence
export function hasEvidence(state, evidenceId) {
  return totalQty(state.inventory, evidenceId) > 0;
}

// Get all evidences player has
export function getPlayerEvidences(state) {
  const result = [];
  for (const slot of state.inventory.slots) {
    if (slot && EVIDENCE[slot.id]) {
      result.push({ id: slot.id, qty: slot.qty });
    }
  }
  return result;
}

// Check if dialog option should be shown based on evidence
export function isDialogUnlocked(dialogId) {
  return getFlag(`dialog_unlocked_${dialogId}`, false);
}