const express = require('express');
// mergeParams ensures we can capture :id from /api/properties/:id/reviews
const router = express.Router({ mergeParams: true }); 
const { addReview, getPropertyReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(getPropertyReviews)
    .post(protect, addReview);

module.exports = router;
