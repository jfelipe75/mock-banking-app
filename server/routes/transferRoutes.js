const express = require('express');

const router = express.Router();

const validateTransferRequest = require('../middleware/validateTransferRequest');
const checkAuthentication = require('../middleware/checkAuthentication');
const { transferIpLimiter, transferUserLimiter } = require('../middleware/rateLimiters');
const transferController = require('../controllers/transferController');

router.post(
  '/',
  checkAuthentication,
  transferIpLimiter,
  transferUserLimiter,
  validateTransferRequest,
  transferController.createTransfer,
);

module.exports = router;
