
const CATEGORIES = ['Burger', 'Fried Chicken', 'Drinks', 'Combo'];

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

function getItemsByCategory(category) {
  return MENU[category] || [];
}

module.exports = { CATEGORIES, MENU, getItemsByCategory };
