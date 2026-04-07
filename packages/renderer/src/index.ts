import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT_RENDERER || '3901', 10);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plant-renderer' });
});

app.listen(PORT, () => {
  console.log(`plant-renderer listening on :${PORT}`);
});
