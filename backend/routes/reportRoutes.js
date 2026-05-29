const express = require('express');
const { getDashboardStats } = require('../controllers/reportController');
const { protect, ownerCheck } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, ownerCheck, getDashboardStats);

module.exports = router;
