const mongoose = require('mongoose');

const linkAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    isSafe: {
      type: Boolean,
      required: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    safeScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    recommendations: {
      type: String,
    },
    phishingLikelihood: {
      type: String,
      enum: ['very high', 'high', 'moderate', 'low', 'very low'],
    },
    trustLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'safe'],
    },
    analysisMethod: {
      type: String,
      enum: ['llm', 'heuristic', 'heuristic_fallback'],
    },
    detailedAnalysis: {
      suspiciousDomainPatterns: [String],
      urlStructure: String,
      domainAge: String,
      sslCertificateStatus: String,
      commonPhishingIndicators: [String],
      trustScore: Number,
      securityAssessment: String,
    },
    analysisTimestamp: {
      type: Date,
      default: Date.now,
    },
    processingTime: {
      type: Number, // milliseconds
    },
  },
  { timestamps: true }
);

// Index for better query performance
linkAnalysisSchema.index({ userId: 1, analysisTimestamp: -1 });
linkAnalysisSchema.index({ url: 1 });
linkAnalysisSchema.index({ safeScore: 1 });

module.exports = mongoose.model('LinkAnalysis', linkAnalysisSchema);
