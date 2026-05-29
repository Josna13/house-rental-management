const FavouriteModel = require('../models/favouriteModel');

// @desc    Add property to favourites
// @route   POST /api/favourites/:propertyId
// @access  Private (User only)
const addFavourite = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const added = await FavouriteModel.addFavourite(req.user.id, propertyId);

        if (added) {
            res.status(201).json({ message: 'Added to favourites' });
        } else {
            res.status(400).json({ message: 'Property already in favourites' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Remove property from favourites
// @route   DELETE /api/favourites/:propertyId
// @access  Private
const removeFavourite = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const removed = await FavouriteModel.removeFavourite(req.user.id, propertyId);

        if (removed) {
            res.json({ message: 'Removed from favourites' });
        } else {
            res.status(404).json({ message: 'Favourite not found' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user favourites
// @route   GET /api/favourites
// @access  Private
const getFavourites = async (req, res, next) => {
    try {
        const favourites = await FavouriteModel.getUserFavourites(req.user.id);
        res.json(favourites);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addFavourite,
    removeFavourite,
    getFavourites
};
