// api.js — FastAPI integration
// Sends completed orders to the FastAPI backend and fetches the dynamic menu.

const axios = require('axios');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Sends the completed order to the FastAPI backend.
 * FastAPI saves it to PostgreSQL and returns the real order ID.
 * @param {object} orderData - The complete order object from flow.js
 * @returns {Promise<{ success: boolean, order_id: number }>}
 */
async function sendOrderToAPI(orderData) {
  try {
    const response = await axios.post(
      `${FASTAPI_URL}/orders`,
      orderData,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[API] Order saved to DB:', response.data);
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || error.message;
    console.error('[API] Failed to save order:', detail);
    // Return mock success so the customer still gets a confirmation message
    return { success: false, order_id: null };
  }
}

/**
 * Fetches the live menu from FastAPI (backed by PostgreSQL).
 * Returns items grouped by category — same shape as the old static menu.js.
 * @returns {Promise<{ [category]: [{ name, price }] }>}
 */
async function fetchMenuFromAPI() {
  try {
    const restaurantId = process.env.RESTAURANT_ID;
    const response = await axios.get(`${FASTAPI_URL}/menu/public?restaurant_id=${restaurantId}&available_only=true`);
    // Group flat list into { category: [items] }
    const grouped = {};
    for (const item of response.data) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({ name: item.name, price: item.price, image_url: item.image_url || null });
    }
    return grouped;
  } catch (error) {
    console.error('[API] Failed to fetch menu, using fallback:', error.message);
    return null; // caller falls back to static menu
  }
}

module.exports = { sendOrderToAPI, fetchMenuFromAPI };
