const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_test_in9Fbr3JPonj4O',
  key_secret: 'VnaGncj9bcHJQZLXYuV7xSTf' 
});

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect('mongodb+srv://josephpeterjece2021:AJ9Hg6xTtQBUCoGr@cluster1.xaacunv.mongodb.net/fueldeliverysystem?retryWrites=true&w=majority')

// User schema for customers
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, default: 'user' },
  lat: { type: Number, required: function() { return this.userType === 'user'; } },
  lng: { type: Number, required: function() { return this.userType === 'user'; } },
  createdAt: { type: Date, default: Date.now }
}))

// DeliveryPerson schema
const DeliveryPerson = mongoose.model('DeliveryPerson', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, default: 'delivery' },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}))

// Update the FuelRequest schema to include fuelBrand
const FuelRequest = mongoose.model('FuelRequest', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fuelType: { type: String, required: true },
  fuelBrand: { type: String }, // Added field for fuel brand
  quantity: { type: Number, required: function() { return this.fuelType !== 'battery'; } },
  batteryType: { type: String, required: function() { return this.fuelType === 'battery'; } },
  batteryCapacity: { type: String, required: function() { return this.fuelType === 'battery'; } },
  price: { type: Number, required: true },
  status: { type: String, default: 'pending' }, 
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPerson' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}))

// Bunk schema
const Bunk = mongoose.model('Bunk', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bunkName: { type: String, required: true },
  location: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  userType: { type: String, default: 'bunk' },
  availableFuels: {
    type: [String],
    default: ['petrol', 'diesel', 'gas']
  },
  prices: {
    petrol: { type: Number, default: 100.50 },
    diesel: { type: Number, default: 90.20 },
    gas: { type: Number, default: 85.50 }
  },
  inventory: {
    petrol: { type: Number, default: 5000 },
    diesel: { type: Number, default: 5000 },
    gas: { type: Number, default: 1000 }
  },
  createdAt: { type: Date, default: Date.now }
}));

// Delivery Cost schema
const DeliveryCost = mongoose.model('DeliveryCost', new mongoose.Schema({
  petrol: { type: Number, default: 50 },
  diesel: { type: Number, default: 50 },
  gas: { type: Number, default: 80 },
  battery: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
}));

