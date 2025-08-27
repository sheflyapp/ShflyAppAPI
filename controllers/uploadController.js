const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || 'shflyapp_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // Limit image dimensions
      { quality: 'auto:good' } // Optimize quality
    ]
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow only images and documents
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (Cloudinary supports larger files)
    files: 1 // Only 1 file at a time
  }
});

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile image from Cloudinary if exists
    if (user.profileImage && user.profileImage !== '') {
      try {
        // Extract public_id from the old image URL
        const oldImageUrl = user.profileImage;
        if (oldImageUrl.includes('cloudinary.com')) {
          const publicId = oldImageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (deleteError) {
        console.log('Could not delete old image:', deleteError.message);
      }
    }

    // Update user profile image with Cloudinary URL
    const imageUrl = req.file.path; // Cloudinary URL
    user.profileImage = imageUrl;
    await user.save();

    res.json({
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl,
      publicId: req.file.filename // Cloudinary public_id
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload document
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const { documentType, description } = req.body;

    // Validate document type
    const allowedDocumentTypes = [
      'certificate',
      'license',
      'degree',
      'id_proof',
      'other'
    ];

    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const document = {
      filename: req.file.filename, // Cloudinary public_id
      originalName: req.file.originalname,
      path: req.file.path, // Cloudinary URL
      documentType,
      description: description || '',
      uploadedAt: new Date(),
      cloudinaryUrl: req.file.path,
      publicId: req.file.filename
    };

    // Add document to user
    const user = await User.findById(userId);
    if (!user.documents) {
      user.documents = [];
    }
    
    user.documents.push(document);
    await user.save();

    res.json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user documents
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('documents');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      documents: user.documents || []
    });
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find document
    const document = user.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from Cloudinary
    try {
      if (document.publicId) {
        await cloudinary.uploader.destroy(document.publicId);
      }
    } catch (deleteError) {
      console.log('Could not delete from Cloudinary:', deleteError.message);
    }

    // Remove document from user
    document.remove();
    await user.save();

    res.json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download document (redirect to Cloudinary URL)
const downloadDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.userId;

    // Check if user has access to this document
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const document = user.documents.find(doc => doc.filename === filename);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Redirect to Cloudinary URL for download
    res.redirect(document.path);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get file info
const getFileInfo = async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const document = user.documents.find(doc => doc.filename === filename);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({
      document
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get optimized image URL (for different sizes)
const getOptimizedImageUrl = async (req, res) => {
  try {
    const { publicId, width, height, quality } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    const transformation = [];
    
    if (width) transformation.push({ width: parseInt(width) });
    if (height) transformation.push({ height: parseInt(height) });
    if (quality) transformation.push({ quality: quality });
    
    // Add default transformations
    transformation.push({ crop: 'fill' });
    
    const optimizedUrl = cloudinary.url(publicId, {
      transformation: transformation
    });

    res.json({
      optimizedUrl,
      publicId,
      transformations: transformation
    });
  } catch (error) {
    console.error('Get optimized image URL error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  upload,
  uploadProfileImage,
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  downloadDocument,
  getFileInfo,
  getOptimizedImageUrl
};
