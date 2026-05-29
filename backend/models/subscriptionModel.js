const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, default: null },
    property_type: { type: String, default: null },
    gender_preference: { type: String, enum: ['Boys', 'Girls', 'Anyone', null], default: null },
    max_budget: { type: Number, default: null }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

const createSubscription = async (userId, location, propertyType, genderPreference, maxBudget) => {
    const sub = await Subscription.create({
        user_id: userId,
        location: location || null,
        property_type: propertyType || null,
        gender_preference: genderPreference || null,
        max_budget: maxBudget || null
    });
    return sub._id;
};

const getSubscriptionsByUser = async (userId) => {
    return await Subscription.find({ user_id: userId }).sort({ createdAt: -1 });
};

const deleteSubscription = async (id, userId) => {
    const result = await Subscription.deleteOne({ _id: id, user_id: userId });
    return result.deletedCount;
};

const findMatchingSubscriptions = async () => {
    return await Subscription.find().populate('user_id', 'email phone');
};

module.exports = {
    Subscription,
    createSubscription,
    getSubscriptionsByUser,
    deleteSubscription,
    findMatchingSubscriptions
};
