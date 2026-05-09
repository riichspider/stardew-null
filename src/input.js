// Keyboard + pointer input. Mouse-aim is optional; primary control is keyboard.
const keys = new Set();
const keysPressed = new Set(); // edge-triggered (consumed each frame)

const KEY_ALIASES = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'action',
  KeyE: 'interact',
  KeyI: 'inventory',
  Escape: 'escape',
  Enter: 'enter',
};

window.addEventListener('keydown', (e) => {
  const alias = KEY_ALIASES[e.code];
  if (alias) {
    if (!keys.has(alias)) keysPressed.add(alias);
    keys.add(alias);
    if (alias !== 'inventory' && alias !== 'escape') e.preventDefault();
  }
  // Number row 1-9 for hotbar
  if (/^Digit[1-9]$/.test(e.code)) {
    const slot = parseInt(e.code.slice(5), 10) - 1;
    keysPressed.add(`hotbar:${slot}`);
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const alias = KEY_ALIASES[e.code];
  if (alias) keys.delete(alias);
});

// prevent stuck keys when window loses focus
window.addEventListener('blur', () => {
  keys.clear();
});

export const Input = {
  isDown(name) { return keys.has(name); },
  consumePress(name) {
    if (keysPressed.has(name)) {
      keysPressed.delete(name);
      return true;
    }
    return false;
  },
  takeHotbarPress() {
    for (let i = 0; i < 9; i++) {
      if (keysPressed.has(`hotbar:${i}`)) {
        keysPressed.delete(`hotbar:${i}`);
        return i;
      }
    }
    return -1;
  },
  endFrame() {
    keysPressed.clear();
  },
};
