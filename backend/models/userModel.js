const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['User', 'Owner', 'Admin'], default: 'User' },
    phone: { type: String, default: null }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

const findUserById = async (id) => {
    return await User.findById(id).select('-password');
};

const createUser = async (name, email, hashedPassword, role, phone) => {
    const user = await User.create({ name, email, password: hashedPassword, role, phone });
    return user._id;
};

module.exports = {
    User,
    findUserByEmail,
    findUserById,
    createUser
};
