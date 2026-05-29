const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null }
}, { timestamps: true });

reviewSchema.index({ user_id: 1, property_id: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

// Add or update a review (upsert)
const addReview = async (userId, propertyId, rating, comment) => {
    const result = await Review.findOneAndUpdate(
        { user_id: userId, property_id: propertyId },
        { rating, comment: comment || null },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return result._id;
};

// Get reviews for a property
const getReviewsByProperty = async (propertyId) => {
    const reviews = await Review.find({ property_id: propertyId })
        .populate('user_id', 'name')
        .sort({ createdAt: -1 });

    return reviews.map(r => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.createdAt,
        user_name: r.user_id?.name
    }));
};

// Get average rating for a property
const getAverageRating = async (propertyId) => {
    const result = await Review.aggregate([
        { $match: { property_id: new mongoose.Types.ObjectId(propertyId) } },
        { $group: { _id: '$property_id', avg_rating: { $avg: '$rating' }, total: { $sum: 1 } } }
    ]);

    if (result.length === 0) return { averageRating: null, totalReviews: 0 };
    return {
        averageRating: result[0].avg_rating ? parseFloat(result[0].avg_rating).toFixed(1) : null,
        totalReviews: result[0].total
    };
};

module.exports = { Review, addReview, getReviewsByProperty, getAverageRating };
