const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/userModel');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const registerUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation error', errors: errors.array() });
        }

        const { name, email, password, role, phone } = req.body;

        // Check if user exists
        const userExists = await UserModel.findUserByEmail(email);
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userId = await UserModel.createUser(name, email, hashedPassword, role, phone);
        if (userId) {
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: userId.toString(),
                    name,
                    email,
                    role,
                    phone
                },
                token: generateToken(userId.toString(), role)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        next(error);
    }
};

const loginUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation error', errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await UserModel.findUserByEmail(email);

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                message: 'Logged in successfully',
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone
                },
                token: generateToken(user._id.toString(), user.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        const user = await UserModel.findUserById(req.user.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};
