const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

let users = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin'
  },
  {
    id: 2,
    username: 'customer',
    password: bcrypt.hashSync('customer123', 10),
    role: 'customer'
  }
];

let products = [
  { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
  { id: 2, name: 'Smartphone', price: 699.99, category: 'Electronics', stock: 100 },
  { id: 3, name: 'Headphones', price: 199.99, category: 'Electronics', stock: 75 },
  { id: 4, name: 'Coffee Maker', price: 89.99, category: 'Appliances', stock: 30 },
  { id: 5, name: 'Running Shoes', price: 129.99, category: 'Sports', stock: 60 },
  { id: 6, name: 'Backpack', price: 49.99, category: 'Accessories', stock: 40 },
  { id: 7, name: 'Tablet', price: 399.99, category: 'Electronics', stock: 25 },
  { id: 8, name: 'Wireless Mouse', price: 29.99, category: 'Electronics', stock: 80 }
];

let carts = {}; 
let orders = [];
let nextOrderId = 1;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};


app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = users.find(u => u.username === username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: users.length + 1,
    username,
    password: bcrypt.hashSync(password, 10),
    role: 'customer'
  };

  users.push(newUser);
  carts[newUser.id] = [];

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role
    }
  });
});

app.get('/api/products', (req, res) => {
  const { page = 1, limit = 10, search, category } = req.query;
  let filteredProducts = [...products];

  if (search) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (category) {
    filteredProducts = filteredProducts.filter(product =>
      product.category.toLowerCase() === category.toLowerCase()
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  res.json({
    products: paginatedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredProducts.length,
      totalPages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, price, category, stock } = req.body;
  
  if (!name || !price || !category || stock === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const newProduct = {
    id: Math.max(...products.map(p => p.id)) + 1,
    name,
    price: parseFloat(price),
    category,
    stock: parseInt(stock)
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { name, price, category, stock } = req.body;
  
  if (name) products[productIndex].name = name;
  if (price) products[productIndex].price = parseFloat(price);
  if (category) products[productIndex].category = category;
  if (stock !== undefined) products[productIndex].stock = parseInt(stock);

  res.json(products[productIndex]);
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.splice(productIndex, 1);
  res.json({ message: 'Product deleted successfully' });
});

app.get('/api/cart', authenticateToken, (req, res) => {
  const userCart = carts[req.user.id] || [];
  const cartWithDetails = userCart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      ...item,
      product: product || null
    };
  });
  res.json(cartWithDetails);
});

app.post('/api/cart', authenticateToken, (req, res) => {
  const { productId, quantity = 1 } = req.body;
  
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const product = products.find(p => p.id === parseInt(productId));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  if (!carts[req.user.id]) {
    carts[req.user.id] = [];
  }

  const existingItem = carts[req.user.id].find(item => item.productId === parseInt(productId));
  
  if (existingItem) {
    existingItem.quantity += parseInt(quantity);
  } else {
    carts[req.user.id].push({
      productId: parseInt(productId),
      quantity: parseInt(quantity)
    });
  }

  res.json({ message: 'Item added to cart' });
});

app.put('/api/cart/:productId', authenticateToken, (req, res) => {
  const { quantity } = req.body;
  const productId = parseInt(req.params.productId);
  
  if (!carts[req.user.id]) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const itemIndex = carts[req.user.id].findIndex(item => item.productId === productId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found in cart' });
  }

  if (quantity <= 0) {
    carts[req.user.id].splice(itemIndex, 1);
  } else {
    carts[req.user.id][itemIndex].quantity = parseInt(quantity);
  }

  res.json({ message: 'Cart updated' });
});

app.delete('/api/cart/:productId', authenticateToken, (req, res) => {
  const productId = parseInt(req.params.productId);
  
  if (!carts[req.user.id]) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const itemIndex = carts[req.user.id].findIndex(item => item.productId === productId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found in cart' });
  }

  carts[req.user.id].splice(itemIndex, 1);
  res.json({ message: 'Item removed from cart' });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const userCart = carts[req.user.id] || [];
  
  if (userCart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  let total = 0;
  const orderItems = [];

  for (const item of userCart) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    }
    
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    }

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity
    });

    total += product.price * item.quantity;
  }

  for (const item of userCart) {
    const productIndex = products.findIndex(p => p.id === item.productId);
    products[productIndex].stock -= item.quantity;
  }

  const order = {
    id: nextOrderId++,
    userId: req.user.id,
    items: orderItems,
    total: total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  carts[req.user.id] = []; 

  res.status(201).json(order);
});

app.get('/api/orders', authenticateToken, (req, res) => {
  const userOrders = orders.filter(order => order.userId === req.user.id);
  res.json(userOrders);
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
  res.json(orders);
});

app.get('/api/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  res.json(categories);
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading the application');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
  console.log('\nDefault users:');
  console.log('Admin: username=admin, password=admin123');
  console.log('Customer: username=customer, password=customer123');
});