const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// --------------------
// HEALTH CHECK
// --------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Chowly API is running",
  });
});


// --------------------
// MENU
// --------------------

app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        type,
        price,
        preparation_time_mins,
        image_url,
        popular
      FROM menu_items
      WHERE available = TRUE
      ORDER BY id
    `);

    res.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not load menu",
    });
  }
});


// --------------------
// STAFF
// --------------------

app.get("/api/staff", async (req, res) => {
  try {
    const waiters = await pool.query(`
      SELECT id, name, shift
      FROM waiters
      WHERE status = 'Active'
      ORDER BY id
    `);

    const chefs = await pool.query(`
      SELECT id, name, specialty
      FROM chefs
      WHERE status = 'Active'
      ORDER BY id
    `);

    const bartenders = await pool.query(`
      SELECT id, name
      FROM bartenders
      WHERE status = 'Active'
      ORDER BY id
    `);

    res.json({
      success: true,
      waiters: waiters.rows,
      chefs: chefs.rows,
      bartenders: bartenders.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not load staff",
    });
  }
});


// --------------------
// GET ALL ORDERS
// --------------------

app.get("/api/orders", async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT
        o.id,
        o.created_at,
        o.wait_time_mins,
        o.status,
        o.special_request,
        o.paid,

        c.name AS customer_name,

        w.name AS waiter_name,
        ch.name AS chef_name,
        b.name AS bartender_name

      FROM orders o

      JOIN customers c
        ON o.customer_id = c.id

      LEFT JOIN waiters w
        ON o.waiter_id = w.id

      LEFT JOIN chefs ch
        ON o.chef_id = ch.id

      LEFT JOIN bartenders b
        ON o.bartender_id = b.id

      ORDER BY o.created_at DESC
    `);

    const orders = [];

    for (const order of ordersResult.rows) {
      const itemsResult = await pool.query(`
        SELECT
          oi.quantity,
          oi.unit_price,
          oi.subtotal,
          mi.name,
          mi.type,
          mi.image_url
        FROM order_items oi
        JOIN menu_items mi
          ON oi.menu_item_id = mi.id
        WHERE oi.order_id = $1
      `, [order.id]);

      const complaintsResult = await pool.query(`
        SELECT id, description, status, created_at
        FROM complaints
        WHERE order_id = $1
        ORDER BY created_at DESC
      `, [order.id]);

      const ratingsResult = await pool.query(`
        SELECT id, score, comment, created_at
        FROM ratings
        WHERE order_id = $1
        ORDER BY created_at DESC
      `, [order.id]);

      const paymentResult = await pool.query(`
        SELECT
          id,
          amount,
          payment_method,
          status,
          created_at
        FROM payments
        WHERE order_id = $1
        LIMIT 1
      `, [order.id]);

      orders.push({
        ...order,
        items: itemsResult.rows,
        complaints: complaintsResult.rows,
        ratings: ratingsResult.rows,
        payment: paymentResult.rows[0] || null,
      });
    }

    res.json({
      success: true,
      orders,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not load orders",
    });
  }
});


// --------------------
// PLACE AN ORDER
// --------------------

