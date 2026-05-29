const PropertyModel = require('../models/propertyModel');
const SubscriptionModel = require('../models/subscriptionModel');
const { Notification } = require('../models/notificationModel');

/**
 * Safely parse a latitude/longitude value coming from multipart/form-data.
 * FormData always serialises JS null as the string "null", which Mongoose
 * cannot cast to Number. Return an actual null for any non-numeric input.
 */
const parseCoord = (val) => {
    if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
    const n = parseFloat(val);
    return isFinite(n) ? n : null;
};

const triggerVacancyAlerts = async (propertyId, propData) => {
    try {
        console.log(`Checking for matching users for property ${propertyId}...`);
        const subs = await SubscriptionModel.findMatchingSubscriptions();

        for (const sub of subs) {
            let match = true;
            const userId = sub.user_id?._id || sub.user_id;

            // location match
            if (sub.location && !propData.location.toLowerCase().includes(sub.location.toLowerCase())) {
                match = false;
            }
            // type match
            if (sub.property_type && sub.property_type !== propData.type) {
                match = false;
            }
            // gender match (case-insensitive)
            if (sub.gender_preference && propData.vacancy_for) {
                const propGender = propData.vacancy_for.toLowerCase();
                const subGender = sub.gender_preference.toLowerCase();
                if (propGender !== subGender && propGender !== 'anyone') {
                    match = false;
                }
            } else if (sub.gender_preference && !propData.vacancy_for) {
                match = false;
            }
            // budget match
            if (sub.max_budget && propData.rent > sub.max_budget) {
                match = false;
            }

            // check if there is an actual vacancy available
            if (!propData.vacancy_count || propData.vacancy_count <= 0) {
                match = false;
            }

            if (match) {
                console.log(`Match found -> sending notification to User ${userId}`);
                const message = `New vacancy available for ${propData.vacancy_for || 'Anyone'} in your preferred area: ${propData.type} at ${propData.location}.`;
                await Notification.create({ user_id: userId, message, type: 'new_property', property_id: propertyId });
            }
        }
    } catch (e) {
        console.error('Error triggering vacancy alerts:', e);
    }
};

const appendTrustScore = (property) => {
    let score = 0;
    let factors = [];

    if (property.owner_email && property.owner_phone) {
        score += 25;
        factors.push("✔ Verified Owner");
    } else if (property.owner_email || property.owner_phone) {
        score += 10;
        factors.push("✔ Partially Verified");
    } else {
        factors.push("⚠ Unverified Owner");
    }

    const rating = parseFloat(property.average_rating) || 0;
    const reviewScore = (rating / 5) * 25;
    score += reviewScore;

    if (rating >= 4.0) {
        factors.push("✔ Positive Reviews");
    } else if (rating > 0 && rating < 3.0) {
        factors.push("⚠ Low Reviews");
    } else if (rating === 0) {
        factors.push("➖ No Reviews Yet");
    }

    score += 20;
    factors.push("✔ Stable Listing");

    let fraudScore = 30;
    if (Number(property.rent) < 3000) {
        fraudScore -= 15;
        factors.push("⚠ Price Too Low");
    } else {
        factors.push("✔ No Suspicious Activity");
    }
    score += fraudScore;

    return {
        ...property,
        trust_score: Math.round(score),
        trust_factors: factors
    };
};

// @desc    Get all properties (with optional filters)
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res, next) => {
    try {
        const filters = {
            location: req.query.location,
            type: req.query.type,
            maxRent: req.query.maxRent,
            purpose: req.query.purpose,
            vacancyOnly: req.query.vacancyOnly,
            gender: req.query.gender,
            availability: req.query.availability
        };
        const properties = await PropertyModel.getAllProperties(filters);
        const augmentedProperties = properties.map(appendTrustScore);
        res.json(augmentedProperties);
    } catch (error) {
        next(error);
    }
};

