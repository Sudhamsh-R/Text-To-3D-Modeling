const express = require('express');
const { generateImageFromText } = require('../services/rapidapi');
const { createImageTo3DTask, getTaskStatus } = require('../services/meshy');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    services: {
      rapidapi: Boolean(process.env.RAPIDAPI_KEY),
      meshy: Boolean(process.env.MESHY_API_KEY),
    },
  });
});

router.post('/text-to-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await generateImageFromText(prompt);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
      details: error.details || undefined,
    });
  }
});

router.post('/image-to-3d', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const result = await createImageTo3DTask(imageUrl);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
      details: error.details || undefined,
    });
  }
});

router.get('/image-to-3d/:taskId', async (req, res) => {
  try {
    const result = await getTaskStatus(req.params.taskId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
      details: error.details || undefined,
    });
  }
});

module.exports = router;
