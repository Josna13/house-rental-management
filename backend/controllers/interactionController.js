const interactionModel = require('../models/interactionModel');

// @desc    Log a user interaction (view, search, etc.)
// @route   POST /api/interactions
// @access  Private (Since we track per user_id, auth helps, though we could support anonymous later)
const recordInteraction = async (req, res) => {
    try {
        const { propertyId, actionType, metadata } = req.body;
        
        // Ensure actionType is valid
        const validActions = ['view', 'search', 'favorite', 'book'];
        if (!validActions.includes(actionType)) {
            return res.status(400).json({ message: 'Invalid action type' });
        }

        // Track interaction based on logged in user
        const userId = req.user.id;
        
        const insertId = await interactionModel.logInteraction(userId, propertyId, actionType, metadata);
        
        res.status(201).json({ success: true, interactionId: insertId });
    } catch (error) {
        console.error('Error logging interaction:', error);
        res.status(500).json({ message: 'Failed to record interaction' });
    }
};

module.exports = {
    recordInteraction
};
