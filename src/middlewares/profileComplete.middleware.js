const User = require('../models/User');

/**
 * Middleware: Require profile completion before allowing the action.
 * Must be used AFTER the `authenticate` middleware (needs req.user.userId).
 */
const requireProfileComplete = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('roll_number course batch semester');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.is_profile_complete) {
            return res.status(403).json({
                success: false,
                message: 'Please complete your profile first to unlock this feature.',
                profileIncomplete: true,
            });
        }

        next();
    } catch (error) {
        console.error('Profile complete middleware error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = requireProfileComplete;
