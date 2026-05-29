const express = require('express');
const {
    addFavourite,
    removeFavourite,
    getFavourites
} = require('../controllers/favouriteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getFavourites);
router.post('/:propertyId', protect, addFavourite);
router.delete('/:propertyId', protect, removeFavourite);

module.exports = router;
