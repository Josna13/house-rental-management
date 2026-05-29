const ReviewModel = require('../models/reviewModel');
const PropertyModel = require('../models/propertyModel');

// @desc    Add or update a property review
// @route   POST /api/properties/:id/reviews
// @access  Private
const addReview = async (req, res, next) => {
    try {
        const propertyId = req.params.id; // From parent router
        const userId = req.user.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
        }

        // Verify property exists
        const property = await PropertyModel.getPropertyById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Prevent owners from artificially inflating their own ratings
        if (Number(property.owner_id) === Number(userId)) {
            return res.status(400).json({ message: 'Owners cannot review their own properties.' });
        }

        await ReviewModel.addReview(userId, propertyId, rating, comment);
        
        // Fetch fresh stats to update UI seamlessly
        const stats = await ReviewModel.getAverageRating(propertyId);
        res.status(201).json({ message: 'Review saved successfully', stats });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all reviews for a property
// @route   GET /api/properties/:id/reviews
// @access  Public
const getPropertyReviews = async (req, res, next) => {
    try {
        const propertyId = req.params.id;
        
        const reviews = await ReviewModel.getReviewsByProperty(propertyId);
        const stats = await ReviewModel.getAverageRating(propertyId);

        res.json({ reviews, stats });
    } catch (error) {
        next(error);
    }
};

module.exports = { addReview, getPropertyReviews };
