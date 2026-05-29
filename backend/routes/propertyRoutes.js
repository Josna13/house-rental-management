const express = require('express');
const {
    getProperties,
    getOwnerProperties,
    getProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    getRecommendedProperties,
    getFairPriceEstimate
} = require('../controllers/propertyController');
const { protect, ownerCheck } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.route('/')
    .get(getProperties)
    .post(protect, ownerCheck, upload.array('images', 5), createProperty);

router.route('/owner')
    .get(protect, ownerCheck, getOwnerProperties);

// Must be above /:id
router.route('/recommendations')
    .get(protect, getRecommendedProperties)
    .post(protect, getRecommendedProperties);

router.route('/fair-price')
    .post(getFairPriceEstimate);

const reviewRouter = require('./reviewRoutes');

router.route('/:id')
    .get(getProperty)
    .put(protect, ownerCheck, upload.array('images', 5), updateProperty)
    .delete(protect, ownerCheck, deleteProperty);

// Re-route into review router
router.use('/:id/reviews', reviewRouter);

module.exports = router;
