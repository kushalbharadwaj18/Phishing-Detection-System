const express = require('express');
const { body, validationResult } = require('express-validator');
const verifyToken = require('../middleware/auth');
const LinkAnalysis = require('../models/LinkAnalysis');
const phishingDetectionService = require('../services/phishingDetection');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for analysis endpoint
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: 'Too many analysis requests, please try again later',
});

// Analyze URL endpoint
router.post(
  '/analyze',
  verifyToken,
  analysisLimiter,
  [body('url').isURL().withMessage('Valid URL is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { url } = req.body;
      const userId = req.userId;

      // Check if URL was recently analyzed
      const recentAnalysis = await LinkAnalysis.findOne({
        url,
        analysisTimestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (recentAnalysis) {
        return res.json({
          message: 'Using cached analysis',
          isCached: true,
          ...recentAnalysis.toObject(),
        });
      }

      // Perform phishing detection
      const detectionResult = await phishingDetectionService.detectPhishing(url);

      // Save analysis to database
      const linkAnalysis = new LinkAnalysis({
        userId,
        url,
        isSafe: detectionResult.isSafe,
        riskScore: detectionResult.riskScore,
        safeScore: detectionResult.safeScore,
        explanation: detectionResult.explanation,
        recommendations: detectionResult.recommendations,
        phishingLikelihood: detectionResult.phishingLikelihood,
        trustLevel: detectionResult.trustLevel,
        analysisMethod: detectionResult.analysisMethod,
        detailedAnalysis: detectionResult.detailedAnalysis,
        processingTime: detectionResult.processingTime,
      });

      await linkAnalysis.save();

      res.json({
        message: 'Analysis completed successfully',
        isCached: false,
        ...detectionResult,
        analysisId: linkAnalysis._id,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ message: error.message || 'Analysis failed' });
    }
  }
);

// Get analysis history endpoint
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const analyses = await LinkAnalysis.find({ userId })
      .sort({ analysisTimestamp: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await LinkAnalysis.countDocuments({ userId });

    res.json({
      analyses,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// Get statistics endpoint - MUST be before /:id route
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = req.userId;

    const total = await LinkAnalysis.countDocuments({ userId });
    const safeCount = await LinkAnalysis.countDocuments({ userId, isSafe: true });
    const unsafeCount = await LinkAnalysis.countDocuments({ userId, isSafe: false });
    const averageRiskScore = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } },
    ]);

    res.json({
      total,
      safe: safeCount,
      unsafe: unsafeCount,
      averageRiskScore: averageRiskScore[0]?.avgRisk || 0,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get comprehensive analytics endpoint - MUST be before /:id route
router.get('/analytics/dashboard', verifyToken, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = req.userId;

    // Basic counts
    const total = await LinkAnalysis.countDocuments({ userId });
    const safeCount = await LinkAnalysis.countDocuments({ userId, isSafe: true });
    const unsafeCount = await LinkAnalysis.countDocuments({ userId, isSafe: false });

    // Average scores
    const scoreStats = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgRisk: { $avg: '$riskScore' },
          avgSafe: { $avg: '$safeScore' },
          maxRisk: { $max: '$riskScore' },
          minRisk: { $min: '$riskScore' },
        },
      },
    ]);

    // Phishing likelihood breakdown
    const phishingBreakdown = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$phishingLikelihood',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Trust level breakdown
    const trustBreakdown = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$trustLevel',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Analysis method breakdown
    const methodBreakdown = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$analysisMethod',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Risk score distribution (for bar chart)
    const riskDistribution = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: '100',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    // Safe score distribution (for bar chart)
    const safeDistribution = await LinkAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $bucket: {
          groupBy: '$safeScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: '100',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    // Recent analyses for trend
    const recentAnalyses = await LinkAnalysis.find({ userId })
      .sort({ analysisTimestamp: -1 })
      .limit(30)
      .lean();

    res.json({
      summary: {
        total,
        safe: safeCount,
        unsafe: unsafeCount,
        safePercentage: total > 0 ? ((safeCount / total) * 100).toFixed(2) : 0,
        unsafePercentage: total > 0 ? ((unsafeCount / total) * 100).toFixed(2) : 0,
      },
      scores: scoreStats[0] || {
        avgRisk: 0,
        avgSafe: 0,
        maxRisk: 0,
        minRisk: 0,
      },
      phishingBreakdown: phishingBreakdown.map((item) => ({
        name: item._id || 'Unknown',
        value: item.count,
      })),
      trustBreakdown: trustBreakdown.map((item) => ({
        name: item._id || 'Unknown',
        value: item.count,
      })),
      methodBreakdown: methodBreakdown.map((item) => ({
        name: item._id || 'Unknown',
        value: item.count,
      })),
      riskDistribution: [
        { range: '0-20', count: riskDistribution.find((r) => r._id === 0)?.output?.count || 0 },
        { range: '20-40', count: riskDistribution.find((r) => r._id === 20)?.output?.count || 0 },
        { range: '40-60', count: riskDistribution.find((r) => r._id === 40)?.output?.count || 0 },
        { range: '60-80', count: riskDistribution.find((r) => r._id === 60)?.output?.count || 0 },
        { range: '80-100', count: riskDistribution.find((r) => r._id === 80)?.output?.count || 0 },
      ],
      safeDistribution: [
        { range: '0-20', count: safeDistribution.find((r) => r._id === 0)?.output?.count || 0 },
        { range: '20-40', count: safeDistribution.find((r) => r._id === 20)?.output?.count || 0 },
        { range: '40-60', count: safeDistribution.find((r) => r._id === 40)?.output?.count || 0 },
        { range: '60-80', count: safeDistribution.find((r) => r._id === 60)?.output?.count || 0 },
        { range: '80-100', count: safeDistribution.find((r) => r._id === 80)?.output?.count || 0 },
      ],
      recentAnalyses,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Get analysis details endpoint - MUST be last because it uses /:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const analysis = await LinkAnalysis.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Analysis fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch analysis' });
  }
});

module.exports = router;
