const express = require('express');
const router = express.Router();
const { Notification } = require('../models/notificationModel');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (e) {
        next(e);
    }
});

const mongoose = require('mongoose');

router.put('/:id/read', protect, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid notification ID format' });
        }
        await Notification.updateOne(
            { _id: req.params.id, user_id: req.user.id },
            { is_read: true }
        );
        res.json({ message: 'Marked as read' });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
