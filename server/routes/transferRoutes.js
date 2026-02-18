const express = require('express');

const router = express.Router();

const validateTransferRequest = require('../middleware/validateTransferRequest');
const checkAuthentication = require('../middleware/checkAuthentication');
const transferController = require('../controllers/transferController');

router.post(
  '/',
  checkAuthentication,
  validateTransferRequest,
  transferController.createTransfer,
);

module.exports = router;
