const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    message: { type: String, required: true },
    type: { type: String, default: null },
    is_read: { type: Boolean, default: false }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };
