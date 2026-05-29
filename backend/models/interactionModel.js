const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    action_type: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

const Interaction = mongoose.model('Interaction', interactionSchema);

// Insert a new interaction
const logInteraction = async (userId, propertyId, actionType, metadata) => {
    const interaction = await Interaction.create({
        user_id: userId,
        property_id: propertyId || null,
        action_type: actionType,
        metadata: metadata || null
    });
    return interaction._id;
};

// Get recent interactions for a user
const getUserInteractions = async (userId, limit = 50) => {
    return await Interaction.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = {
    Interaction,
    logInteraction,
    getUserInteractions
};
