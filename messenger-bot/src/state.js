// state.js — In-memory session storage per Messenger user
// Uses a JavaScript Map: key = messenger_id (string), value = session object
// NOTE: All data is lost when the server restarts. Replace with Redis/DB for production.

const sessions = new Map();

/**
 * Returns a fresh, empty session object.
 * Called whenever a new conversation starts (or is reset).
 * @returns {object}
 */
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

/**
 * Gets the session for a user. Creates a new one if it doesn't exist yet.
 * @param {string} userId - Messenger sender ID
 * @returns {object} The current session object
 */
function getState(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, freshState());
  }
  return sessions.get(userId);
}

/**
 * Merges the given updates into the user's session.
 * @param {string} userId - Messenger sender ID
 * @param {object} updates - Key/value pairs to update in the session
 */
function setState(userId, updates) {
  const current = getState(userId);
  sessions.set(userId, { ...current, ...updates });
}

/**
 * Deletes a user's session, effectively resetting their conversation.
 * The next call to getState() will create a fresh session.
 * @param {string} userId - Messenger sender ID
 */
function clearState(userId) {
  sessions.delete(userId);
}

module.exports = { getState, setState, clearState };
