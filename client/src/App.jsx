import { useEffect, useMemo, useState } from "react";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

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

  const [selectedRestaurant, setSelectedRestaurant] = useState("bamboo");

const restaurants = [
  {
    id: "bamboo",
    name: "Bamboo Lounge",
    address: "19 Ikotun Road, Lagos",
  },
  {
    id: "rubels",
    name: "Rubels & Angels",
    address: "12 Iganmu Road, Lagos",
  },
  {
    id: "ego",
    name: "Ego's Kitchen",
    address: "56 Isolo Way, Lagos",
  },
  {
    id: "theplace",
    name: "ThePlace",
    address: "13 Apapa Road, Lagos",
  },
  {
    id: "chicken",
    name: "Chicken Republic",
    address: "99 Airport Road, Lagos",
  },
];

const currentRestaurant = restaurants.find(
  (restaurant) => restaurant.id === selectedRestaurant
);
const restaurantIsActive = selectedRestaurant === "bamboo";

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

  async function payForOrder(orderId, paymentMethod) {
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
            {selectedRestaurant === "bamboo" && (
            <span className="table">
              ⌖ Table 7
            </span>
)}
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
     <div className="restaurant-selector">
  <div className="restaurant-selector-icon">
    🍽️
  </div>

  <div className="restaurant-selector-content">
    <span className="restaurant-label">
      YOU'RE DINING AT
    </span>

    <select
      className="restaurant-dropdown"
      value={selectedRestaurant}
      onChange={(event) =>
        setSelectedRestaurant(event.target.value)
      }
    >
      {restaurants.map((restaurant) => (
        <option
          key={restaurant.id}
          value={restaurant.id}
        >
          {restaurant.name} — {restaurant.address}
        </option>
      ))}
    </select>

    {selectedRestaurant === "bamboo" ? (
      <p className="restaurant-status active">
        ● Bamboo Lounge is active today
      </p>
    ) : (
      <p className="restaurant-status inactive">
        {currentRestaurant?.name} is not active today 😊
      </p>
    )}
  </div>
</div>


                  <h1>
                    What are you in the mood for?
                  </h1>

                  <p>
                    Browse the menu, choose your
                    favourites, and place your order
                    straight from your table.
                  </p>
                </div>
{selectedRestaurant === "bamboo" && (
                <div className="dining-card">
                  <span>🍴</span>

                  <div>
                    <small>DINING AT</small>
                    <strong>Table 7</strong>
                  </div>
                </div>
                )}
              </section>
{!restaurantIsActive ? (
  <div className="restaurant-unavailable">
    <div className="restaurant-unavailable-icon">
      😊
    </div>

    <h2>
      {currentRestaurant?.name} is not accepting orders today
    </h2>

    <p>
      Please choose another restaurant to continue ordering on Chowly.
    </p>

    <button
      onClick={() =>
        setSelectedRestaurant("bamboo")
      }
    >
      View Bamboo Lounge
    </button>
  </div>
) : (
  <>
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
              <section className="food-hero">
  <div className="food-hero-content">
    <span>CHEF'S PICK</span>

    <h2>Big flavour. Straight to your table.</h2>

    <p>
      Discover customer favourites prepared fresh
      by the Chowly kitchen.
    </p>

    <button onClick={() => setFilter("Food")}>
      Explore food
    </button>
  </div>

  <div className="food-hero-image">
    <img
      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=90"
      alt="Selection of delicious food"
    />
  </div>
</section>
<section className="category-row">

  <button onClick={() => setFilter("All")}>
    <img
      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80"
      alt=""
    />
    <span>All</span>
  </button>

  <button onClick={() => setFilter("Food")}>
    <img
      src="https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=300&q=80"
      alt=""
    />
    <span>Mains</span>
  </button>

  <button onClick={() => setFilter("Drink")}>
    <img
      src="https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=300&q=80"
      alt=""
    />
    <span>Drinks</span>
  </button>

  <button onClick={() => setSearch("suya")}>
    <img
      src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80"
      alt=""
    />
    <span>Grills</span>
  </button>

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
              </>
)}
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
      !(
        order.paid &&
        order.status === "Served"
      )
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
  label="Completed"
  value={
    orders.filter(
      (order) =>
        order.paid &&
        order.status === "Served"
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
  
 const [paymentMethod, setPaymentMethod] = useState("Card");
const [showPaymentPanel, setShowPaymentPanel] = useState(false);

const isPreparing =
  order.status === "Preparing" ||
  order.status === "Delayed" ||
  order.status === "Served";

const isPaid = order.paid;

const isServed =
  order.status === "Served";

const isCompleted =
  isPaid && isServed;

const displayStatus = isCompleted
  ? "Completed"
  : order.status;

  return (
    <article className="customer-order-card">

      {/* TOP SECTION */}
      <div className="customer-order-top">
        <div>
          <span className="order-eyebrow">
            CHOWLY ORDER
          </span>

          <h3>Order #{order.id}</h3>

          <p className="order-date">
            {new Date(
              order.created_at
            ).toLocaleString()}
          </p>
        </div>

        <span
          className={`order-status-pill ${displayStatus.toLowerCase()}`}
        >
          {displayStatus}
        </span>
      </div>


      {/* PROGRESS */}
      <div className="order-progress-box">
        <div className="order-progress-line">
          
{[
  {
    label: "Placed",
    done: true,
  },
  {
    label: "Preparing",
    done: isPreparing,
  },
  {
    label: "Served",
    done: isServed,
  },
  {
    label: "Paid",
    done: isPaid,
  },
].map((step, index) => (
  <div
    key={step.label}
    className={
      step.done
        ? "order-progress-step complete"
        : "order-progress-step"
    }
  >
    <div className="progress-circle">
      {step.done ? "✓" : index + 1}
    </div>

    <span>{step.label}</span>
  </div>
))}
        </div>
      </div>


      {/* ITEMS */}
      <div className="order-section">
        <div className="order-section-heading">
          <div>
            <span className="section-icon">
              🍽
            </span>

            <div>
              <small>YOUR ORDER</small>
              <h4>What you ordered</h4>
            </div>
          </div>
        </div>

        <div className="ordered-items-list">
          {order.items.map((item) => (
            <div
              className="ordered-item-chip"
              key={`${item.name}-${item.quantity}`}
            >
              <span>{item.name}</span>
              <strong>× {item.quantity}</strong>
            </div>
          ))}
        </div>
      </div>


      {/* DETAILS GRID */}
      <div className="order-info-grid">

        <div className="order-info-box">
          <span className="info-icon">⏱</span>
          <small>ESTIMATED WAIT</small>
          <strong>
            {order.wait_time_mins} minutes
          </strong>
        </div>

        <div className="order-info-box">
          <span className="info-icon">👤</span>
          <small>WAITER</small>
          <strong>
            {order.waiter_name || "Pending"}
          </strong>
        </div>

        <div className="order-info-box">
          <span className="info-icon">👨‍🍳</span>
          <small>CHEF</small>
          <strong>
            {order.chef_name ||
              "Not recorded"}
          </strong>
        </div>

        <div className="order-info-box">
          <span className="info-icon">🍹</span>
          <small>BARTENDER</small>
          <strong>
            {order.bartender_name ||
              "Not recorded"}
          </strong>
        </div>

      </div>


      {/* SPECIAL REQUEST */}
      <div className="special-request-box">
        <span>📝</span>

        <div>
          <small>SPECIAL REQUEST</small>

          <p>
            {order.special_request ||
              "No special request"}
          </p>
        </div>
      </div>


      {/* COMPLAINT */}
      {order.complaints?.length > 0 && (
        <div className="feedback-card complaint-card">
          <div className="feedback-icon">
            !
          </div>

          <div>
            <small>COMPLAINT SUBMITTED</small>

            <p>
              {
                order.complaints[0]
                  .description
              }
            </p>
          </div>
        </div>
      )}


      {/* RATING */}
      {order.ratings?.length > 0 && (
        <div className="feedback-card rating-card">
          <div className="feedback-icon">
            ★
          </div>

          <div>
            <small>YOUR RATING</small>

            <div className="rating-stars">
              {"★".repeat(
                order.ratings[0].score
              )}
              <span>
                {"★".repeat(
                  5 -
                    order.ratings[0]
                      .score
                )}
              </span>
            </div>

            {order.ratings[0].comment && (
              <p>
                {
                  order.ratings[0]
                    .comment
                }
              </p>
            )}
          </div>
        </div>
      )}


      {/* ACTIONS */}
      <div className="customer-order-actions">

  {order.status === "Delayed" &&
    order.complaints?.length === 0 && (
      <button
        className="secondary-order-btn"
        onClick={() =>
          submitComplaint(order.id)
        }
      >
        Report an issue
      </button>
    )}

  {order.status === "Delayed" &&
    order.ratings?.length === 0 && (
      <button
        className="secondary-order-btn"
        onClick={() =>
          submitRating(order.id)
        }
      >
        ★ Rate order
      </button>
    )}

  {order.status === "Served" &&
  !order.paid && (
    <div className="checkout-area">

      <div className="payment-selector">
        <label>
          <span>PAYMENT METHOD</span>

          <select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value);
              setShowPaymentPanel(false);
            }}
          >
            <option value="Card">
              💳 Card
            </option>

            <option value="Bank Transfer">
              🏦 Bank Transfer
            </option>

            <option value="USSD">
              📱 USSD
            </option>
          </select>
        </label>

        <button
          className="primary-order-btn"
          onClick={() =>
            setShowPaymentPanel(true)
          }
        >
          Continue to Payment
        </button>
      </div>

      {showPaymentPanel && (
        <div className="demo-payment-panel">

          <div className="demo-payment-heading">
            <div>
              <small>DEMO PAYMENT</small>
              <h4>{paymentMethod}</h4>
            </div>

            <button
              className="close-payment"
              onClick={() =>
                setShowPaymentPanel(false)
              }
            >
              ×
            </button>
          </div>

          <div className="demo-warning">
            Demo only — no real money will be charged.
          </div>

          {paymentMethod === "Card" && (
            <div className="card-payment-form">

              <label>
                Cardholder Name
                <input
                  type="text"
                  placeholder="Demo Customer"
                />
              </label>

              <label>
                Card Number
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                />
              </label>

              <div className="card-small-fields">
                <label>
                  Expiry
                  <input
                    type="text"
                    placeholder="12/30"
                  />
                </label>

                <label>
                  CVV
                  <input
                    type="text"
                    placeholder="123"
                  />
                </label>
              </div>

              <button
                className="complete-demo-payment"
                onClick={() => {
                  payForOrder(
                    order.id,
                    paymentMethod
                  );
                  setShowPaymentPanel(false);
                }}
              >
                Pay with Demo Card
              </button>
            </div>
          )}

          {paymentMethod === "Bank Transfer" && (
            <div className="transfer-details">

              <p>
                Transfer to the following demo account:
              </p>

              <div className="bank-detail">
                <span>BANK</span>
                <strong>Chowly Demo Bank</strong>
              </div>

              <div className="bank-detail">
                <span>ACCOUNT NAME</span>
                <strong>
                  Bamboo Lounge / Chowly
                </strong>
              </div>

              <div className="bank-detail">
                <span>ACCOUNT NUMBER</span>
                <strong>0123456789</strong>
              </div>

              <p className="demo-bank-note">
                Fictional account details for demonstration only.
              </p>

              <button
                className="complete-demo-payment"
                onClick={() => {
                  payForOrder(
                    order.id,
                    paymentMethod
                  );
                  setShowPaymentPanel(false);
                }}
              >
                I Have Made the Demo Transfer
              </button>
            </div>
          )}

          {paymentMethod === "USSD" && (
            <div className="ussd-details">

              <p>
                Use the demo USSD code below:
              </p>

              <div className="ussd-code">
                *000*1234#
              </div>

              <p>
                This is a fictional demonstration code. Do not dial it.
              </p>

              <button
                className="complete-demo-payment"
                onClick={() => {
                  payForOrder(
                    order.id,
                    paymentMethod
                  );
                  setShowPaymentPanel(false);
                }}
              >
                I Have Completed the Demo USSD Payment
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  )}

</div>

{order.paid &&
  order.payment?.amount && (
    <div className="payment-success-box">
      <div className="payment-check">
        ✓
      </div>

      <div>
        <small>PAYMENT COMPLETED</small>

        <strong>
          {money(order.payment.amount)}
        </strong>

        <p>
          Your payment has been recorded successfully.
        </p>
      </div>
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
const isCompleted =
  order.paid &&
  order.status === "Served";

const displayStatus = order.status;

  return (
    <article className="waiter-order-card">

      {/* HEADER */}
      <div className="waiter-order-header">
        <div>
          <span className="waiter-eyebrow">
  TABLE 7 • {order.paid ? "COMPLETED ORDER" : "ACTIVE ORDER"}
</span>

          <h3>
            Order #{order.id}
          </h3>

          <p className="waiter-customer">
            👤 {order.customer_name}
          </p>
        </div>

        <span
          className={`waiter-status ${displayStatus.toLowerCase()}`}
        >
          {displayStatus}
        </span>
      </div>


      {/* ORDER ITEMS */}
      <div className="waiter-order-section">
        <div className="waiter-section-title">
          <span>🍽️</span>

          <div>
            <small>ORDER ITEMS</small>
            <h4>Customer's order</h4>
          </div>
        </div>

        <div className="waiter-item-list">
          {order.items.map((item) => (
            <div
              className="waiter-item-chip"
              key={`${item.name}-${item.quantity}`}
            >
              <span>{item.name}</span>

              <strong>
                × {item.quantity}
              </strong>
            </div>
          ))}
        </div>
      </div>


      {/* QUICK INFORMATION */}
      <div className="waiter-info-grid">

        <div className="waiter-info-card">
          <span className="waiter-info-icon">
            👤
          </span>

          <small>ASSIGNED WAITER</small>

          <strong>
            {order.waiter_name ||
              "Not assigned"}
          </strong>
        </div>

        <div className="waiter-info-card">
          <span className="waiter-info-icon">
            ⏱️
          </span>

          <small>ESTIMATED WAIT</small>

          <strong>
            {order.wait_time_mins} minutes
          </strong>
        </div>

        <div className="waiter-info-card">
          <span className="waiter-info-icon">
            📝
          </span>

          <small>SPECIAL REQUEST</small>

          <strong>
            {order.special_request ||
              "None"}
          </strong>
        </div>

      </div>


      {/* ASSIGNMENT CONTROLS */}
      <div className="waiter-controls-panel">

        <div className="waiter-controls-heading">
          <div>
            <span>👨‍🍳</span>

            <div>
              <small>
                ORDER FULFILMENT
              </small>

              <h4>
                Assign staff & update status
              </h4>
            </div>
          </div>

          {order.paid && (
            <span className="completed-label">
              Completed
            </span>
          )}
        </div>


        <div className="waiter-control-grid">

          <label className="waiter-control">
            <span>Chef</span>

            <select
              disabled={isCompleted}
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


          <label className="waiter-control">
            <span>Bartender</span>

            <select
              disabled={isCompleted}
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


          <label className="waiter-control">
            <span>Status</span>

            <select
              disabled={isCompleted}
              value={displayStatus}
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

              {order.paid && (
                <option>Paid</option>
              )}
            </select>
          </label>

        </div>
      </div>


      {/* COMPLAINT */}
      {order.complaints?.length > 0 && (
        <div className="waiter-feedback complaint">
          <div className="waiter-feedback-icon">
            !
          </div>

          <div>
            <small>
              CUSTOMER COMPLAINT
            </small>

            <p>
              {
                order.complaints[0]
                  .description
              }
            </p>
          </div>
        </div>
      )}


      {/* RATING */}
      {order.ratings?.length > 0 && (
        <div className="waiter-feedback rating">
          <div className="waiter-feedback-icon">
            ★
          </div>

          <div>
            <small>
              CUSTOMER RATING
            </small>

            <div className="waiter-rating-stars">
              {"★".repeat(
                order.ratings[0].score
              )}

              <span>
                {"★".repeat(
                  5 -
                    order.ratings[0]
                      .score
                )}
              </span>
            </div>

            {order.ratings[0].comment && (
              <p>
                {
                  order.ratings[0]
                    .comment
                }
              </p>
            )}
          </div>
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
          <button
  className="footer-link"
  onClick={() => {
    setPage("menu");
    setFilter("Food");
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Mains
</button>

<button
  className="footer-link"
  onClick={() => {
    setPage("menu");
    setFilter("All");
    setSearch("suya");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Grills & Suya
</button>

<button
  className="footer-link"
  onClick={() => {
    setPage("menu");
    setFilter("Drink");
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Drinks
</button>

<button
  className="footer-link"
  onClick={() => {
    setPage("menu");
    setFilter("All");
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Local Favourites
</button>
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