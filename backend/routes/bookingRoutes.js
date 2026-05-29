const express = require('express');
const {
    requestBooking,
    getMyBookings,
    getOwnerBookings,
    updateBookingStatus
} = require('../controllers/bookingController');
const { protect, ownerCheck } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, requestBooking);
router.get('/mybookings', protect, getMyBookings);
router.get('/owner', protect, ownerCheck, getOwnerBookings);
router.put('/:id/status', protect, ownerCheck, updateBookingStatus);

module.exports = router;
