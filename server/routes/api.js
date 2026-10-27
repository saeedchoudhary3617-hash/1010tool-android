const express = require('express');
const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: '1010Tool',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// GET /api/config
router.get('/config', (req, res) => {
  res.status(200).json({
    appName: '1010Tool',
    maxUploadSizeMB: 100,
    supportedPdfFeatures: [
      'merge', 'split', 'compress', 'grayscale', 'rotate', 'rotate-pages',
      'crop', 'watermark', 'extract', 'lock', 'unlock', 'remove',
      'numbering', 'metadata', 'sign', 'reverse', 'flatten', 'batch'
    ],
    supportedImageFeatures: [
      'crop', 'resize', 'passport', 'img2pdf', 'pdf2img', 'compress', 'join', 'pngsuite'
    ],
    supportedUtilityFeatures: [
      'qrcode', 'calculators', 'passgen', 'wordcount', 'developer-tools'
    ]
  });
});

// POST /api/feedback
router.post('/feedback', (req, res) => {
  const { tool, rating, comments, email } = req.body || {};
  if (!tool) {
    return res.status(400).json({ success: false, message: 'Tool name is required' });
  }

  // Ready for database / email logging
  console.log(`[1010Tool Feedback] Tool: ${tool}, Rating: ${rating}, Comments: ${comments}, Email: ${email || 'anonymous'}`);
  
  res.status(200).json({
    success: true,
    message: 'Thank you for your feedback! It helps improve 1010Tool.'
  });
});

module.exports = router;
