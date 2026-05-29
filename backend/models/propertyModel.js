const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    rent: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    location: { type: String, required: true },
    type: { type: String },
    property_purpose: { type: String, enum: ['Rent', 'Sale'], default: 'Rent' },
    images: { type: [String], default: [] },
    compatibility_metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    listed_by: { type: String, default: 'Owner' },
    brokerage_charge: { type: Number, default: 0 },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    vacancy_count: { type: Number, default: 1 },
    vacancy_for: { type: String, enum: ['Boys', 'Girls', 'Anyone'], default: 'Anyone' },
    availability_type: { type: String, enum: ['Available Now', 'Available Soon'], default: 'Available Now' },
    available_from_date: { type: Date, default: null },
    status: { type: String, default: 'active' },
    average_rating: { type: Number, default: 0 },
    total_reviews: { type: Number, default: 0 }
}, { timestamps: true });

const Property = mongoose.model('Property', propertySchema);

const createProperty = async (ownerId, title, description, rent, deposit, location, type, propertyPurpose, images, compatibility_metadata = null, listedBy = 'Owner', brokerageCharge = 0, latitude = null, longitude = null, vacancyCount = 1, vacancyFor = 'Anyone', availabilityType = 'Available Now', availableFromDate = null) => {
    const property = await Property.create({
        owner_id: ownerId,
        title, description, rent, deposit, location, type,
        property_purpose: propertyPurpose || 'Rent',
        images,
        compatibility_metadata,
        listed_by: listedBy,
        brokerage_charge: brokerageCharge,
        latitude, longitude,
        vacancy_count: vacancyCount,
        vacancy_for: vacancyFor,
        availability_type: availabilityType,
        available_from_date: availableFromDate
    });
    return property._id;
};

const updateProperty = async (id, ownerId, title, description, rent, deposit, location, type, propertyPurpose, images, compatibility_metadata = null, listedBy = 'Owner', brokerageCharge = 0, latitude = null, longitude = null, vacancyCount = 1, vacancyFor = 'Anyone', availabilityType = 'Available Now', availableFromDate = null) => {
    const updateData = {
        title, description, rent, deposit, location, type,
        property_purpose: propertyPurpose || 'Rent',
        listed_by: listedBy,
        brokerage_charge: brokerageCharge,
        latitude, longitude,
        vacancy_count: vacancyCount,
        vacancy_for: vacancyFor,
        availability_type: availabilityType,
        available_from_date: availableFromDate
    };

    if (compatibility_metadata !== undefined && compatibility_metadata !== null) {
        updateData.compatibility_metadata = compatibility_metadata;
    }
    if (images && images.length > 0) {
        updateData.images = images;
    }

    const result = await Property.updateOne({ _id: id, owner_id: ownerId }, updateData);
    return result.modifiedCount;
};

const deleteProperty = async (id, ownerId) => {
    const result = await Property.deleteOne({ _id: id, owner_id: ownerId });
    return result.deletedCount;
};

const getPropertyById = async (id) => {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Property.findById(id).populate('owner_id', 'name phone email');
};

const getAllProperties = async (filters) => {
    const query = {};

    if (filters.location) {
        query.location = { $regex: filters.location, $options: 'i' };
    }
    if (filters.type) {
        query.type = filters.type;
        // Enforce Rent when filtering by type
        query.property_purpose = 'Rent';
    } else if (filters.purpose) {
        query.property_purpose = filters.purpose;
    }
    if (filters.maxRent) {
        query.rent = { $lte: Number(filters.maxRent) };
    }
    if (filters.ownerId) {
        query.owner_id = filters.ownerId;
    }
    if (filters.vacancyOnly === 'true' || filters.vacancyOnly === true) {
        query.vacancy_count = { $gt: 0 };
    }
    if (filters.gender) {
        query.vacancy_for = { $regex: new RegExp(`^${filters.gender}$`, 'i') };
        // When filtering by gender, always require vacancy > 0
        if (!query.vacancy_count) {
            query.vacancy_count = { $gt: 0 };
        }
    }
    if (filters.availability) {
        query.availability_type = filters.availability;
    }

    const properties = await Property.find(query)
        .populate('owner_id', 'name phone email')
        .sort({ vacancy_count: -1, createdAt: -1 });

    return properties.map(p => {
        const obj = p.toObject();
        // Flatten owner fields to match the previous SQL JOIN format
        obj.id = obj._id;
        obj.owner_name = obj.owner_id?.name;
        obj.owner_phone = obj.owner_id?.phone;
        obj.owner_email = obj.owner_id?.email;
        return obj;
    });
};

const updatePropertyStatus = async (id, status) => {
    const result = await Property.updateOne({ _id: id }, { status });
    return result.modifiedCount;
};

module.exports = {
    Property,
    createProperty,
    updateProperty,
    deleteProperty,
    getPropertyById,
    getAllProperties,
    updatePropertyStatus
};
