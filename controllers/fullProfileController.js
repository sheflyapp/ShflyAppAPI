const User = require('../models/User');
const Category = require('../models/Category');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Builds a POST /fullprofile handler for the given role ('provider' | 'seeker').
// Mobile-app endpoint: updates the logged-in user's own profile only.
// isVerified / isActive are intentionally not handled here.
const createFullProfileHandler = (role) => async (req, res) => {
  try {
    const user = await User.findById(req.userProfile._id);
    if (!user || user.userType !== role) {
      return res.status(403).json({ success: false, message: `Only ${role}s can use this endpoint` });
    }

    const {
      fullname, username, email, phone, gender, dob, country, city,
      languages, bio, specializations
    } = req.body;

    if (email && email !== user.email) {
      if (await User.findOne({ email, _id: { $ne: user._id } })) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }
    if (username && username !== user.username) {
      if (await User.findOne({ username, _id: { $ne: user._id } })) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
    }

    if (specializations !== undefined) {
      if (!Array.isArray(specializations) || specializations.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one specialization is required' });
      }
      const count = await Category.countDocuments({ _id: { $in: specializations }, isActive: true });
      if (count !== new Set(specializations.map(String)).size) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive specialization' });
      }
      user.specializations = specializations;
    }

    if (fullname !== undefined) user.fullname = fullname;
    if (username) user.username = username;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob || undefined;
    if (country !== undefined) user.country = country;
    if (city !== undefined) user.city = city;
    if (bio !== undefined) user.bio = bio;
    if (languages !== undefined) {
      user.languages = (Array.isArray(languages) ? languages : String(languages).split(','))
        .map((l) => String(l).trim())
        .filter(Boolean);
    }

    if (role === 'provider') {
      const { price, chat, call, video, availability } = req.body;
      if (price !== undefined) user.price = price;
      if (typeof chat === 'boolean') user.chat = chat;
      if (typeof call === 'boolean') user.call = call;
      if (typeof video === 'boolean') user.video = video;
      if (availability && typeof availability === 'object') {
        DAYS.forEach((day) => {
          if (typeof availability[day] === 'boolean') user.availability[day] = availability[day];
        });
      }
    }

    await user.save();

    const updated = await User.findById(user._id)
      .select('-password')
      .populate('specializations', 'name description color icon');

    res.json({
      success: true,
      message: `${role === 'provider' ? 'Provider' : 'Seeker'} profile updated successfully`,
      data: { [role]: updated }
    });
  } catch (error) {
    console.error(`Full profile (${role}) error:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

module.exports = { createFullProfileHandler };
