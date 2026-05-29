const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true }
}, { timestamps: true });

favouriteSchema.index({ user_id: 1, property_id: 1 }, { unique: true });

const Favourite = mongoose.model('Favourite', favouriteSchema);

const addFavourite = async (userId, propertyId) => {
    try {
        await Favourite.create({ user_id: userId, property_id: propertyId });
        return true;
    } catch (error) {
        if (error.code === 11000) return false;
        throw error;
    }
};

const removeFavourite = async (userId, propertyId) => {
    const result = await Favourite.deleteOne({ user_id: userId, property_id: propertyId });
    return result.deletedCount > 0;
};

const getUserFavourites = async (userId) => {
    const favs = await Favourite.find({ user_id: userId })
        .populate('property_id')
        .sort({ createdAt: -1 });

    return favs
        .filter(f => f.property_id)
        .map(f => ({
            favourite_id: f._id,
            ...f.property_id.toObject(),
            id: f.property_id._id
        }));
};

module.exports = {
    Favourite,
    addFavourite,
    removeFavourite,
    getUserFavourites
};
