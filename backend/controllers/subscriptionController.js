const SubscriptionModel = require('../models/subscriptionModel');

const createSubscription = async (req, res, next) => {
    try {
        const { location, property_type, gender_preference, max_budget } = req.body;
        
        const subId = await SubscriptionModel.createSubscription(
            req.user.id, 
            location, 
            property_type, 
            gender_preference, 
            max_budget
        );

        console.log(`Subscription saved for User ${req.user.id}: Location=${location}, Type=${property_type}, Gender=${gender_preference}`);

        res.status(201).json({ message: 'Subscription created successfully', id: subId });
    } catch (error) {
        next(error);
    }
};

const getSubscriptions = async (req, res, next) => {
    try {
        const subs = await SubscriptionModel.getSubscriptionsByUser(req.user.id);
        res.json(subs);
    } catch (error) {
        next(error);
    }
};

const deleteSubscription = async (req, res, next) => {
    try {
        const affectedRows = await SubscriptionModel.deleteSubscription(req.params.id, req.user.id);
        if (affectedRows > 0) {
            res.json({ message: 'Subscription deleted successfully' });
        } else {
            res.status(404).json({ message: 'Subscription not found' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubscription,
    getSubscriptions,
    deleteSubscription
};
