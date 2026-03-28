require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');
const Banner = require('../models/Banner.model');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ZINGER_clone');
  console.log('MongoDB connected for seeding');
};

const categories = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: '🥦', color: '#22c55e', sortOrder: 1 },
  { name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🥛', color: '#eab308', sortOrder: 2 },
  { name: 'Snacks & Munchies', slug: 'snacks-munchies', icon: '🍿', color: '#f97316', sortOrder: 3 },
  { name: 'Beverages', slug: 'beverages', icon: '🧃', color: '#06b6d4', sortOrder: 4 },
  { name: 'Bakery & Bread', slug: 'bakery-bread', icon: '🍞', color: '#d97706', sortOrder: 5 },
  { name: 'Breakfast & Cereals', slug: 'breakfast-cereals', icon: '🥣', color: '#8b5cf6', sortOrder: 6 },
  { name: 'Atta & Rice', slug: 'atta-rice', icon: '🌾', color: '#ca8a04', sortOrder: 7 },
  { name: 'Cleaning Essentials', slug: 'cleaning-essentials', icon: '🧹', color: '#0ea5e9', sortOrder: 8 },
  { name: 'Personal Care', slug: 'personal-care', icon: '🧴', color: '#ec4899', sortOrder: 9 },
  { name: 'Frozen Foods', slug: 'frozen-foods', icon: '🧊', color: '#60a5fa', sortOrder: 10 },
];

