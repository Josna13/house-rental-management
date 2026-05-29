const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());

// Make uploads folder static to serve images
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/favourites', require('./routes/favouriteRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/interactions', require('./routes/interactionRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Custom endpoint exactly as requested by the user
const { getRecommendedProperties } = require('./controllers/propertyController');
app.post('/api/recommend', getRecommendedProperties);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
