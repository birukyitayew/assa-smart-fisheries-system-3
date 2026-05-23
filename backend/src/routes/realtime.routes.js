const express = require('express');
const router = express.Router();
const sseAuthMiddleware = require('../middleware/sseAuth.middleware');
const marketSseMiddleware = require('../middleware/marketSse.middleware');
const sseService = require('../services/sse.service');

router.get('/stream', sseAuthMiddleware, (req, res) => {
  sseService.addClient(req, res);
});

router.get('/market/stream', marketSseMiddleware, (req, res) => {
  sseService.addMarketClient(req, res);
});

router.get('/status', sseAuthMiddleware, (req, res) => {
  res.json({
    connected_clients: sseService.getClientCount(),
    status: 'ok',
  });
});

module.exports = router;
