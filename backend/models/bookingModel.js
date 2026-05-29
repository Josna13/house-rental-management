const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

/** Safely converts a value to ObjectId; returns null if invalid */
const toObjectId = (id) => {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch {
        return null;
    }
};

const createBooking = async (propertyId, userId) => {
    const pId = toObjectId(propertyId);
    const uId = toObjectId(userId);
    if (!pId || !uId) throw new Error('Invalid property or user ID');
    const booking = await Booking.create({ property_id: pId, user_id: uId });
    return booking._id;
};

const getBookingsByOwnerId = async (ownerId) => {
    const oId = toObjectId(ownerId);
    const bookings = await Booking.find()
        .populate({
            path: 'property_id',
            match: { owner_id: oId },
            select: 'title owner_id'
        })
        .populate('user_id', 'name phone email')
        .sort({ createdAt: -1 });

    return bookings
        .filter(b => b.property_id !== null)
        .map(b => ({
            id: b._id,
            status: b.status,
            created_at: b.createdAt,
            property_title: b.property_id?.title,
            property_id: b.property_id?._id,
            user_name: b.user_id?.name,
            user_phone: b.user_id?.phone,
            user_email: b.user_id?.email
        }));
};

const getBookingsByUserId = async (userId) => {
    const uId = toObjectId(userId);
    const bookings = await Booking.find({ user_id: uId })
        .populate('property_id', 'title location rent status owner_id')
        .sort({ createdAt: -1 });

    const results = [];
    for (const b of bookings) {
        const owner = b.property_id?.owner_id
            ? await mongoose.model('User').findById(b.property_id.owner_id).select('name phone')
            : null;

        results.push({
            id: b._id,
            status: b.status,
            created_at: b.createdAt,
            property_id: b.property_id?._id,
            property_title: b.property_id?.title,
            property_location: b.property_id?.location,
            property_rent: b.property_id?.rent,
            property_status: b.property_id?.status,
            owner_id: b.property_id?.owner_id,
            owner_name: owner?.name,
            owner_phone: owner?.phone
        });
    }
    return results;
};

const getBookingById = async (id) => {
    const booking = await Booking.findById(id).populate('property_id', 'owner_id');
    if (!booking) return null;
    return {
        id: booking._id,
        property_id: booking.property_id?._id,
        user_id: booking.user_id,
        status: booking.status,
        owner_id: booking.property_id?.owner_id
    };
};

const updateBookingStatus = async (id, status) => {
    const result = await Booking.updateOne({ _id: id }, { status });
    return result.modifiedCount;
};

const checkExistingBooking = async (propertyId, userId) => {
    const pId = toObjectId(propertyId);
    const uId = toObjectId(userId);
    if (!pId || !uId) return false; // Invalid IDs → treat as no existing booking
    const booking = await Booking.findOne({ property_id: pId, user_id: uId, status: { $ne: 'rejected' } });
    return !!booking;
};

module.exports = {
    Booking,
    createBooking,
    getBookingsByOwnerId,
    getBookingsByUserId,
    getBookingById,
    updateBookingStatus,
    checkExistingBooking
};
