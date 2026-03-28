require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { initSocket } = require('./socket/socketManager');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Routes
const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes     = require('./routes/cart.routes');
const orderRoutes    = require('./routes/order.routes');
const userRoutes     = require('./routes/user.routes');
const adminRoutes    = require('./routes/admin.routes');
const couponRoutes   = require('./routes/coupon.routes');
const reviewRoutes   = require('./routes/review.routes');
const paymentRoutes  = require('./routes/payment.routes');
const uploadRoutes   = require('./routes/upload.routes');
const aiRoutes       = require('./routes/ai.routes');
const bannerRoutes   = require('./routes/banner.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const addressRoutes  = require('./routes/address.routes');

const app = express();

// trust proxy (Render fix)
app.set('trust proxy', 1);

const server = http.createServer(app);

// socket
const io = initSocket(server);
app.set('io', io);

// connect DB
connectDB();


// ─────────────────────────────────────────
// 🔐 SECURITY
// ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));


// ─────────────────────────────────────────
// 🌐 CORS (FIXED)
// ─────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://zinger-ui1.vercel.app",
  "https://zinger-ui1-6dkx2xmog-tejasvi-solankis-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {

    // allow server-to-server requests or postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"]
}));


// ─────────────────────────────────────────
// 🚦 RATE LIMIT
// ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 500,
});

app.use('/api', generalLimiter);


// ─────────────────────────────────────────
// 🧾 LOGGING
// ─────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// ─────────────────────────────────────────
// 💳 STRIPE WEBHOOK
// ─────────────────────────────────────────
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/payment.controller').stripeWebhook
);


// ─────────────────────────────────────────
// 📦 BODY PARSER
// ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ─────────────────────────────────────────
// ❤️ HEALTH CHECK
// ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date(),
  });
});


// ─────────────────────────────────────────
// 🚀 API ROUTES
// ─────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', publicReadLimiter, productRoutes);
app.use('/api/categories', publicReadLimiter, categoryRoutes);
app.use('/api/banners', publicReadLimiter, bannerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/addresses', addressRoutes);


// ─────────────────────────────────────────
// 🌐 ROOT ROUTE
// ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ZINGER API is LIVE 🚀',
  });
});


// ─────────────────────────────────────────
// ❌ ERROR HANDLING
// ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);


// ─────────────────────────────────────────
// 🟢 SERVER START
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});