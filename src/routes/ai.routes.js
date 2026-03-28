// ai.routes.js
const express = require('express');
const aiRouter = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

aiRouter.post('/chat', optionalAuth, aiController.chat);
aiRouter.post('/search', aiController.aiSearch);
aiRouter.get('/recommendations', optionalAuth, aiController.getRecommendations);

module.exports = aiRouter;
