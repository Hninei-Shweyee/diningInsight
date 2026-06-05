
const sessions = new Map();

function freshState() {
  return {
    step: 'waiting_name',   // current step in the conversation flow
    name: null,
    phone: null,
    address: null,
    selectedCategory: null,
    selectedItem: null,
    itemPrice: null,
    quantity: null,
    payment: null,
    startedAt: Date.now(),
  };
}

function getState(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, freshState());
  }
  return sessions.get(userId);
}

function setState(userId, updates) {
  const current = getState(userId);
  sessions.set(userId, { ...current, ...updates });
}

function clearState(userId) {
  sessions.delete(userId);
}

module.exports = { getState, setState, clearState };