// @desc    Get Owner's properties
// @route   GET /api/properties/owner
// @access  Private (Owner only)
const getOwnerProperties = async (req, res, next) => {
    try {
        const properties = await PropertyModel.getAllProperties({ ownerId: req.user.id });
        const augmentedProperties = properties.map(appendTrustScore);
        res.json(augmentedProperties);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getProperty = async (req, res, next) => {
    try {
        const property = await PropertyModel.getPropertyById(req.params.id);

        if (property) {
            const obj = property.toObject ? property.toObject() : property;
            obj.id = obj._id;
            obj.owner_name = obj.owner_id?.name;
            obj.owner_phone = obj.owner_id?.phone;
            obj.owner_email = obj.owner_id?.email;
            res.json(appendTrustScore(obj));
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Create a property
// @route   POST /api/properties
// @access  Private (Owner only)
const createProperty = async (req, res, next) => {
    try {
        const { title, description, rent, deposit, location, type, property_purpose, compatibility_metadata, listed_by, brokerage_charge, latitude, longitude, vacancy_count, vacancy_for, availability_type, available_from_date } = req.body;

        const images = req.files ? req.files.map(file => file.path) : [];

        const propertyId = await PropertyModel.createProperty(
            req.user.id, title, description, rent, deposit, location, type, property_purpose || 'Rent', images, compatibility_metadata, listed_by, brokerage_charge, parseCoord(latitude), parseCoord(longitude), vacancy_count, vacancy_for, availability_type, available_from_date
        );

        if (vacancy_count > 0) {
            triggerVacancyAlerts(propertyId, { location, type, rent, vacancy_for, vacancy_count });
        }

        res.status(201).json({ message: 'Property created successfully', propertyId });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private (Owner only)
const updateProperty = async (req, res, next) => {
    try {
        const { title, description, rent, deposit, location, type, property_purpose, compatibility_metadata, listed_by, brokerage_charge, latitude, longitude, vacancy_count, vacancy_for, availability_type, available_from_date } = req.body;

        const property = await PropertyModel.getPropertyById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        const ownerId = property.owner_id?._id?.toString() || property.owner_id?.toString();
        if (ownerId !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this property' });
        }

        const images = req.files && req.files.length > 0 ? req.files.map(file => file.path) : null;

        await PropertyModel.updateProperty(
            req.params.id, req.user.id, title, description, rent, deposit, location, type, property_purpose || 'Rent', images, compatibility_metadata, listed_by, brokerage_charge, parseCoord(latitude), parseCoord(longitude), vacancy_count, vacancy_for, availability_type, available_from_date
        );

        if (vacancy_count > 0 && property.vacancy_count === 0) {
            triggerVacancyAlerts(req.params.id, { location, type, rent, vacancy_for, vacancy_count });
        }

        res.json({ message: 'Property updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private (Owner only)
const deleteProperty = async (req, res, next) => {
    try {
        const property = await PropertyModel.getPropertyById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        const ownerId = property.owner_id?._id?.toString() || property.owner_id?.toString();
        if (ownerId !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this property' });
        }

        await PropertyModel.deleteProperty(req.params.id, req.user.id);

        res.json({ message: 'Property removed' });
    } catch (error) {
        next(error);
    }
};

const InteractionModel = require('../models/interactionModel');

// @desc    Get recommended properties for a user
// @route   GET & POST /api/properties/recommendations AND POST /api/recommend
// @access  Private / Public
const getRecommendedProperties = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body?.user_id;
        if (!userId) return res.status(400).json({ message: "User ID missing" });

        const sessionInteractions = req.body?.interactions || [];

        // PERFORMANCE FIX: Only send the current session search interaction to FastAPI.
        // Sending 50+ historical interactions made the NLP model process huge payloads
        // causing 10-20s delays. The AI only needs the current search context to work.
        const interactionsForAI = sessionInteractions.map(item => ({
            property_id: null,
            action_type: 'search',
            metadata: item
        }));

        let recommendedIds = [];
        let isFallback = false;
        try {
            console.log(`[Node backend] Fetching AI recommendations for User ${userId}`);
            console.log(`[Node backend] Forwarding ${interactionsForAI.length} interaction(s) to FastAPI`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`http://localhost:8000/api/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, interactions: interactionsForAI }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                recommendedIds = data.recommendations || [];
                isFallback = data.is_fallback || false;
                console.log(`[Node backend] AI returned ${recommendedIds.length} recommendations (fallback: ${isFallback})`);
            } else {
                console.error('AI Service error response:', response.status);
            }
        } catch (error) {
            console.error('AI Recommendation Service unavailable. Falling back to latest properties. Error:', error.message);
        }

        let properties = [];
        const allAvailable = await PropertyModel.getAllProperties({});

        if (recommendedIds.length > 0) {
            const isObjectFormat = recommendedIds[0] !== null && typeof recommendedIds[0] === 'object';

            if (isObjectFormat) {
                properties = recommendedIds.map(item => {
                    const p = allAvailable.find(prop => prop.id?.toString() === item.id?.toString());
                    if (p) {
                        return { ...p, match_score: item.match_score, student_score: item.student_score, family_score: item.family_score, professional_score: item.professional_score, reason: item.reason, matched_attributes: item.matched_attributes };
                    }
                    return null;
                }).filter(Boolean);
            } else {
                properties = recommendedIds.map(id => allAvailable.find(p => p.id?.toString() === id?.toString())).filter(Boolean);
            }

            if (properties.length === 0 && sessionInteractions.length === 0) {
                properties = allAvailable.slice(0, 5);
            }
        } else {
            // Fallback: show top 5 available properties
            properties = allAvailable.slice(0, 5);
        }

        if (properties.length > 0) {
            properties = properties.map(appendTrustScore);
        }

        res.json({ recommendations: properties, is_fallback: isFallback });
    } catch (error) {
        next(error);
    }
};

// @desc    Get AI Fair Price Estimate
// @route   POST /api/properties/fair-price
// @access  Public
const getFairPriceEstimate = async (req, res) => {
    const { location, type } = req.body || {};

    // Validate inputs — never let undefined reach the ML service
    if (!location || typeof location !== 'string' || !type || typeof type !== 'string') {
        return res.json({ predicted_price: null, message: 'Prediction unavailable: missing location or type' });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout — fail fast

        const response = await fetch('http://localhost:8000/api/predict-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: location.trim(), type: type.trim() }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            console.warn('[fair-price] ML service returned status', response.status);
            return res.json({ predicted_price: null, message: 'Prediction unavailable' });
        }

        const data = await response.json();

        // Guard: ML might return unexpected shapes
        const price = data?.predicted_price ?? data?.price ?? null;
        return res.json({ predicted_price: price, message: price ? null : 'Prediction unavailable' });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('[fair-price] ML service timed out');
        } else {
            console.error('[fair-price] Error calling ML service:', error.message);
        }
        // Always return 200 with null so frontend never sees a 500
        return res.json({ predicted_price: null, message: 'Price prediction not available' });
    }
};

module.exports = {
    getProperties,
    getOwnerProperties,
    getProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    getRecommendedProperties,
    getFairPriceEstimate
};
