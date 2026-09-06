import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000/api";

export default function App() {
  const [role, setRole] = useState("customer");
  const [page, setPage] = useState("menu");

  const [menu, setMenu] = useState([]);
  const [staff, setStaff] = useState({
    waiters: [],
    chefs: [],
    bartenders: [],
  });

  const [orders, setOrders] = useState([]);

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [customerName, setCustomerName] =
    useState("Demo Customer");

  const [customerEmail, setCustomerEmail] =
    useState("demo@chowly.ng");

  const [specialRequest, setSpecialRequest] =
    useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);

      await Promise.all([
        loadMenu(),
        loadStaff(),
        loadOrders(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMenu() {
    const response = await fetch(`${API}/menu`);
    const data = await response.json();

    if (data.success) {
      setMenu(data.items);
    }
  }

  async function loadStaff() {
    const response = await fetch(`${API}/staff`);
    const data = await response.json();

    if (data.success) {
      setStaff({
        waiters: data.waiters,
        chefs: data.chefs,
        bartenders: data.bartenders,
      });
    }
  }

  async function loadOrders() {
    const response = await fetch(`${API}/orders`);
    const data = await response.json();

    if (data.success) {
      setOrders(data.orders);
    }
  }

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesFilter =
        filter === "All" || item.type === filter;

      const text = search.toLowerCase();

      const matchesSearch =
        item.name.toLowerCase().includes(text) ||
        item.type.toLowerCase().includes(text);

      return matchesFilter && matchesSearch;
    });
  }, [menu, filter, search]);

  const popularItems = useMemo(() => {
    return filteredMenu
      .filter((item) => item.popular)
      .slice(0, 3);
  }, [filteredMenu]);

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...current,
        {
          ...item,
          quantity: 1,
        },
      ];
    });

    setCartOpen(true);
  }

  function changeQuantity(id, amount) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity + amount,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) * item.quantity,
    0
  );

  const waitTime =
    cart.length > 0
      ? Math.max(
          ...cart.map(
            (item) =>
              item.preparation_time_mins
          )
        )
      : 0;

  async function placeOrder() {
    if (!customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const response = await fetch(`${API}/orders`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        customerName,
        customerEmail,
        specialRequest,

        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Could not place order.");
      return;
    }

    setCart([]);
    setSpecialRequest("");
    setCartOpen(false);

    await loadOrders();

    setPage("orders");

    alert(
      `Order placed successfully.\nEstimated waiting time: ${data.order.wait_time_mins} minutes`
    );
  }

  async function updateOrder(
    orderId,
    field,
    value
  ) {
    const body = {};

    if (field === "chef") {
      body.chefId = Number(value);
    }

    if (field === "bartender") {
      body.bartenderId = Number(value);
    }

    if (field === "status") {
      body.status = value;
    }

    await fetch(`${API}/orders/${orderId}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    });

    await loadOrders();
  }

  async function submitComplaint(orderId) {
    const description = window.prompt(
      "What went wrong with this order?"
    );

    if (!description) return;

    await fetch(
      `${API}/orders/${orderId}/complaints`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          description,
        }),
      }
    );

    await loadOrders();
  }

  async function submitRating(orderId) {
    const rawScore = window.prompt(
      "Rate this order from 1 to 5"
    );

    if (!rawScore) return;

    const score = Number(rawScore);

    if (score < 1 || score > 5) {
      alert("Rating must be between 1 and 5.");
      return;
    }

    const comment =
      window.prompt(
        "Add a comment about your experience"
      ) || "";

    await fetch(
      `${API}/orders/${orderId}/ratings`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          score,
          comment,
        }),
      }
    );

    await loadOrders();
  }

  async function payForOrder(orderId) {
    const confirmed = window.confirm(
      "This is a payment for demonstration only. No real money will be charged.\n\nContinue?"
    );

    if (!confirmed) return;

    await fetch(
      `${API}/orders/${orderId}/payment`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          paymentMethod: "Card",
        }),
      }
    );

    await loadOrders();

    alert("Payment recorded successfully.");
  }

  function money(value) {
    return `₦${Number(value).toLocaleString()}`;
  }

  function switchCustomer() {
    setRole("customer");
    setPage("menu");
  }

  function switchWaiter() {
    setRole("waiter");
    setPage("waiter");
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">C</div>
        <h2>Loading Chowly...</h2>
      </div>
    );
  }

  return (
    <div>
      <header className="navbar">
        <div className="nav-inner">
          <div
            className="brand"
            onClick={switchCustomer}
          >
            <div className="brand-icon">C</div>

            <span>Chowly</span>
          </div>

          {role === "customer" && (
            <div className="customer-navigation">
              <button
                className={
                  page === "menu"
                    ? "nav-pill active"
                    : "nav-pill"
                }
                onClick={() => setPage("menu")}
              >
                🍴 Menu
              </button>

              <button
                className={
                  page === "orders"
                    ? "nav-pill active"
                    : "nav-pill"
                }
                onClick={() => {
                  setPage("orders");
                  loadOrders();
                }}
              >
                ▣ My Orders
              </button>
            </div>
          )}

          <div className="nav-actions">
            <span className="table">
              ⌖ Table 7
            </span>

            <div className="role-switch">
              <button
                className={
                  role === "customer"
                    ? "active"
                    : ""
                }
                onClick={switchCustomer}
              >
                Customer
              </button>

              <button
                className={
                  role === "waiter"
                    ? "active"
                    : ""
                }
                onClick={switchWaiter}
              >
                Waiter
              </button>
            </div>

            {role === "customer" && (
              <button
                className="cart-button"
                onClick={() => setCartOpen(true)}
              >
                🛒
                {cart.length > 0 && (
                  <span className="cart-number">
                    {cart.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0
                    )}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {role === "customer" &&
        page === "menu" && (
          <>
            <main className="main-container">
              <span className="welcome-pill">
                ✦ Welcome to Chowly
              </span>

              <section className="hero-row">
                <div>
                  <h1>
                    What are you in the mood for?
                  </h1>

                  <p>
                    Browse the menu, choose your
                    favourites, and place your order
                    straight from your table.
                  </p>
                </div>

                <div className="dining-card">
                  <span>🍴</span>

                  <div>
                    <small>DINING AT</small>
                    <strong>Table 7</strong>
                  </div>
                </div>
              </section>

              <section className="search-panel">
                <div className="search-box">
                  🔍

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search dishes, drinks, or categories..."
                  />
                </div>

                <div className="filters">
                  {["All", "Food", "Drink"].map(
                    (type) => (
                      <button
                        key={type}
                        className={
                          filter === type
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setFilter(type)
                        }
                      >
                        {type === "Food"
                          ? "🍴 Food"
                          : type === "Drink"
                          ? "🥂 Drinks"
                          : "All"}
                      </button>
                    )
                  )}
                </div>
              </section>

              {popularItems.length > 0 && (
                <MenuSection
                  label="Popular choices"
                  title="Most ordered"
                  subtitle="Favourites from other Chowly guests."
                  items={popularItems}
                  addToCart={addToCart}
                  money={money}
                />
              )}

              <MenuSection
                label="Chowly menu"
                title="Explore the menu"
                subtitle={`${filteredMenu.length} items available`}
                items={filteredMenu}
                addToCart={addToCart}
                money={money}
              />
            </main>

            <Footer />
          </>
        )}

      {role === "customer" &&
        page === "orders" && (
          <>
            <main className="orders-page">
              <h1>My Orders</h1>

              <p className="orders-subtitle">
                Table 7 • {orders.length} orders
              </p>

              {orders.length === 0 ? (
                <div className="empty-orders">
                  <div>◷</div>
                  <h3>No orders yet</h3>
                  <p>
                    New orders will appear here.
                  </p>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <CustomerOrder
                      key={order.id}
                      order={order}
                      money={money}
                      submitComplaint={
                        submitComplaint
                      }
                      submitRating={submitRating}
                      payForOrder={payForOrder}
                    />
                  ))}
                </div>
              )}
            </main>

            <Footer />
          </>
        )}

      {role === "waiter" && (
        <main className="waiter-page">
          <span className="welcome-pill">
            Service dashboard
          </span>

          <h1>Waiter Dashboard</h1>

          <p className="orders-subtitle">
            Manage incoming orders and record the
            staff responsible for preparing them.
          </p>

          <div className="dashboard-stats">
            <StatCard
              label="Open Orders"
              value={
                orders.filter(
                  (order) =>
                    !order.paid &&
                    order.status !== "Served"
                ).length
              }
            />

            <StatCard
              label="Delayed"
              value={
                orders.filter(
                  (order) =>
                    order.status === "Delayed"
                ).length
              }
            />

            <StatCard
              label="Served"
              value={
                orders.filter(
                  (order) =>
                    order.status === "Served" ||
                    order.paid
                ).length
              }
            />
          </div>

          <div className="orders-list">
            {orders.length === 0 ? (
              <div className="empty-orders">
                <div>▣</div>
                <h3>No customer orders</h3>
                <p>
                  New orders will appear here.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <WaiterOrder
                  key={order.id}
                  order={order}
                  staff={staff}
                  updateOrder={updateOrder}
                />
              ))
            )}
          </div>
        </main>
      )}

      {cartOpen && (
        <div className="cart-overlay">
          <div
            className="overlay-background"
            onClick={() => setCartOpen(false)}
          />

          <aside className="cart-drawer">
            <div className="cart-header">
              <div>
                <h2>Your Order</h2>
                <p>Table 7</p>
              </div>

              <button
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  🛒
                  <h3>Your cart is empty</h3>
                  <p>
                    Add something delicious from
                    the menu.
                  </p>
                </div>
              ) : (
                cart.map((cartItem) => (
                  <div
                    className="cart-item"
                    key={cartItem.id}
                  >
                    <img
                      src={cartItem.image_url}
                      alt={cartItem.name}
                    />

                    <div>
                      <strong>
                        {cartItem.name}
                      </strong>

                      <small>
                        {money(cartItem.price)}
                      </small>

                      <div className="quantity">
                        <button
                          onClick={() =>
                            changeQuantity(
                              cartItem.id,
                              -1
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {cartItem.quantity}
                        </span>

                        <button
                          onClick={() =>
                            changeQuantity(
                              cartItem.id,
                              1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <b>
                      {money(
                        Number(
                          cartItem.price
                        ) *
                          cartItem.quantity
                      )}
                    </b>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <strong>
                  {money(cartTotal)}
                </strong>
              </div>

              <div className="wait-time">
                ⏱ Estimated waiting time:
                <strong>
                  {" "}
                  {waitTime} minutes
                </strong>
              </div>

              <label>
                Customer name
                <input
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Email
                <input
                  value={customerEmail}
                  onChange={(event) =>
                    setCustomerEmail(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Special request
                <textarea
                  rows="2"
                  value={specialRequest}
                  onChange={(event) =>
                    setSpecialRequest(
                      event.target.value
                    )
                  }
                  placeholder="No onions, extra spicy..."
                />
              </label>

              <button
                className="place-order"
                onClick={placeOrder}
              >
                Place Order
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MenuSection({
  label,
  title,
  subtitle,
  items,
  addToCart,
  money,
}) {
  return (
    <section className="menu-section">
      <span className="section-label">
        {label}
      </span>

      <h2>{title}</h2>

      <p>{subtitle}</p>

      <div className="food-grid">
        {items.map((item) => (
          <article
            className="food-card"
            key={item.id}
          >
            <div className="food-image">
              <img
                src={item.image_url}
                alt={item.name}
              />

              {item.popular && (
                <span className="popular">
                  ★ Popular
                </span>
              )}

              <span className="prep-time">
                ◷{" "}
                {item.preparation_time_mins} min
              </span>
            </div>

            <div className="food-content">
              <div className="food-title">
                <h3>{item.name}</h3>

                <span>{item.type}</span>
              </div>

              <div className="food-bottom">
                <strong>
                  {money(item.price)}
                </strong>

                <button
                  onClick={() =>
                    addToCart(item)
                  }
                >
                  ＋ Add
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CustomerOrder({
  order,
  money,
  submitComplaint,
  submitRating,
  payForOrder,
}) {
  let progress = 1;

  if (
    order.status === "Preparing" ||
    order.status === "Delayed"
  ) {
    progress = 2;
  }

  if (order.status === "Served") {
    progress = 3;
  }

  if (order.paid) {
    progress = 4;
  }

  return (
    <article className="order-card">
      <div className="order-heading">
        <div>
          <h3>Order #{order.id}</h3>

          <p>
            {new Date(
              order.created_at
            ).toLocaleString()}
          </p>
        </div>

        <span
          className={`status ${order.status}`}
        >
          {order.paid
            ? "Paid"
            : order.status}
        </span>
      </div>

      <div className="progress">
        {[
          "Placed",
          "Preparing",
          "Served",
          "Paid",
        ].map((step, index) => (
          <div
            key={step}
            className={
              index + 1 <= progress
                ? "step done"
                : "step"
            }
          >
            <span />
            {step}
          </div>
        ))}
      </div>

      <div className="order-details">
        <p>
          <b>Items:</b>{" "}
          {order.items
            .map(
              (item) =>
                `${item.name} × ${item.quantity}`
            )
            .join(", ")}
        </p>

        <p>
          <b>Estimated wait:</b>{" "}
          {order.wait_time_mins} minutes
        </p>

        <p>
          <b>Waiter:</b>{" "}
          {order.waiter_name || "Pending"}
        </p>

        <p>
          <b>Chef:</b>{" "}
          {order.chef_name || "Not recorded"}
        </p>

        <p>
          <b>Bartender:</b>{" "}
          {order.bartender_name ||
            "Not recorded"}
        </p>

        <p>
          <b>Special request:</b>{" "}
          {order.special_request || "None"}
        </p>
      </div>

      {order.complaints?.length > 0 && (
        <div className="order-note">
          <b>Complaint:</b>{" "}
          {order.complaints[0].description}
        </div>
      )}

      {order.ratings?.length > 0 && (
        <div className="order-note">
          <b>Rating:</b>{" "}
          {"★".repeat(
            order.ratings[0].score
          )}
          {"☆".repeat(
            5 - order.ratings[0].score
          )}
          {order.ratings[0].comment &&
            ` — ${order.ratings[0].comment}`}
        </div>
      )}

      <div className="order-buttons">
        {order.complaints?.length ===
          0 && (
          <button
            onClick={() =>
              submitComplaint(order.id)
            }
          >
            Complaint
          </button>
        )}

        {order.ratings?.length === 0 && (
          <button
            onClick={() =>
              submitRating(order.id)
            }
          >
            Rate Order
          </button>
        )}

        {!order.paid && (
          <button
            className="pay"
            onClick={() =>
              payForOrder(order.id)
            }
          >
            Payment
          </button>
        )}
      </div>

      {order.payment && (
        <div className="payment-record">
          ✓ Payment recorded —{" "}
          {money(order.payment.amount)}
        </div>
      )}
    </article>
  );
}

function WaiterOrder({
  order,
  staff,
  updateOrder,
}) {
  return (
    <article className="order-card">
      <div className="order-heading">
        <div>
          <h3>
            Order #{order.id} •{" "}
            {order.customer_name}
          </h3>

          <p>
            {order.items
              .map(
                (item) =>
                  `${item.name} × ${item.quantity}`
              )
              .join(", ")}
          </p>
        </div>

        <span
          className={`status ${order.status}`}
        >
          {order.status}
        </span>
      </div>

      <div className="staff-controls">
        <label>
          Chef
          <select
            value=""
            onChange={(event) =>
              updateOrder(
                order.id,
                "chef",
                event.target.value
              )
            }
          >
            <option value="">
              {order.chef_name ||
                "Select chef"}
            </option>

            {staff.chefs.map((chef) => (
              <option
                value={chef.id}
                key={chef.id}
              >
                {chef.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Bartender
          <select
            value=""
            onChange={(event) =>
              updateOrder(
                order.id,
                "bartender",
                event.target.value
              )
            }
          >
            <option value="">
              {order.bartender_name ||
                "Select bartender"}
            </option>

            {staff.bartenders.map(
              (bartender) => (
                <option
                  value={bartender.id}
                  key={bartender.id}
                >
                  {bartender.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Status
          <select
            value={order.status}
            onChange={(event) =>
              updateOrder(
                order.id,
                "status",
                event.target.value
              )
            }
          >
            <option>Pending</option>
            <option>Preparing</option>
            <option>Delayed</option>
            <option>Served</option>
          </select>
        </label>
      </div>

      <div className="order-details">
        <p>
          <b>Waiter:</b>{" "}
          {order.waiter_name}
        </p>

        <p>
          <b>Estimated wait:</b>{" "}
          {order.wait_time_mins} minutes
        </p>

        <p>
          <b>Special request:</b>{" "}
          {order.special_request || "None"}
        </p>
      </div>

      {order.complaints?.length > 0 && (
        <div className="order-note">
          <b>Customer complaint:</b>{" "}
          {order.complaints[0].description}
        </div>
      )}

      {order.ratings?.length > 0 && (
        <div className="order-note">
          <b>Customer rating:</b>{" "}
          {order.ratings[0].score}/5
        </div>
      )}
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <div>
          <div className="footer-brand">
            <div className="brand-icon">C</div>
            Chowly
          </div>

          <p>
            Bold flavours, served fresh at your
            table. Dine in, order from your phone,
            pay when you leave.
          </p>
        </div>

        <div>
          <h4>MENU</h4>
          <span>Mains</span>
          <span>Grills & Suya</span>
          <span>Drinks</span>
          <span>Local Favourites</span>
        </div>

        <div>
          <h4>COMPANY</h4>
          <span>About Us</span>
          <span>Our Staff</span>
          <span>Reservations</span>
          <span>Privacy Policy</span>
        </div>

        <div>
          <h4>CONTACT</h4>
          <span>⌖ Lagos, Nigeria</span>
          <span>☎ +234 800 000 0000</span>
          <span>✉ hello@chowly.ng</span>
        </div>
      </div>
    </footer>
  );
}