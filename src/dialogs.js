// Dialog Tree System — conversas ramificadas com escolhas e evidências.
//
//DIÁLOGOS:
// - treeId: ID da árvore de diálogo
// - nodes: { nodeId: { text, choices?, requiresEvidence?, setFlag?, next? } }
//
// ESCOLHAS:
// - choice: texto exibido
// - requiresEvidence?: ID da evidência necessária (ou null para disponível)
// - next: nó destino
// - setFlag?: flag definida ao selecionar

import { isDialogUnlocked } from './evidence.js';
import { setFlag, getFlag } from './save.js';

// ---------- Dialog Trees ----------

export const DIALOGS = {
  // Talking to the witness NPC on the street
  witness_initial: {
    text: "Você é o detetive? Andava te procurando...",
    choices: [
      { text: " Quem é você?", next: 'witness_who' },
      { text: " O que você sabe?", next: 'witness_what', requiresEvidence: 'evidence_witness_card' },
    ],
  },
  witness_who: {
    text: "Eu vi tudo. Aquela noite. Mas eles estão me procurando.",
    choices: [
      { text: " Conte-me.", next: 'witness_tell' },
      { text: " Você está seguro aqui.", next: 'witness_safe' },
    ],
  },
  witness_what: {
    text: "Você tem o meu cartão? Achei que tinha perdido. O endereço no verso vai te ajudar.",
    setFlag: 'witness_revealed_address',
    next: 'witness_address',
  },
  witness_tell: {
    text: "Não posso falar aqui. Me encontre no bar, amanhã. Mas traga algo que prove quem você é.",
    setFlag: 'witness_bar_meeting',
    next: 'witness_bye',
  },
  witness_safe: {
    text: "Seguro? Essa cidade não é segura para ninguém. Agora sai, antes queeles vejam a gente juntos.",
    next: 'witness_bye',
  },
  witness_address: {
    text: "O endereço no cartão... é onde eles se reúnem. Beware.",
    next: 'witness_bye',
  },
  witness_bye: {
    text: "Vá. Antes que sejamos vistos.",
  },
};

// ---------- API ----------

export function getDialog(treeId) {
  const tree = DIALOGS[treeId];
  if (!tree) {
    console.warn('dialog: unknown tree', treeId);
    return null;
  }
  return tree;
}

export function startDialog(treeId, state) {
  const tree = getDialog(treeId);
  if (!tree) return null;
  
  // Check initial requiresEvidence
  if (tree.requiresEvidence && !isDialogUnlocked(tree.requiresEvidence)) {
    return null;
  }
  return tree;
}

export function selectChoice(choice, state) {
  if (choice.requiresEvidence && !isDialogUnlocked(choice.requiresEvidence)) {
    return null;
  }
  if (choice.setFlag) {
    setFlag(choice.setFlag, true);
  }
  if (choice.next) {
    return DIALOGS[choice.next];
  }
  return null;
}

export function advanceNode(node) {
  if (node.setFlag) {
    setFlag(node.setFlag, true);
  }
  if (node.next) {
    return DIALOGS[node.next] || null;
  }
  return null;
}

export function getAvailableChoices(node, state) {
  if (!node.choices) return [];
  return node.choices.filter(c => 
    !c.requiresEvidence || isDialogUnlocked(c.requiresEvidence)
  );
}