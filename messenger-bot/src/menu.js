// menu.js — Static menu data for DiningInsight restaurant
// Edit this file to add/remove/change menu items and categories

const CATEGORIES = ['Burger', 'Fried Chicken', 'Drinks', 'Combo'];

// Full menu data: each category maps to an array of { name, price } objects
const MENU = {
  'Burger': [
    { name: 'Classic Burger', price: 89 },
    { name: 'Double Burger',  price: 129 },
    { name: 'Cheese Burger',  price: 109 },
  ],
  'Fried Chicken': [
    { name: 'Crispy Chicken', price: 79 },
    { name: 'Spicy Chicken',  price: 79 },
    { name: 'Chicken Strips', price: 69 },
  ],
  'Drinks': [
    { name: 'Cola',         price: 35 },
    { name: 'Water',        price: 15 },
    { name: 'Orange Juice', price: 45 },
    { name: 'Green Tea',    price: 40 },
  ],
  'Combo': [
    { name: 'Burger + Cola',       price: 109 },
    { name: 'Chicken + Cola',      price: 99 },
    { name: 'Double Burger + OJ',  price: 159 },
  ],
};

/**
 * Returns the list of items for a given category.
 * Returns an empty array if the category does not exist.
 * @param {string} category - e.g. 'Burger'
 * @returns {{ name: string, price: number }[]}
 */
function getItemsByCategory(category) {
  return MENU[category] || [];
}

module.exports = { CATEGORIES, MENU, getItemsByCategory };
