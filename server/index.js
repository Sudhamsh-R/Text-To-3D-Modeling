require('dotenv').config();

const path = require('path');
const express = require('express');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.use('/api', apiRouter);

app.get('/app', (_req, res) => {
  res.sendFile(path.join(publicDir, 'app.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found.' });
    return;
  }
  res.status(404).send('Page not found.');
});

app.listen(PORT, () => {
  console.log(`AI-Prompted 3D Modeling running at http://localhost:${PORT}`);
});