// Customer Registration
app.post('/register', async (req, res) => {
  const { username, password, lat, lng } = req.body
  
  try {
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({ 
      username, 
      password: hashedPassword, 
      lat, 
      lng,
      userType: 'user'
    })
    
    res.json({ 
      success: true,
      message: 'User registered successfully', 
      user: {
        id: user._id,
        username: user.username,
        userType: user.userType
      }
    })
  } catch (error) {
    console.error('Registration Error:', error)
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

// Delivery Person Registration
app.post('/register-delivery', async (req, res) => {
  const { username, password } = req.body
  
  try {
    // Check if delivery person already exists
    const existingUser = await DeliveryPerson.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const deliveryPerson = await DeliveryPerson.create({ 
      username, 
      password: hashedPassword,
      userType: 'delivery'
    })
    
    res.json({ 
      success: true,
      message: 'Delivery person registered successfully', 
      user: {
        id: deliveryPerson._id,
        username: deliveryPerson.username,
        userType: deliveryPerson.userType
      }
    })
  } catch (error) {
    console.error('Registration Error:', error)
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

// Bunk Registration
app.post('/register-bunk', async (req, res) => {
  const { username, password, bunkName, location, lat, lng, availableFuels } = req.body;
  
  try {
    const existingBunk = await Bunk.findOne({ username });
    if (existingBunk) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const bunk = await Bunk.create({ 
      username, 
      password: hashedPassword, 
      bunkName,
      location,
      lat,
      lng,
      availableFuels: availableFuels || ['petrol', 'diesel', 'gas'],
      userType: 'bunk'
    });
    
    res.json({ 
      success: true,
      message: 'Bunk registered successfully', 
      bunk: {
        id: bunk._id,
        username: bunk.username,
        bunkName: bunk.bunkName,
        userType: bunk.userType
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Customer Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  
  try {
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' })
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password' })
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username, userType: user.userType }, 
      'your_jwt_secret_key',
      { expiresIn: '24h' }
    )
    
    res.json({ 
      success: true,
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        username: user.username,
        userType: user.userType,
        lat: user.lat,
        lng: user.lng
      }
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// Delivery Person Login
app.post('/login-delivery', async (req, res) => {
  const { username, password } = req.body
  
  try {
    const deliveryPerson = await DeliveryPerson.findOne({ username })
    if (!deliveryPerson) {
      return res.status(400).json({ message: 'Invalid username or password' })
    }
    
    const isPasswordValid = await bcrypt.compare(password, deliveryPerson.password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password' })
    }
    
    const token = jwt.sign(
      { id: deliveryPerson._id, username: deliveryPerson.username, userType: deliveryPerson.userType }, 
      'your_jwt_secret_key',
      { expiresIn: '24h' }
    )
    
    res.json({ 
      success: true,
      message: 'Login successful', 
      token,
      user: {
        id: deliveryPerson._id,
        username: deliveryPerson.username,
        userType: deliveryPerson.userType,
        isAvailable: deliveryPerson.isAvailable
      }
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// Bunk Login
app.post('/login-bunk', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const bunk = await Bunk.findOne({ username });
    if (!bunk) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    const passwordMatch = await bcrypt.compare(password, bunk.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { id: bunk._id, username: bunk.username, userType: 'bunk' },
      'your_jwt_secret_key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: bunk._id,
        username: bunk.username,
        bunkName: bunk.bunkName,
        location: bunk.location,
        lat: bunk.lat,
        lng: bunk.lng,
        userType: 'bunk'
      }
    });
  } catch (error) {
    console.error('Bunk login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Login
app.post('/login-admin', async (req, res) => {
  const { username, password } = req.body;
  
  // Hard-coded admin credentials for simplicity
  // In production, use a proper admin user from database
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { id: 'admin', username: 'admin', userType: 'admin' }, 
      'your_jwt_secret_key',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      message: 'Admin login successful', 
      token,
      user: {
        id: 'admin',
        username: 'admin',
        userType: 'admin'
      }
    });
  } else {
    res.status(400).json({ message: 'Invalid admin credentials' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, 'your_jwt_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Update the fuel-request endpoint to handle fuelBrand
app.post('/fuel-request', verifyToken, async (req, res) => {
  const { fuelType, quantity, fuelBrand, batteryType, batteryCapacity, lat, lng } = req.body;
  const userId = req.user.id;
  
  // Check if user is a customer
  if (req.user.userType !== 'user') {
    return res.status(403).json({ message: 'Only customers can create requests' });
  }
  
  try {
    let price = 0;
    
    // Calculate price based on request type
    if (fuelType === 'battery') {
      // Price calculation for batteries
      switch(batteryCapacity) {
        case '12V':
          price = 1200;
          break;
        case '24V':
          price = 2400;
          break;
        case '48V':
          price = 4800;
          break;
        case 'AA':
          price = 120;
          break;
        case 'AAA':
          price = 100;
          break;
        case '9V':
          price = 300;
          break;
        default:
          price = 1000;
      }
      
      if (batteryType === 'lithium-ion') {
        price *= 1.5; 
      }
    } else {
      // Calculate price for fuel based on type and quantity
      let pricePerLiter = 0;
      switch (fuelType) {
        case 'petrol':
          pricePerLiter = 100.50;  
          break;
        case 'diesel':
          pricePerLiter = 90.20;   
          break;
        default:
          pricePerLiter = 95.00;   
      }
      
      // Add premium for premium brands
      if (fuelBrand && (fuelBrand.includes('Shell') || fuelBrand.includes('V-Power'))) {
        pricePerLiter *= 1.1; // 10% premium
      }
      
      price = pricePerLiter * quantity;
    }
    
    const requestData = {
      userId,
      fuelType,
      price,
      lat,
      lng
    };
    
    // Add type-specific fields
    if (fuelType === 'battery') {
      requestData.batteryType = batteryType;
      requestData.batteryCapacity = batteryCapacity;
    } else {
      requestData.quantity = quantity;
      requestData.fuelBrand = fuelBrand; // Save the fuel brand
    }
    
    const fuelRequest = await FuelRequest.create(requestData);
    
    res.json({ 
      success: true,
      message: `${fuelType === 'battery' ? 'Battery' : 'Fuel'} request created successfully`,
      request: fuelRequest
    });
  } catch (error) {
    console.error('Request Error:', error);
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
})

// Get all pending fuel requests (for delivery personnel)
app.get('/fuel-requests', verifyToken, async (req, res) => {
  if (req.user.userType !== 'delivery') {
    return res.status(403).json({ message: 'Only delivery personnel can view all requests' })
  }
  
  try {
    const requests = await FuelRequest.find({ 
      status: 'pending'
    }).populate('userId', 'username').sort({ createdAt: -1 })
    
    res.json({ 
      success: true,
      requests
    })
  } catch (error) {
    console.error('Fetch Requests Error:', error)
    res.status(500).json({ message: 'Failed to fetch fuel requests', error: error.message })
  }
})

// Get user's own fuel requests (for customers)
app.get('/my-requests', verifyToken, async (req, res) => {
  if (req.user.userType !== 'user') {
    return res.status(403).json({ message: 'Only customers can view their requests' })
  }
  
  try {
    const requests = await FuelRequest.find({ 
      userId: req.user.id
    }).populate('deliveryPersonId', 'username').sort({ createdAt: -1 })
    
    res.json({ 
      success: true,
      requests
    })
  } catch (error) {
    console.error('Fetch User Requests Error:', error)
    res.status(500).json({ message: 'Failed to fetch your fuel requests', error: error.message })
  }
})

// Get delivery person's assigned fuel requests
app.get('/my-deliveries', verifyToken, async (req, res) => {
  if (req.user.userType !== 'delivery') {
    return res.status(403).json({ message: 'Only delivery personnel can view their deliveries' })
  }
  
  try {
    const requests = await FuelRequest.find({ 
      deliveryPersonId: req.user.id,
      status: { $in: ['accepted', 'in-transit'] }
    }).populate('userId', 'username').sort({ updatedAt: -1 })
    
    res.json({ 
      success: true,
      requests
    })
  } catch (error) {
    console.error('Fetch Deliveries Error:', error)
    res.status(500).json({ message: 'Failed to fetch your deliveries', error: error.message })
  }
})

// Update request status (for delivery personnel)
app.put('/fuel-request/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  
  // Check if user is delivery personnel
  if (req.user.userType !== 'delivery') {
    return res.status(403).json({ message: 'Only delivery personnel can update request status' })
  }
  
  try {
    const request = await FuelRequest.findById(id)
    if (!request) {
      return res.status(404).json({ message: 'Fuel request not found' })
    }
    
    // If status is being changed to 'accepted', assign this delivery person
    if (status === 'accepted' && request.status === 'pending') {
      request.deliveryPersonId = req.user.id
    }
    
    request.status = status
    request.updatedAt = Date.now()
    await request.save()
    
    res.json({ 
      success: true,
      message: 'Request status updated successfully',
      request
    })
  } catch (error) {
    console.error('Update Request Error:', error)
    res.status(500).json({ message: 'Failed to update request status', error: error.message })
  }
})

// Create order endpoint
app.post('/create-order', verifyToken, async (req, res) => {
  const { amount, currency, fuelType } = req.body;
  
  try {
    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);
    
    const options = {
      amount: amountInPaise,
      currency,
      receipt: `receipt_${new Date().getTime()}`,
      notes: {
        fuelType,
        userId: req.user.id
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

// Verify payment endpoint
app.post('/verify-payment', verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  try {
    // Create a signature verification string
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', 'VnaGncj9bcHJQZLXYuV7xSTf') 
      .update(text)
      .digest('hex');
    
    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

// Admin - Get All Users
app.get('/admin/users', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Admin - Get All Delivery Personnel
app.get('/admin/delivery-personnel', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const deliveryPersonnel = await DeliveryPerson.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, deliveryPersonnel });
  } catch (error) {
    console.error('Error fetching delivery personnel:', error);
    res.status(500).json({ message: 'Failed to fetch delivery personnel', error: error.message });
  }
});

// Admin - Get All Bunks
app.get('/admin/bunks', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const bunks = await Bunk.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, bunks });
  } catch (error) {
    console.error('Error fetching bunks:', error);
    res.status(500).json({ message: 'Failed to fetch bunks', error: error.message });
  }
});

// Admin - Get All Requests
app.get('/admin/requests', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const requests = await FuelRequest.find({})
      .populate('userId', 'username')
      .populate('deliveryPersonId', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// Admin - Get Delivery Costs
app.get('/admin/delivery-costs', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    let costs = await DeliveryCost.findOne({});
    
    // Create default costs if none exist
    if (!costs) {
      costs = await DeliveryCost.create({});
    }
    
    res.json({ success: true, costs });
  } catch (error) {
    console.error('Error fetching delivery costs:', error);
    res.status(500).json({ message: 'Failed to fetch delivery costs', error: error.message });
  }
});

// Admin - Update Delivery Costs
app.post('/admin/update-delivery-costs', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { costs } = req.body;
    
    let costsDoc = await DeliveryCost.findOne({});
    
    if (costsDoc) {
      costsDoc.petrol = costs.petrol;
      costsDoc.diesel = costs.diesel;
      costsDoc.gas = costs.gas;
      costsDoc.battery = costs.battery;
      costsDoc.updatedAt = Date.now();
      await costsDoc.save();
    } else {
      costsDoc = await DeliveryCost.create(costs);
    }
    
    res.json({ success: true, costs: costsDoc });
  } catch (error) {
    console.error('Error updating delivery costs:', error);
    res.status(500).json({ message: 'Failed to update delivery costs', error: error.message });
  }
});

// Admin - Update User
app.put('/admin/users/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const { username, userType, email, phone } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      id, 
      { username, userType, email, phone, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Admin - Delete User
app.delete('/admin/users/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Admin - Update Bunk
app.put('/admin/bunks/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const { bunkName, location, availableFuels, lat, lng } = req.body;
    
    const updatedBunk = await Bunk.findByIdAndUpdate(
      id, 
      { 
        bunkName, 
        location, 
        availableFuels, 
        lat, 
        lng,
        updatedAt: Date.now() 
      },
      { new: true }
    );
    
    if (!updatedBunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Bunk updated successfully',
      bunk: updatedBunk
    });
  } catch (error) {
    console.error('Error updating bunk:', error);
    res.status(500).json({ message: 'Failed to update bunk', error: error.message });
  }
});

// Admin - Delete Bunk
app.delete('/admin/bunks/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const deletedBunk = await Bunk.findByIdAndDelete(id);
    
    if (!deletedBunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Bunk deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bunk:', error);
    res.status(500).json({ message: 'Failed to delete bunk', error: error.message });
  }
});

// Admin - Cancel Request
app.delete('/admin/requests/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const updatedRequest = await FuelRequest.findByIdAndUpdate(
      id,
      { status: 'cancelled', updatedAt: Date.now() },
      { new: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Request cancelled successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Failed to cancel request', error: error.message });
  }
});

// Bunk - Get Details
app.get('/bunk/details', verifyToken, async (req, res) => {
  if (req.user.userType !== 'bunk') {
    return res.status(403).json({ message: 'Only bunk can access this resource' });
  }
  
  try {
    const bunk = await Bunk.findById(req.user.id);
    if (!bunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    res.json({ 
      success: true, 
      prices: bunk.prices,
      inventory: bunk.inventory
    });
  } catch (error) {
    console.error('Error fetching bunk details:', error);
    res.status(500).json({ message: 'Failed to fetch bunk details', error: error.message });
  }
});

// Update Fuel Prices
app.post('/bunk/update-prices', verifyToken, async (req, res) => {
  try {
    // Check if the user is a bunk
    if (req.user.userType !== 'bunk') {
      return res.status(403).json({ message: 'Access denied. Not a bunk account.' });
    }
    
    const { prices } = req.body;
    
    const bunk = await Bunk.findById(req.user.id);
    if (!bunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    bunk.prices = prices;
    await bunk.save();
    
    res.json({ success: true, message: 'Prices updated successfully', prices });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ message: 'Error updating prices', error: error.message });
  }
});

// Update Fuel Inventory
app.post('/bunk/update-inventory', verifyToken, async (req, res) => {
  try {
    // Check if the user is a bunk
    if (req.user.userType !== 'bunk') {
      return res.status(403).json({ message: 'Access denied. Not a bunk account.' });
    }
    
    const { inventory } = req.body;
    
    const bunk = await Bunk.findById(req.user.id);
    if (!bunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    bunk.inventory = inventory;
    await bunk.save();
    
    res.json({ success: true, message: 'Inventory updated successfully', inventory });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Error updating inventory', error: error.message });
  }
});

// Get Requests for Bunk
app.get('/bunk/requests', verifyToken, async (req, res) => {
  try {
    // Check if the user is a bunk
    if (req.user.userType !== 'bunk') {
      return res.status(403).json({ message: 'Access denied. Not a bunk account.' });
    }
    
    const bunk = await Bunk.findById(req.user.id);
    if (!bunk) {
      return res.status(404).json({ message: 'Bunk not found' });
    }
    
    // Find all fuel requests that match bunk's available fuels
    const requests = await FuelRequest.find({
      fuelType: { $in: bunk.availableFuels },
      status: 'pending'
    }).populate('userId', 'username').sort({ createdAt: -1 });
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

// Get all approved fuel requests that need delivery assignment
app.get('/approved-requests', verifyToken, async (req, res) => {
  if (req.user.userType !== 'delivery') {
    return res.status(403).json({ message: 'Only delivery personnel can view approved requests' });
  }
  
  try {
    const requests = await FuelRequest.find({ 
      status: 'approved',
      deliveryPersonId: { $exists: false }
    }).populate('userId', 'username').sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      requests
    });
  } catch (error) {
    console.error('Fetch Approved Requests Error:', error);
    res.status(500).json({ message: 'Failed to fetch approved requests', error: error.message });
  }
});

// Assign request to delivery person
app.put('/assign-delivery/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  if (req.user.userType !== 'delivery') {
    return res.status(403).json({ message: 'Only delivery personnel can accept deliveries' });
  }
  
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.user.id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    // Check if delivery person is available
    if (!deliveryPerson.isAvailable) {
      return res.status(400).json({ message: 'You already have an active delivery' });
    }
    
    const request = await FuelRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if request is in approved state
    if (request.status !== 'approved') {
      return res.status(400).json({ 
        message: `Cannot accept request in ${request.status} state` 
      });
    }
    
    // Assign delivery person to request
    request.deliveryPersonId = req.user.id;
    request.status = 'in-transit';
    request.updatedAt = Date.now();
    await request.save();
    
    // Update delivery person's availability
    deliveryPerson.isAvailable = false;
    await deliveryPerson.save();
    
    res.json({
      success: true,
      message: 'Delivery assigned successfully',
      request
    });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ message: 'Failed to assign delivery', error: error.message });
  }
});

// Bunk - Approve Fuel Request
app.put('/fuel-request/:id/approve', verifyToken, async (req, res) => {
  try {
    // Check if the user is a bunk
    if (req.user.userType !== 'bunk') {
      return res.status(403).json({ message: 'Access denied. Only bunks can approve requests.' });
    }
    
    const { id } = req.params;
    const request = await FuelRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if request is in pending state
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot approve request in ${request.status} state` 
      });
    }
    
    // Update the request status to 'approved'
    request.status = 'approved';
    request.updatedAt = Date.now();
    await request.save();
    
    // Find all available delivery personnel
    const availableDelivery = await DeliveryPerson.find({ isAvailable: true });
    
    res.json({
      success: true,
      message: 'Request approved successfully',
      request,
      deliveryOptions: availableDelivery.length
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

// Admin - Approve Request
app.put('/admin/approve-request/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this resource' });
  }
  
  try {
    const { id } = req.params;
    const request = await FuelRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if request is in pending state
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot approve request in ${request.status} state` 
      });
    }
    
    // Update the request status to 'approved'
    request.status = 'approved';
    request.updatedAt = Date.now();
    await request.save();
    
    res.json({
      success: true,
      message: 'Request approved successfully',
      request
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))