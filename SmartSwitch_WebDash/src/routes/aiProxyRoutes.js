const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('config');
const { authenticate } = require('../middleware/auth');

const AI_BACKEND = config.get('aiBackend.url');

// Mock data for fallback
const MOCK_INSIGHTS = {
  trust_scores: { overall: 0.94 },
  prediction_accuracy: 0.87,
  drift_metrics: { score: 0.12, drift_detected: false },
  recommendations: [
    {
      id: 1,
      type: 'mode',
      mode_name: 'AI Mode',
      reason: 'Switch 2 in Living Room has usage pattern suggesting automation',
      confidence: 0.90
    },
    {
      id: 2,
      type: 'schedule',
      mode_name: 'Schedule',
      reason: 'Office lights typically off between 12AM-6AM',
      confidence: 0.80
    },
    {
      id: 3,
      type: 'energy',
      mode_name: 'Energy Save',
      reason: 'Bedroom AC could be optimized during peak hours',
      confidence: 0.76
    }
  ]
};

const MOCK_PREDICTIONS = {
  predictions: [
    { switchId: 1, predictedState: true, confidence: 0.95, timeFrame: 'next hour' },
    { switchId: 2, predictedState: false, confidence: 0.88, timeFrame: 'next hour' }
  ]
};

const MOCK_ANOMALIES = {
  anomalies: [],
  message: 'No anomalies detected'
};

// Proxy all AI requests through the main backend
router.all('*', authenticate, async (req, res) => {
  try {
    const url = `${AI_BACKEND}/api${req.url}`;
    console.log(`Proxying AI request to: ${url}`);

    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      timeout: config.get('aiBackend.timeout')
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI Proxy error:', error.message);
    
    // Return mock data based on the endpoint
    if (req.url.includes('/insights')) {
      return res.json(MOCK_INSIGHTS);
    } else if (req.url.includes('/predictions')) {
      return res.json(MOCK_PREDICTIONS);
    } else if (req.url.includes('/anomalies')) {
      return res.json(MOCK_ANOMALIES);
    } else if (req.url.includes('/recommendations')) {
      return res.json({ recommendations: MOCK_INSIGHTS.recommendations });
    }
    
    res.status(503).json({ 
      message: 'AI backend unavailable',
      mock: true 
    });
  }
});

module.exports = router;