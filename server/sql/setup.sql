DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS bartenders CASCADE;
DROP TABLE IF EXISTS chefs CASCADE;
DROP TABLE IF EXISTS waiters CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;


CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(120),
    opening_hours VARCHAR(100),
    opening_days VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active'
);


CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(30),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);


CREATE TABLE waiters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(120),
    shift VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    restaurant_id INTEGER NOT NULL
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);


CREATE TABLE chefs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    specialty VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active',
    restaurant_id INTEGER NOT NULL
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);


CREATE TABLE bartenders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    status VARCHAR(20) DEFAULT 'Active',
    restaurant_id INTEGER NOT NULL
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);


CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('Food', 'Drink')),
    price NUMERIC(10,2) NOT NULL,
    preparation_time_mins INTEGER NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    popular BOOLEAN DEFAULT FALSE,
    restaurant_id INTEGER NOT NULL
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);


CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    wait_time_mins INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Preparing',
                'Delayed',
                'Served',
                'Paid'
            )
        ),
    special_request TEXT,
    customer_id INTEGER NOT NULL
        REFERENCES customers(id),
    waiter_id INTEGER
        REFERENCES waiters(id),
    chef_id INTEGER
        REFERENCES chefs(id),
    bartender_id INTEGER
        REFERENCES bartenders(id),
    restaurant_id INTEGER NOT NULL
        REFERENCES restaurants(id),
    paid BOOLEAN DEFAULT FALSE
);


CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL
        REFERENCES menu_items(id),
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL
        CHECK (quantity > 0),
    subtotal NUMERIC(10,2) NOT NULL
);


CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Open',
    order_id INTEGER NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE
);


CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    score INTEGER NOT NULL
        CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_id INTEGER NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE
);


CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Successful',
    order_id INTEGER UNIQUE NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE
);


-- RESTAURANT

INSERT INTO restaurants
(name, address, phone, email, opening_hours, opening_days)
VALUES
(
    'Bamboo Lounge',
    '19 Ikotun Road, Lagos',
    '01-2793045',
    'contact@bamboolounge.com',
    '10:00 AM - 10:00 PM',
    'Monday - Sunday'
);


-- WAITER

INSERT INTO waiters
(name, phone, email, shift, restaurant_id)
VALUES
(
    'Obi Cubana',
    '07056789061',
    'obi@bamboolounge.com',
    'Morning',
    1
);


-- CHEFS

INSERT INTO chefs
(name, phone, specialty, restaurant_id)
VALUES
('Ada Obinna', '08023456701', 'Seafood', 1),
('Emeka Jude', '08023456702', 'Local Delicacies', 1),
('Jennifer Victor', '08023456703', 'Continental Cuisine', 1);


-- BARTENDERS

INSERT INTO bartenders
(name, phone, restaurant_id)
VALUES
('Victor Nwankwo', '08097867563', 1),
('Emmanuel Samuel', '08167560864', 1),
('James Oni', '08134679976', 1);


-- MENU

INSERT INTO menu_items
(name, type, price, preparation_time_mins, image_url, popular, restaurant_id)
VALUES

(
    'Beef Suya Skewers',
    'Food',
    3500,
    15,
    'https://images.unsplash.com/photo-1544025162-d76694265947',
    TRUE,
    1
),

(
    'Chilled Zobo Drink',
    'Drink',
    1000,
    5,
    'https://images.unsplash.com/photo-1544145945-f90425340c7e',
    TRUE,
    1
),

(
    'Egusi Soup & Pounded Yam',
    'Food',
    5500,
    30,
    'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f',
    TRUE,
    1
),

(
    'Jollof Rice & Chicken',
    'Food',
    4200,
    25,
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    TRUE,
    1
),

(
    'Creamy Carbonara',
    'Food',
    6500,
    20,
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
    FALSE,
    1
),

(
    'Classic Chapman',
    'Drink',
    2000,
    7,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd',
    FALSE,
    1
),

(
    'Seafood Platter',
    'Food',
    9200,
    28,
    'https://images.unsplash.com/photo-1547592180-85f173990554',
    FALSE,
    1
),

(
    'House Cocktail',
    'Drink',
    3600,
    8,
    'https://images.unsplash.com/photo-1551024506-0bccd828d307',
    TRUE,
    1
),

(
    'Amala & Ewedu',
    'Food',
    4000,
    25,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    FALSE,
    1
);