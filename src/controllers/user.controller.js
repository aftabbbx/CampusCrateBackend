const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resource = require('../models/Resource');
const serverConfig = require('../config/server.config');
const { sendOtpEmail } = require('../config/email.config');
const generateOtp = require('../utils/generateOtp');

// ─── SIGNUP ─────────────────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { name, roll_number, email, password, phone_number, course, batch, semester } = req.body;

        if (!name || !roll_number || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, roll number, email and password are required',
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { roll_number: roll_number.toUpperCase() }],
        });

        if (existingUser) {
            if (!existingUser.is_verified) {
                const otp = generateOtp();
                existingUser.otp = await bcrypt.hash(otp, 10);
                existingUser.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
                existingUser.name = name;
                existingUser.password = await bcrypt.hash(password, 12);
                if (phone_number) existingUser.phone_number = phone_number;
                if (course) existingUser.course = course;
                if (batch) existingUser.batch = batch;
                if (semester) existingUser.semester = semester;
                await existingUser.save();

                console.log(`\n📧 OTP for ${existingUser.email}: ${otp}\n`);
                // Send email in background — don't block the response
                sendOtpEmail(existingUser.email, otp, 'signup').catch((emailErr) => {
                    console.error('Email send failed:', emailErr.message);
                });

                return res.status(200).json({
                    success: true,
                    message: 'OTP resent to your email. Please verify.',
                });
            }

            const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Roll Number';
            return res.status(409).json({
                success: false,
                message: `${field} already exists`,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);

        await User.create({
            name,
            roll_number: roll_number.toUpperCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            phone_number,
            course,
            batch,
            semester,
            is_verified: false,
            otp: hashedOtp,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        });

        console.log(`\n📧 OTP for ${email.toLowerCase()}: ${otp}\n`);
        // Send email in background — don't block the response
        sendOtpEmail(email.toLowerCase(), otp, 'signup').catch((emailErr) => {
            console.error('Email send failed:', emailErr.message);
        });

        return res.status(201).json({
            success: true,
            message: 'Signup successful. OTP sent to your email. Please verify.',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── VERIFY OTP ─────────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.otp_expires_at || user.otp_expires_at < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        user.is_verified = true;
        user.otp = undefined;
        user.otp_expires_at = undefined;
        user.last_active = new Date();
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            serverConfig.JWT_SECRET,
            { expiresIn: serverConfig.JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                _id: user._id,
                name: user.name,
                roll_number: user.roll_number,
                email: user.email,
                course: user.course,
                batch: user.batch,
                semester: user.semester,
                is_verified: user.is_verified,
                is_college_verified: user.is_college_verified,
                trust_score: user.trust_score,
                profile_image: user.profile_image,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── LOGIN ──────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found. Please signup first.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Please complete signup verification.',
            });
        }

        if (user.is_suspended) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact admin for assistance.',
                suspended: true,
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // Update last_active on login
        user.last_active = new Date();
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            serverConfig.JWT_SECRET,
            { expiresIn: serverConfig.JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                roll_number: user.roll_number,
                email: user.email,
                course: user.course,
                batch: user.batch,
                semester: user.semester,
                bio: user.bio,
                phone_number: user.phone_number,
                profile_image: user.profile_image,
                is_verified: user.is_verified,
                is_college_verified: user.is_college_verified,
                trust_score: user.trust_score,
                followers_count: user.followers?.length || 0,
                following_count: user.following?.length || 0,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── RESEND OTP ─────────────────────────────────────────────────────
const resendOtp = async (req, res) => {
    try {
        const { email, purpose } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const otp = generateOtp();
        user.otp = await bcrypt.hash(otp, 10);
        user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOtpEmail(user.email, otp, purpose || 'signup');

        return res.status(200).json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── HELPER: Compute profile completion ─────────────────────────────
const computeProfileCompletion = (user) => {
    const fields = ['name', 'email', 'roll_number', 'phone_number', 'profile_image', 'course', 'batch', 'semester', 'bio'];
    const filled = fields.filter((f) => user[f] && String(user[f]).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
};

// ─── GET ALL USERS ──────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ is_verified: true })
            .select('-password -otp -otp_expires_at')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Get all users error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET PROFILE (self) ─────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -otp -otp_expires_at');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update last_active
        user.last_active = new Date();
        await user.save();

        // Get resources count
        const resourcesCount = await Resource.countDocuments({ owner_id: user._id });

        // Get recent resources
        const recentResources = await Resource.find({ owner_id: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title category type price status createdAt');

        return res.status(200).json({
            success: true,
            user: {
                ...user.toObject(),
                followers_count: user.followers?.length || 0,
                following_count: user.following?.length || 0,
                profile_completion: computeProfileCompletion(user),
                resources_count: resourcesCount,
            },
            recentResources,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET PUBLIC PROFILE (by roll number) ────────────────────────────
const getPublicProfile = async (req, res) => {
    try {
        const { rollNumber } = req.params;

        const user = await User.findOne({ roll_number: rollNumber.toUpperCase(), is_verified: true })
            .select('-password -otp -otp_expires_at -followers -following');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.is_suspended) {
            return res.status(403).json({ success: false, message: 'This account has been suspended.' });
        }

        // Get resources count and recent resources
        const resourcesCount = await Resource.countDocuments({ owner_id: user._id });
        const recentResources = await Resource.find({ owner_id: user._id, status: 'Available' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title category type price status createdAt');

        // Get follower/following counts from the full doc
        const fullUser = await User.findById(user._id).select('followers following');

        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                roll_number: user.roll_number,
                email: user.email,
                course: user.course,
                batch: user.batch,
                semester: user.semester,
                bio: user.bio,
                profile_image: user.profile_image,
                trust_score: user.trust_score,
                is_college_verified: user.is_college_verified,
                last_active: user.last_active,
                followers_count: fullUser.followers?.length || 0,
                following_count: fullUser.following?.length || 0,
                profile_completion: computeProfileCompletion(user),
                resources_count: resourcesCount,
                createdAt: user.createdAt,
            },
            recentResources,
        });
    } catch (error) {
        console.error('Get public profile error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── UPDATE PROFILE ─────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Security check: User can only update their own profile
        if (req.user.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You can only update your own profile.' });
        }

        const { name, phone_number, course, batch, semester, bio, profile_image } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name) user.name = name;
        if (phone_number !== undefined) user.phone_number = phone_number;
        if (course !== undefined) user.course = course;
        if (batch !== undefined) user.batch = batch;
        if (semester !== undefined) user.semester = semester;
        if (bio !== undefined) user.bio = bio;
        if (profile_image !== undefined) user.profile_image = profile_image;
        user.last_active = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                roll_number: user.roll_number,
                email: user.email,
                phone_number: user.phone_number,
                course: user.course,
                batch: user.batch,
                semester: user.semester,
                bio: user.bio,
                profile_image: user.profile_image,
                is_verified: user.is_verified,
                is_college_verified: user.is_college_verified,
                trust_score: user.trust_score,
                followers_count: user.followers?.length || 0,
                following_count: user.following?.length || 0,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── FOLLOW USER ────────────────────────────────────────────────────
const followUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const userId = req.user.userId;

        if (userId === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
        }

        const [user, target] = await Promise.all([
            User.findById(userId),
            User.findById(targetId),
        ]);

        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if already following
        if (user.following.includes(targetId)) {
            return res.status(400).json({ success: false, message: 'Already following this user' });
        }

        user.following.push(targetId);
        target.followers.push(userId);
        await Promise.all([user.save(), target.save()]);

        return res.status(200).json({
            success: true,
            message: `You are now following ${target.name}`,
            followers_count: target.followers.length,
            following_count: user.following.length,
        });
    } catch (error) {
        console.error('Follow user error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── UNFOLLOW USER ──────────────────────────────────────────────────
const unfollowUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const userId = req.user.userId;

        if (userId === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot unfollow yourself' });
        }

        const [user, target] = await Promise.all([
            User.findById(userId),
            User.findById(targetId),
        ]);

        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.following = user.following.filter((id) => id.toString() !== targetId);
        target.followers = target.followers.filter((id) => id.toString() !== userId);
        await Promise.all([user.save(), target.save()]);

        return res.status(200).json({
            success: true,
            message: `You have unfollowed ${target.name}`,
            followers_count: target.followers.length,
            following_count: user.following.length,
        });
    } catch (error) {
        console.error('Unfollow user error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── CHANGE PASSWORD ────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required',
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── DELETE ACCOUNT ─────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Security check: User can only delete their own account
        if (req.user.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You can only delete your own account.' });
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.status(200).json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    signup,
    verifyOtp,
    login,
    resendOtp,
    getAllUsers,
    getProfile,
    getPublicProfile,
    updateProfile,
    followUser,
    unfollowUser,
    changePassword,
    deleteAccount,
};
