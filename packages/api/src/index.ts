import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT_API || '3900', 10);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plant-api' });
});

app.listen(PORT, () => {
  console.log(`plant-api listening on :${PORT}`);
});
