const express = require('express');
const router = express.Router();
const {
    createSubscription,
    getSubscriptions,
    deleteSubscription
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createSubscription)
    .get(protect, getSubscriptions);

router.route('/:id')
    .delete(protect, deleteSubscription);

module.exports = router;
