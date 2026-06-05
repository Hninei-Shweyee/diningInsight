import { neon } from '@neondatabase/serverless';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const sql = neon(env.DATABASE_URL);
    const RESTAURANT_ID = env.RESTAURANT_ID || 'ttVU1DGA30aslTvyaf3g1Z6pwNh1';

    try {
      if (request.method === 'GET' && (path === '/menu' || path === '/menu/json')) {
        const rows = await sql`
          SELECT id, name, category, price, image_url, is_special
          FROM menu_items
          WHERE restaurant_id = ${RESTAURANT_ID}
          AND is_available = true
          ORDER BY category, name
        `;

        const grouped = {};
        for (const row of rows) {
          const cat = row.category || 'Other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({ id: row.id, name: row.name, price: parseFloat(row.price), image_url: row.image_url, is_special: row.is_special });
        }

        return new Response(JSON.stringify(grouped), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && path === '/menu/text') {
        const rows = await sql`
          SELECT id, name, category, price, image_url, is_special
          FROM menu_items
          WHERE restaurant_id = ${RESTAURANT_ID}
          AND is_available = true
          ORDER BY category, name
        `;

        const grouped = {};
        for (const row of rows) {
          const cat = row.category || 'Other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(row);
        }

        let text = "🍽️ DINING INSIGHT - OUR MENU\n\n";
        for (const [category, items] of Object.entries(grouped)) {
          text += `${category.toUpperCase()}\n`;
          items.forEach((item, i) => {
            const special = item.is_special ? ' 🔥 SPECIAL' : '';
            text += `${i + 1}. ${item.name}${special} - ${parseFloat(item.price).toLocaleString()} THB\n`;
          });
          text += '\n';
        }        
        text += 'Just tell me what you would like to order! 😊';

        return new Response(text, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      if (request.method === 'POST' && path === '/order') {
        const body = await request.json();
        const { messenger_id, customer_name, phone, address, payment_method, items } = body;

        if (!messenger_id || !customer_name || !phone || !address || !payment_method || !items?.length) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const existing = await sql`
          SELECT id FROM customers WHERE messenger_id = ${messenger_id} AND restaurant_id = ${RESTAURANT_ID}
        `;

        let customerId;
        if (existing.length > 0) {
          customerId = existing[0].id;
          await sql`
            UPDATE customers SET name = ${customer_name}, phone = ${phone}, address = ${address}, created_at = NOW()
            WHERE id = ${customerId}
          `;
        } else {
          const result = await sql`
            INSERT INTO customers (restaurant_id, messenger_id, name, phone, address, created_at)
            VALUES (${RESTAURANT_ID}, ${messenger_id}, ${customer_name}, ${phone}, ${address}, NOW())
            RETURNING id
          `;
          customerId = result[0].id;
        }

        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderResult = await sql`
          INSERT INTO orders (restaurant_id, customer_id, total_price, payment_method, status, ordered_at)
          VALUES (${RESTAURANT_ID}, ${customerId}, ${totalPrice}, ${payment_method}, 'pending', NOW())
          RETURNING id
        `;
        const orderId = orderResult[0].id;

        for (const item of items) {
          const subtotal = item.price * item.quantity;
          await sql`
            INSERT INTO order_items (order_id, item_name, quantity, price, subtotal)
            VALUES (${orderId}, ${item.name}, ${item.quantity}, ${item.price}, ${subtotal})
          `;
        }

        return new Response(JSON.stringify({
          success: true, order_id: orderId, customer_id: customerId,
          total_price: totalPrice.toLocaleString(), status: 'pending',
          message: `✅ Order #${orderId} confirmed! Total: ${totalPrice.toLocaleString()} THB. Payment: ${payment_method}.`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (path === '/health' || path === '/') {
        const dbTest = await sql`SELECT NOW() as current_time`;
        return new Response(JSON.stringify({
          status: 'ok', service: 'Dining Insight Chatbot',
          database: 'connected', server_time: dbTest[0]?.current_time,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};