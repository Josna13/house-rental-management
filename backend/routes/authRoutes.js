const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['Owner', 'User']).withMessage('Role must be Owner or User'),
    body('phone').notEmpty().withMessage('Phone is required')
], registerUser);

router.post('/login', [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required')
], loginUser);

router.get('/profile', protect, getUserProfile);

module.exports = router;
