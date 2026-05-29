const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            const userDoc = await UserModel.findUserById(decoded.id);
            if (userDoc) {
                req.user = { ...userDoc.toObject(), id: userDoc._id.toString() };
            }
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const ownerCheck = (req, res, next) => {
    if (req.user && req.user.role === 'Owner') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an Owner' });
    }
};

module.exports = { protect, ownerCheck };
