const express = require('express');
const router = express.Router();

// @route   GET /api/search
// @desc    Search for providers, consultations, etc.
// @access  Public
router.get('/', (req, res) => {
  res.json({ message: 'Search endpoint - to be implemented' });
});

// @route   GET /api/search/providers
// @desc    Search for providers
// @access  Public
router.get('/providers', (req, res) => {
  res.json({ message: 'Search providers endpoint - to be implemented' });
});

// @route   GET /api/search/consultations
// @desc    Search for consultations
// @access  Public
router.get('/consultations', (req, res) => {
  res.json({ message: 'Search consultations endpoint - to be implemented' });
});

// @route   GET /api/search/categories
// @desc    Search for categories
// @access  Public
router.get('/categories', (req, res) => {
  res.json({ message: 'Search categories endpoint - to be implemented' });
});

module.exports = router;
