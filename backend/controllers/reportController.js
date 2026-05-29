const { Property } = require('../models/propertyModel');
const { Booking } = require('../models/bookingModel');

// @desc    Get owner dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Owner only)
const getDashboardStats = async (req, res, next) => {
    try {
        const ownerId = req.user.id;

        // Total Properties
        const totalProperties = await Property.countDocuments({ owner_id: ownerId });

        // Get all property IDs owned by this owner
        const ownerProperties = await Property.find({ owner_id: ownerId }).select('_id rent status');
        const propertyIds = ownerProperties.map(p => p._id);

        // Total Booking Requests
        const totalBookingRequests = await Booking.countDocuments({ property_id: { $in: propertyIds } });

        // Total Approved Bookings
        const totalApprovedBookings = await Booking.countDocuments({ property_id: { $in: propertyIds }, status: 'approved' });

        // Monthly Income (approved bookings this month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const approvedThisMonth = await Booking.find({
            property_id: { $in: propertyIds },
            status: 'approved',
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).select('property_id');

        let monthlyIncome = 0;
        for (const b of approvedThisMonth) {
            const prop = ownerProperties.find(p => p._id.toString() === b.property_id.toString());
            if (prop) monthlyIncome += (prop.rent || 0);
        }

        // Property Status Breakdown
        const availableCount = ownerProperties.filter(p => p.status === 'active' || p.status === 'available').length;
        const bookedCount = ownerProperties.filter(p => p.status === 'booked').length;

        res.json({
            totalProperties,
            totalBookingRequests,
            totalApprovedBookings,
            monthlyIncome,
            propertyStatus: {
                available: availableCount,
                booked: bookedCount
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
