const express = require('express');
const router = express.Router();
const { recordInteraction } = require('../controllers/interactionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, recordInteraction);

module.exports = router;