const seed = async () => {
  await connectDB();

  console.log('🌱 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Banner.deleteMany({}),
  ]);

  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
  const customerPassword = await bcrypt.hash('Customer@123', 12);
  const deliveryPassword = await bcrypt.hash('Delivery@123', 12);

  const [admin, customer, deliveryPartner] = await User.insertMany([
    {
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@zinger.in',
      password: adminPassword,
      role: 'admin',
      isEmailVerified: true,
      phone: '9000000001',
    },
    {
      name: 'Test Customer',
      email: 'customer@test.com',
      password: customerPassword,
      role: 'customer',
      isEmailVerified: true,
      phone: '9000000002',
      addresses: [
        {
          label: 'Home',
          fullName: 'Test Customer',
          phone: '9000000002',
          street: '123 MG Road',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          isDefault: true,
        },
      ],
    },
    {
      name: 'Raju Delivery',
      email: 'delivery@test.com',
      password: deliveryPassword,
      role: 'delivery',
      isEmailVerified: true,
      phone: '9000000003',
      vehicleType: 'bike',
      vehicleNumber: 'MP09AB1234',
      isAvailable: true,
    },
  ]);

  console.log('📁 Creating categories...');
  const createdCategories = await Category.insertMany(categories);
  const catMap = {};
  createdCategories.forEach((c) => (catMap[c.slug] = c._id));

  console.log('🛒 Creating products...');
  const products = [
    // ── Fruits & Vegetables ───────────────────────────────────────────
    { name: 'Fresh Tomatoes', description: 'Farm fresh red tomatoes, rich in lycopene and vitamins. Perfect for curries and salads.', price: 40, discountPercent: 10, category: catMap['fruits-vegetables'], brand: 'Farm Fresh', unit: 'kg', weight: '500g', stock: 100, tags: ['tomato','vegetable','fresh'], isTrending: true, rating: 4.3, numReviews: 23 },
    { name: 'Organic Spinach', description: 'Tender organic spinach leaves, great for salads, smoothies and Indian dishes.', price: 30, discountPercent: 0, category: catMap['fruits-vegetables'], brand: 'Organic India', unit: 'bunch', weight: '250g', stock: 60, tags: ['spinach','leafy','organic'], isFeatured: true, rating: 4.5, numReviews: 18 },
    { name: 'Banana - Robusta', description: 'Sweet and creamy Robusta bananas, rich in potassium and fiber.', price: 50, discountPercent: 5, category: catMap['fruits-vegetables'], unit: 'dozen', stock: 80, tags: ['banana','fruit'], isTrending: true, rating: 4.2, numReviews: 31 },
    { name: 'Red Onion', description: 'Fresh red onions sourced directly from Nashik farmers. Essential for every kitchen.', price: 35, discountPercent: 0, category: catMap['fruits-vegetables'], unit: 'kg', weight: '1kg', stock: 120, tags: ['onion','vegetable'], rating: 4.0, numReviews: 15 },
    { name: 'Apple - Shimla', description: 'Crispy and sweet Shimla apples, great source of fiber and antioxidants.', price: 180, discountPercent: 15, category: catMap['fruits-vegetables'], unit: 'kg', weight: '1kg', stock: 50, tags: ['apple','fruit','imported'], isFeatured: true, rating: 4.7, numReviews: 42 },
    { name: 'Carrot - Fresh', description: 'Crunchy fresh carrots, high in beta-carotene. Great for cooking and juicing.', price: 40, discountPercent: 0, category: catMap['fruits-vegetables'], unit: 'kg', weight: '500g', stock: 90, tags: ['carrot','vegetable','healthy'], rating: 4.1, numReviews: 12 },
    { name: 'Green Capsicum', description: 'Fresh green capsicum (bell pepper), adds flavor and crunch to any dish.', price: 45, discountPercent: 10, category: catMap['fruits-vegetables'], unit: 'piece', weight: '250g', stock: 70, tags: ['capsicum','pepper','vegetable'], rating: 4.2, numReviews: 9 },
    { name: 'Cauliflower', description: 'Fresh whole cauliflower, perfect for gobi sabzi, manchurian and soups.', price: 55, discountPercent: 0, category: catMap['fruits-vegetables'], unit: 'piece', weight: '600g', stock: 40, tags: ['cauliflower','gobi','vegetable'], rating: 4.0, numReviews: 8 },
    { name: 'Mango - Alphonso', description: 'King of mangoes — sweet, creamy Alphonso mangoes from Ratnagiri.', price: 299, discountPercent: 0, category: catMap['fruits-vegetables'], unit: 'dozen', weight: '12 pcs', stock: 25, tags: ['mango','alphonso','fruit','seasonal'], isFeatured: true, isTrending: true, rating: 4.9, numReviews: 67 },
    { name: 'Cucumber', description: 'Crisp, fresh cucumbers. Great in salads, raita and summer drinks.', price: 25, discountPercent: 0, category: catMap['fruits-vegetables'], unit: 'piece', weight: '2 pcs', stock: 110, tags: ['cucumber','salad','vegetable'], rating: 4.1, numReviews: 11 },

    // ── Dairy & Eggs ──────────────────────────────────────────────────
    { name: 'Amul Full Cream Milk', description: 'Rich and creamy full cream milk from Amul. Ideal for tea, coffee and sweets.', price: 68, discountPercent: 0, category: catMap['dairy-eggs'], brand: 'Amul', unit: 'liter', weight: '1L', stock: 200, tags: ['milk','dairy','amul'], isTrending: true, rating: 4.6, numReviews: 89 },
    { name: 'Farm Eggs - 6 pack', description: 'Fresh white eggs, high in protein. Pack of 6 from free-range farms.', price: 55, discountPercent: 5, category: catMap['dairy-eggs'], unit: 'pack', weight: '6 eggs', stock: 150, tags: ['eggs','protein','breakfast'], rating: 4.4, numReviews: 67 },
    { name: 'Amul Butter - Salted', description: 'Smooth and creamy Amul salted butter. Perfect for toast, cooking and baking.', price: 56, discountPercent: 0, category: catMap['dairy-eggs'], brand: 'Amul', unit: 'pack', weight: '100g', stock: 90, tags: ['butter','dairy','amul'], isFeatured: true, rating: 4.8, numReviews: 112 },
    { name: 'Britannia Paneer', description: 'Soft and fresh paneer made from pure milk. Perfect for curries, bhurji and tikka.', price: 99, discountPercent: 10, category: catMap['dairy-eggs'], brand: 'Britannia', unit: 'pack', weight: '200g', stock: 75, tags: ['paneer','dairy','protein'], rating: 4.3, numReviews: 45 },
    { name: 'Amul Dahi - Curd', description: 'Thick, creamy curd made from fresh milk. Probiotic and great for digestion.', price: 45, discountPercent: 0, category: catMap['dairy-eggs'], brand: 'Amul', unit: 'pack', weight: '400g', stock: 100, tags: ['curd','dahi','probiotic'], rating: 4.5, numReviews: 56 },
    { name: 'Mother Dairy Lassi', description: 'Refreshing sweet lassi made from fresh curd. A traditional Indian drink.', price: 30, discountPercent: 0, category: catMap['dairy-eggs'], brand: 'Mother Dairy', unit: 'pack', weight: '200ml', stock: 80, tags: ['lassi','drink','dairy'], isTrending: true, rating: 4.4, numReviews: 34 },
    { name: 'Amul Cheese Slices', description: 'Individually wrapped processed cheese slices. Perfect for sandwiches and burgers.', price: 115, discountPercent: 8, category: catMap['dairy-eggs'], brand: 'Amul', unit: 'pack', weight: '200g', stock: 60, tags: ['cheese','slices','amul'], rating: 4.6, numReviews: 78 },

    // ── Snacks & Munchies ─────────────────────────────────────────────
    { name: "Lay's Classic Salted", description: 'Crispy classic salted potato chips. The original that started it all.', price: 20, discountPercent: 0, category: catMap['snacks-munchies'], brand: "Lay's", unit: 'pack', weight: '26g', stock: 300, tags: ['chips','snacks','lays'], isTrending: true, rating: 4.5, numReviews: 203 },
    { name: 'Kurkure Masala Munch', description: 'Spicy and crunchy corn puffs, a popular Indian snack. Triangular and addictive.', price: 20, discountPercent: 0, category: catMap['snacks-munchies'], brand: 'Kurkure', unit: 'pack', weight: '90g', stock: 250, tags: ['kurkure','snacks','spicy'], isTrending: true, rating: 4.4, numReviews: 178 },
    { name: 'Parle-G Biscuits', description: "World's largest selling glucose biscuit. A timeless Indian classic loved by all ages.", price: 10, discountPercent: 0, category: catMap['snacks-munchies'], brand: 'Parle', unit: 'pack', weight: '100g', stock: 500, tags: ['biscuit','parle','glucose'], isFeatured: true, rating: 4.7, numReviews: 341 },
    { name: 'Too Yumm! Multigrain Chips', description: 'Healthy multigrain chips — baked not fried. Guilt-free snacking!', price: 30, discountPercent: 10, category: catMap['snacks-munchies'], brand: 'Too Yumm', unit: 'pack', weight: '55g', stock: 180, tags: ['healthy','chips','baked'], rating: 4.2, numReviews: 56 },
    { name: 'Haldiram Aloo Bhujia', description: 'Crispy sev made from potatoes and spices. A classic Indian namkeen.', price: 50, discountPercent: 0, category: catMap['snacks-munchies'], brand: 'Haldiram', unit: 'pack', weight: '200g', stock: 200, tags: ['bhujia','sev','namkeen','haldiram'], isTrending: true, rating: 4.6, numReviews: 145 },
    { name: 'Cadbury Dairy Milk', description: 'The iconic milk chocolate bar. Smooth, creamy and irresistibly delicious.', price: 40, discountPercent: 0, category: catMap['snacks-munchies'], brand: 'Cadbury', unit: 'bar', weight: '40g', stock: 300, tags: ['chocolate','cadbury','sweet'], isFeatured: true, rating: 4.8, numReviews: 256 },
    { name: 'Britannia Marie Gold', description: 'Light and crispy Marie biscuits. Perfect with tea or as a quick snack.', price: 25, discountPercent: 0, category: catMap['snacks-munchies'], brand: 'Britannia', unit: 'pack', weight: '250g', stock: 350, tags: ['biscuit','marie','tea'], rating: 4.5, numReviews: 189 },

    // ── Beverages ─────────────────────────────────────────────────────
    { name: 'Coca-Cola 750ml', description: 'Refreshing Coca-Cola — the world famous cola drink for every occasion.', price: 45, discountPercent: 0, category: catMap['beverages'], brand: 'Coca-Cola', unit: 'bottle', weight: '750ml', stock: 200, tags: ['cola','cold drink','soda'], isTrending: true, rating: 4.5, numReviews: 145 },
    { name: 'Real Fruit Juice - Orange', description: 'Refreshing orange juice with no added preservatives. 100% real fruit goodness.', price: 99, discountPercent: 15, category: catMap['beverages'], brand: 'Real', unit: 'tetra pack', weight: '1L', stock: 100, tags: ['juice','orange','fruit'], isFeatured: true, rating: 4.3, numReviews: 78 },
    { name: 'Red Bull Energy Drink', description: 'Red Bull gives you wings! Energy drink for an active, on-the-go lifestyle.', price: 125, discountPercent: 0, category: catMap['beverages'], brand: 'Red Bull', unit: 'can', weight: '250ml', stock: 80, tags: ['energy drink','caffeine','red bull'], rating: 4.6, numReviews: 89 },
    { name: 'Nescafe Classic Coffee', description: 'Rich and aromatic instant coffee. Made from 100% pure coffee beans.', price: 245, discountPercent: 10, category: catMap['beverages'], brand: 'Nescafe', unit: 'jar', weight: '100g', stock: 90, tags: ['coffee','nescafe','instant'], isFeatured: true, rating: 4.7, numReviews: 134 },
    { name: 'Tetley Green Tea', description: 'Refreshing green tea with natural antioxidants. 25 tea bags per pack.', price: 120, discountPercent: 5, category: catMap['beverages'], brand: 'Tetley', unit: 'pack', weight: '25 bags', stock: 120, tags: ['green tea','healthy','antioxidants'], rating: 4.4, numReviews: 67 },
    { name: 'Tropicana Mixed Fruit', description: 'Blend of tropical fruits — mango, pineapple, guava. No added sugar.', price: 85, discountPercent: 12, category: catMap['beverages'], brand: 'Tropicana', unit: 'pack', weight: '1L', stock: 95, tags: ['juice','mixed fruit','tropical'], rating: 4.3, numReviews: 45 },

    // ── Bakery & Bread ────────────────────────────────────────────────
    { name: 'Britannia Bread - Brown', description: 'Whole wheat brown bread, high in fiber. Nutritious choice for daily breakfast.', price: 45, discountPercent: 5, category: catMap['bakery-bread'], brand: 'Britannia', unit: 'loaf', weight: '400g', stock: 60, tags: ['bread','brown bread','whole wheat'], isTrending: true, rating: 4.2, numReviews: 34 },
    { name: 'Monginis Chocolate Cake', description: 'Moist, rich chocolate cake — perfect for celebrations and everyday indulgence.', price: 350, discountPercent: 10, category: catMap['bakery-bread'], brand: 'Monginis', unit: 'piece', weight: '500g', stock: 25, tags: ['cake','chocolate','bakery'], isFeatured: true, rating: 4.8, numReviews: 67 },
    { name: 'Harvest Gold White Bread', description: 'Soft and fluffy white bread. Fresh daily, ideal for sandwiches and toast.', price: 35, discountPercent: 0, category: catMap['bakery-bread'], brand: 'Harvest Gold', unit: 'loaf', weight: '400g', stock: 80, tags: ['bread','white bread','soft'], rating: 4.1, numReviews: 28 },
    { name: 'Jim Jam Biscuits', description: 'Cream-filled biscuits with strawberry jam center. A childhood favorite!', price: 30, discountPercent: 0, category: catMap['bakery-bread'], brand: 'Britannia', unit: 'pack', weight: '150g', stock: 200, tags: ['biscuit','cream','jam'], rating: 4.5, numReviews: 89 },

    // ── Breakfast & Cereals ───────────────────────────────────────────
    { name: "Kellogg's Corn Flakes", description: 'Light and crispy corn flakes — a classic breakfast cereal. Ready in minutes.', price: 215, discountPercent: 8, category: catMap['breakfast-cereals'], brand: "Kellogg's", unit: 'pack', weight: '300g', stock: 80, tags: ['cornflakes','cereal','breakfast'], isFeatured: true, rating: 4.5, numReviews: 112 },
    { name: 'Quaker Oats', description: '100% whole grain rolled oats. High in fiber, keeps you full all morning.', price: 175, discountPercent: 5, category: catMap['breakfast-cereals'], brand: 'Quaker', unit: 'pack', weight: '500g', stock: 90, tags: ['oats','breakfast','healthy','fiber'], isTrending: true, rating: 4.6, numReviews: 89 },
    { name: 'Muesli - Fruit & Nut', description: 'Wholesome muesli with fruits, nuts and seeds. A power-packed healthy breakfast.', price: 299, discountPercent: 12, category: catMap['breakfast-cereals'], brand: "Kellogg's", unit: 'pack', weight: '500g', stock: 50, tags: ['muesli','fruit','nut','breakfast'], rating: 4.4, numReviews: 45 },

    // ── Atta & Rice ───────────────────────────────────────────────────
    { name: 'Aashirvaad Whole Wheat Atta', description: '100% whole wheat atta from MP wheat farms. Fresh-milled for softness and taste.', price: 275, discountPercent: 8, category: catMap['atta-rice'], brand: 'Aashirvaad', unit: 'pack', weight: '5kg', stock: 80, tags: ['atta','flour','wheat','whole wheat'], isFeatured: true, isTrending: true, rating: 4.6, numReviews: 234 },
    { name: 'India Gate Basmati Rice', description: 'Premium aged basmati rice with long slender grains and natural aroma.', price: 320, discountPercent: 10, category: catMap['atta-rice'], brand: 'India Gate', unit: 'pack', weight: '5kg', stock: 70, tags: ['rice','basmati','india gate'], isFeatured: true, rating: 4.7, numReviews: 189 },
    { name: 'Fortune Sunflower Oil', description: 'Light and healthy sunflower cooking oil. Rich in Vitamin E and good for heart.', price: 165, discountPercent: 5, category: catMap['atta-rice'], brand: 'Fortune', unit: 'bottle', weight: '1L', stock: 100, tags: ['oil','sunflower','cooking'], rating: 4.3, numReviews: 67 },
    { name: 'Toor Dal - Yellow', description: 'Premium quality toor (arhar) dal. Perfect for everyday dal tadka and sambar.', price: 145, discountPercent: 0, category: catMap['atta-rice'], unit: 'pack', weight: '1kg', stock: 120, tags: ['dal','toor','lentil','protein'], rating: 4.2, numReviews: 45 },

    // ── Personal Care ─────────────────────────────────────────────────
    { name: 'Dove Body Wash - 250ml', description: "Moisturising body wash with Dove's 1/4 moisturising cream. Leaves skin soft.", price: 185, discountPercent: 12, category: catMap['personal-care'], brand: 'Dove', unit: 'bottle', weight: '250ml', stock: 90, tags: ['body wash','dove','moisturising'], rating: 4.5, numReviews: 112 },
    { name: 'Colgate Strong Teeth Toothpaste', description: 'Anticavity toothpaste with active calcium. For stronger teeth and fresh breath.', price: 87, discountPercent: 5, category: catMap['personal-care'], brand: 'Colgate', unit: 'tube', weight: '200g', stock: 150, tags: ['toothpaste','colgate','dental'], isTrending: true, rating: 4.4, numReviews: 98 },
    { name: 'Head & Shoulders Shampoo', description: 'Anti-dandruff shampoo with Pro-Vitamin B5. Clinically proven for dandruff control.', price: 195, discountPercent: 8, category: catMap['personal-care'], brand: 'Head & Shoulders', unit: 'bottle', weight: '340ml', stock: 80, tags: ['shampoo','anti-dandruff','hair care'], rating: 4.3, numReviews: 134 },
    { name: 'Gillette Mach3 Razor', description: '3-blade razor for a smooth, close shave. Includes 1 razor + 2 cartridges.', price: 249, discountPercent: 10, category: catMap['personal-care'], brand: 'Gillette', unit: 'pack', weight: '1 set', stock: 60, tags: ['razor','shaving','gillette'], rating: 4.6, numReviews: 78 },

    // ── Cleaning Essentials ───────────────────────────────────────────
    { name: 'Vim Dishwash Liquid', description: 'Tough on grease, gentle on hands. Cleans 3X more dishes per drop.', price: 99, discountPercent: 5, category: catMap['cleaning-essentials'], brand: 'Vim', unit: 'bottle', weight: '500ml', stock: 150, tags: ['dishwash','cleaning','vim'], rating: 4.4, numReviews: 89 },
    { name: 'Harpic Toilet Cleaner', description: '10x better cleaning power. Removes stains and kills 99.9% germs.', price: 129, discountPercent: 8, category: catMap['cleaning-essentials'], brand: 'Harpic', unit: 'bottle', weight: '500ml', stock: 120, tags: ['toilet','cleaner','harpic'], rating: 4.5, numReviews: 67 },
    { name: 'Ariel Matic Powder', description: 'Specially formulated for front and top-load washing machines. Deep clean formula.', price: 280, discountPercent: 10, category: catMap['cleaning-essentials'], brand: 'Ariel', unit: 'pack', weight: '1kg', stock: 90, tags: ['detergent','washing','ariel','laundry'], isFeatured: true, rating: 4.5, numReviews: 112 },

    // ── Frozen Foods ──────────────────────────────────────────────────
    { name: 'McCain Smiles Potato', description: 'Fun-shaped crispy potato smiles — kids love them! Ready in 15 minutes.', price: 175, discountPercent: 8, category: catMap['frozen-foods'], brand: 'McCain', unit: 'pack', weight: '415g', stock: 60, tags: ['frozen','potato','kids'], isTrending: true, rating: 4.4, numReviews: 78 },
    { name: 'Amul Vanilla Ice Cream', description: 'Creamy vanilla ice cream made with real milk and natural vanilla flavour.', price: 120, discountPercent: 0, category: catMap['frozen-foods'], brand: 'Amul', unit: 'pack', weight: '500ml', stock: 45, tags: ['ice cream','vanilla','amul','frozen'], isFeatured: true, rating: 4.7, numReviews: 145 },
    { name: 'ITC Sunfeast Yumfills', description: 'Choco-filled wafer biscuits. Crispy outside, chocolatey inside.', price: 30, discountPercent: 0, category: catMap['frozen-foods'], brand: 'Sunfeast', unit: 'pack', weight: '75g', stock: 200, tags: ['wafer','chocolate','biscuit'], rating: 4.3, numReviews: 56 },
  ];

  // Auto calculate discountedPrice
  // Reliable image seeds from picsum (always loads, consistent per product)
  const PRODUCT_IMAGES = {
    // Fruits & Vegetables
    'Fresh Tomatoes':                   'https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=400&h=400&fit=crop',
    'Organic Spinach':                  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop',
    'Banana - Robusta':                 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=400&fit=crop',
    'Red Onion':                        'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=400&h=400&fit=crop',
    'Apple - Shimla':                   'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
    'Carrot - Fresh':                   'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop',
    'Green Capsicum':                   'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop',
    'Cauliflower':                      'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=400&fit=crop',
    'Mango - Alphonso':                 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop',
    'Cucumber':                         'https://images.unsplash.com/photo-1593593521015-a1d11d03d6e9?w=400&h=400&fit=crop',
    // Dairy
    'Amul Full Cream Milk':             'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'Farm Eggs - 6 pack':               'https://images.unsplash.com/photo-1491524062933-cb0289261700?w=400&h=400&fit=crop',
    'Amul Butter - Salted':             'https://images.unsplash.com/photo-1589985270826-4b952aadcc3e?w=400&h=400&fit=crop',
    'Britannia Paneer':                 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop',
    'Amul Dahi - Curd':                 'https://images.unsplash.com/photo-1571211905393-574a4bca7a4d?w=400&h=400&fit=crop',
    'Mother Dairy Lassi':               'https://images.unsplash.com/photo-1610478922382-f95bd09cca42?w=400&h=400&fit=crop',
    'Amul Cheese Slices':               'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=400&h=400&fit=crop',
    // Snacks
    'Organic Spinach':             'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop',
    'Banana - Robusta':            'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=400&fit=crop',
    'Red Onion':                   'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=400&h=400&fit=crop',
    'Apple - Shimla':              'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
    'Amul Full Cream Milk':        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'Farm Eggs - 6 pack':          'https://images.unsplash.com/photo-1491524062933-cb0289261700?w=400&h=400&fit=crop',
    'Amul Butter - Salted':        'https://images.unsplash.com/photo-1589985270826-4b952aadcc3e?w=400&h=400&fit=crop',
    'Britannia Paneer':            'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop',
    "Lay's Classic Salted":        'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
    'Kurkure Masala Munch':        'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&h=400&fit=crop',
    'Parle-G Biscuits':            'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    'Too Yumm! Multigrain Chips':  'https://images.unsplash.com/photo-1604908177522-2f46d2c5d26f?w=400&h=400&fit=crop',
    'Coca-Cola 750ml':             'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
    'Real Fruit Juice - Orange':   'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
    'Red Bull Energy Drink':       'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop',
    'Britannia Bread - Brown':     'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'Monginis Chocolate Cake':     'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    'Aashirvaad Whole Wheat Atta': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
    'India Gate Basmati Rice':     'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'Dove Body Wash - 250ml':      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    'Colgate Strong Teeth Toothpaste': 'https://images.unsplash.com/photo-1559591937-68c7ea2bf7f5?w=400&h=400&fit=crop',
    // Additional products
    "Lay's Classic Salted":             'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
    'Kurkure Masala Munch':             'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&h=400&fit=crop',
    'Parle-G Biscuits':                 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    'Too Yumm! Multigrain Chips':       'https://images.unsplash.com/photo-1604908177522-2f46d2c5d26f?w=400&h=400&fit=crop',
    'Haldiram Aloo Bhujia':             'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    'Cadbury Dairy Milk':               'https://images.unsplash.com/photo-1572335887374-53e85fc6f30e?w=400&h=400&fit=crop',
    'Britannia Marie Gold':             'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    'Coca-Cola 750ml':                  'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
    'Real Fruit Juice - Orange':        'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
    'Red Bull Energy Drink':            'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop',
    'Nescafe Classic Coffee':           'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&h=400&fit=crop',
    'Tetley Green Tea':                 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
    'Tropicana Mixed Fruit':            'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
    'Britannia Bread - Brown':          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'Monginis Chocolate Cake':          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    'Harvest Gold White Bread':         'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop',
    'Jim Jam Biscuits':                 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    "Kellogg's Corn Flakes":            'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400&h=400&fit=crop',
    'Quaker Oats':                      'https://images.unsplash.com/photo-1504877020292-31fa7f7a6e7e?w=400&h=400&fit=crop',
    'Muesli - Fruit & Nut':             'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=400&fit=crop',
    'Aashirvaad Whole Wheat Atta':      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
    'India Gate Basmati Rice':          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'Fortune Sunflower Oil':            'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
    'Toor Dal - Yellow':                'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop',
    'Dove Body Wash - 250ml':           'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    'Head & Shoulders Shampoo':         'https://images.unsplash.com/photo-1527799820374-87936aa822ba?w=400&h=400&fit=crop',
    'Gillette Mach3 Razor':             'https://images.unsplash.com/photo-1621951753015-740c699ab970?w=400&h=400&fit=crop',
    'Vim Dishwash Liquid':              'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    'Harpic Toilet Cleaner':            'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    'Ariel Matic Powder':               'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop',
    'McCain Smiles Potato':             'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=400&h=400&fit=crop',
    'Amul Vanilla Ice Cream':           'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
    'ITC Sunfeast Yumfills':            'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
  }

  const DEFAULT_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop'

  const productsWithPrices = products.map((p) => ({
    ...p,
    discountedPrice: p.discountPercent > 0
      ? Math.round(p.price - (p.price * p.discountPercent) / 100)
      : p.price,
    images: [{ url: PRODUCT_IMAGES[p.name] || DEFAULT_IMG, publicId: '' }],
  }));

  await Product.insertMany(productsWithPrices);

  console.log('🎟️ Creating coupons...');
  await Coupon.insertMany([
    {
      code: 'WELCOME50',
      description: '50% off on your first order (max ₹100)',
      discountType: 'percentage',
      discountValue: 50,
      maxDiscount: 100,
      minOrderAmount: 199,
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      firstTimeOnly: true,
      totalUsageLimit: 1000,
    },
    {
      code: 'FLAT40',
      description: '₹40 off on orders above ₹299',
      discountType: 'flat',
      discountValue: 40,
      minOrderAmount: 299,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalUsageLimit: 500,
    },
    {
      code: 'SAVE20',
      description: '20% off up to ₹80',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: 80,
      minOrderAmount: 149,
      expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      totalUsageLimit: 2000,
    },
  ]);

  console.log('🖼️  Creating banners...');
  await Banner.insertMany([
    { title: 'Fresh Groceries in 30 Minutes', subtitle: 'Order now and get free delivery on orders above ₹199', isActive: true, sortOrder: 1 },
    { title: '50% Off on First Order', subtitle: 'Use code WELCOME50 at checkout', isActive: true, sortOrder: 2 },
    { title: 'Premium Fruits & Vegetables', subtitle: 'Fresh from farms to your doorstep', isActive: true, sortOrder: 3 },
  ]);

  console.log('\n✅ Seeding complete!');
  console.log('─────────────────────────────────────');
  console.log(`Admin Email   : ${process.env.ADMIN_EMAIL || 'admin@zinger.in'}`);
  console.log(`Admin Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
  console.log(`Customer Email: customer@test.com`);
  console.log(`Customer Pass : Customer@123`);
  console.log(`Delivery Email: delivery@test.com`);
  console.log(`Delivery Pass : Delivery@123`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
