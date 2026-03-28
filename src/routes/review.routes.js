const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { reviewSchema } = require('../validators/schemas');

router.get('/product/:productId', reviewController.getProductReviews);
router.post('/', protect, validate(reviewSchema), reviewController.createReview);
router.put('/:id/helpful', protect, reviewController.markHelpful);
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;
