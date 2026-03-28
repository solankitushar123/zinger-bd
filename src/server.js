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

// Route imports
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

const app    = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io);

// Connect to MongoDB
connectDB();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
// General API — generous limit for a grocery app with many page calls
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute window
  limit: 300,                  // 300 req/min per IP (5 req/sec — plenty)
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// Auth endpoints — strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// Read-only public endpoints — very permissive (products, categories, banners)
const publicReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

app.use('/api', generalLimiter);

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Stripe webhook (needs raw body — mount BEFORE express.json) ──────────────
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/payment.controller').stripeWebhook
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/products',   publicReadLimiter, productRoutes);
app.use('/api/categories', publicReadLimiter, categoryRoutes);
app.use('/api/banners',    publicReadLimiter, bannerRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/coupons',    couponRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/delivery',   deliveryRoutes);
app.use('/api/addresses',  addressRoutes);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 ZINGER API running on :${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, server };