app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customerName,
      customerEmail,
      specialRequest,
      items,
    } = req.body;

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer name and order items are required",
      });
    }

    await client.query("BEGIN");

    // Create customer
    const customerResult = await client.query(`
      INSERT INTO customers (name, email)
      VALUES ($1, $2)
      RETURNING id
    `, [
      customerName,
      customerEmail || null,
    ]);

    const customerId = customerResult.rows[0].id;

    // Get waiter
    const waiterResult = await client.query(`
      SELECT id
      FROM waiters
      WHERE status = 'Active'
      ORDER BY id
      LIMIT 1
    `);

    const waiterId =
      waiterResult.rows.length > 0
        ? waiterResult.rows[0].id
        : null;

    // Find menu information
    const itemIds = items.map((item) => item.menuItemId);

    const menuResult = await client.query(`
      SELECT
        id,
        price,
        preparation_time_mins
      FROM menu_items
      WHERE id = ANY($1::int[])
    `, [itemIds]);

    if (menuResult.rows.length !== itemIds.length) {
      throw new Error("One or more menu items were not found");
    }

    // Waiting time = longest item preparation time
    const waitTime = Math.max(
      ...menuResult.rows.map(
        (item) => item.preparation_time_mins
      )
    );

    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (
        wait_time_mins,
        status,
        special_request,
        customer_id,
        waiter_id,
        restaurant_id
      )

      VALUES (
        $1,
        'Pending',
        $2,
        $3,
        $4,
        1
      )

      RETURNING *
    `, [
      waitTime,
      specialRequest || null,
      customerId,
      waiterId,
    ]);

    const order = orderResult.rows[0];

    // Add order items
    for (const selectedItem of items) {
      const menuItem = menuResult.rows.find(
        (menu) =>
          menu.id === selectedItem.menuItemId
      );

      const quantity =
        Number(selectedItem.quantity) || 1;

      const price =
        Number(menuItem.price);

      const subtotal =
        price * quantity;

      await client.query(`
        INSERT INTO order_items (
          order_id,
          menu_item_id,
          unit_price,
          quantity,
          subtotal
        )

        VALUES ($1, $2, $3, $4, $5)
      `, [
        order.id,
        menuItem.id,
        price,
        quantity,
        subtotal,
      ]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not place order",
    });

  } finally {
    client.release();
  }
});


// --------------------
// WAITER UPDATES ORDER
// --------------------

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    const {
      chefId,
      bartenderId,
      status,
    } = req.body;

    const result = await pool.query(`
      UPDATE orders

      SET
        chef_id =
          COALESCE($1, chef_id),

        bartender_id =
          COALESCE($2, bartender_id),

        status =
          COALESCE($3, status)

      WHERE id = $4

      RETURNING *
    `, [
      chefId || null,
      bartenderId || null,
      status || null,
      orderId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      message: "Order updated",
      order: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not update order",
    });
  }
});


// --------------------
// COMPLAINT
// --------------------

app.post("/api/orders/:id/complaints", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Complaint description is required",
      });
    }

    const result = await pool.query(`
      INSERT INTO complaints (
        description,
        order_id
      )

      VALUES ($1, $2)

      RETURNING *
    `, [
      description,
      orderId,
    ]);

    res.status(201).json({
      success: true,
      complaint: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not save complaint",
    });
  }
});


// --------------------
// RATING
// --------------------

app.post("/api/orders/:id/ratings", async (req, res) => {
  try {
    const orderId = req.params.id;

    const {
      score,
      comment,
    } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const result = await pool.query(`
      INSERT INTO ratings (
        score,
        comment,
        order_id
      )

      VALUES ($1, $2, $3)

      RETURNING *
    `, [
      score,
      comment || null,
      orderId,
    ]);

    res.status(201).json({
      success: true,
      rating: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not save rating",
    });
  }
});


// --------------------
// PRETEND PAYMENT
// --------------------

app.post("/api/orders/:id/payment", async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = req.params.id;

    const {
      paymentMethod,
    } = req.body;

    await client.query("BEGIN");

    const amountResult = await client.query(`
      SELECT
        COALESCE(
          SUM(subtotal),
          0
        ) AS total
      FROM order_items
      WHERE order_id = $1
    `, [orderId]);

    const amount =
      Number(amountResult.rows[0].total);

    const paymentResult = await client.query(`
      INSERT INTO payments (
        amount,
        payment_method,
        status,
        order_id
      )

      VALUES (
        $1,
        $2,
        'Successful',
        $3
      )

      RETURNING *
    `, [
      amount,
      paymentMethod || "Card",
      orderId,
    ]);

    await client.query(`
      UPDATE orders

      SET
        paid = TRUE,
        status = 'Paid'

      WHERE id = $1
    `, [orderId]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message:
        "Pretend payment recorded successfully",
      payment: paymentResult.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not record payment",
    });

  } finally {
    client.release();
  }
});


app.listen(PORT, () => {
  console.log(
    `Chowly server running on http://localhost:${PORT}`
  );
});