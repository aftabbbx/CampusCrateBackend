const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const serverConfig = require('../config/server.config');
const { sendOtpEmail } = require('../config/email.config');
const generateOtp = require('../utils/generateOtp');

// ─── SIGNUP ─────────────────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { name, username, email, password, phone_number, semester } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, username, email and password are required',
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
        });

        if (existingUser) {
            if (!existingUser.is_verified) {
                const otp = generateOtp();
                existingUser.otp = await bcrypt.hash(otp, 10);
                existingUser.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
                existingUser.name = name;
                existingUser.password = await bcrypt.hash(password, 12);
                if (phone_number) existingUser.phone_number = phone_number;
                if (semester) existingUser.semester = semester;
                await existingUser.save();

                console.log(`\n📧 OTP for ${existingUser.email}: ${otp}\n`);
                try {
                    await sendOtpEmail(existingUser.email, otp, 'signup');
                } catch (emailErr) {
                    console.error('Email send failed:', emailErr.message);
                }

                return res.status(200).json({
                    success: true,
                    message: 'OTP resent to your email. Please verify.',
                });
            }

            const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
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
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            phone_number,
            semester,
            is_verified: false,
            otp: hashedOtp,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        });

        console.log(`\n📧 OTP for ${email.toLowerCase()}: ${otp}\n`);
        try {
            await sendOtpEmail(email.toLowerCase(), otp, 'signup');
        } catch (emailErr) {
            console.error('Email send failed:', emailErr.message);
        }

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
                username: user.username,
                email: user.email,
                is_verified: user.is_verified,
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

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

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
                username: user.username,
                email: user.email,
                is_verified: user.is_verified,
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
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Get profile error:', error);
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

        const { name, phone_number, semester, bio, profile_image } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name) user.name = name;
        if (phone_number !== undefined) user.phone_number = phone_number;
        if (semester !== undefined) user.semester = semester;
        if (bio !== undefined) user.bio = bio;
        if (profile_image !== undefined) user.profile_image = profile_image;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone_number: user.phone_number,
                semester: user.semester,
                bio: user.bio,
                profile_image: user.profile_image,
                is_verified: user.is_verified,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
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
    updateProfile,
    changePassword,
    deleteAccount,
};
