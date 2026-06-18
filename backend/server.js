require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection, getStatus, flushQueue } = require('./src/services/sheetsService');

const booksRoutes   = require('./src/routes/books');
const loansRoutes   = require('./src/routes/loans');
const studentsRoutes = require('./src/routes/students');
const reportsRoutes = require('./src/routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/books',    booksRoutes);
app.use('/api/loans',    loansRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/reports',  reportsRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', sheets: 'conectado', versao: '1.0.0' });
  } catch (err) {
    res.status(500).json({ status: 'erro', sheets: 'falha', detail: err.message });
  }
});

// GET /api/status — estado online/offline + pendências de sincronização.
// Nunca falha: usado pelo frontend para mostrar o banner de modo offline.
app.get('/api/status', async (req, res) => {
  try {
    await testConnection(); // confirma online/offline ao vivo (atualiza o flag)
    if (getStatus().online && getStatus().pending > 0) {
      await flushQueue();   // voltou a conexão e há pendências → sincroniza
    }
  } catch { /* status nunca deve quebrar a resposta */ }
  res.json(getStatus());
});

app.listen(PORT, async () => {
  console.log(`\n📚 Biblioteca Paixão Côrtes — http://localhost:${PORT}`);
  try {
    await testConnection();
    console.log('✅ Google Sheets conectado!\n');
  } catch (err) {
    console.error('❌ Erro ao conectar Google Sheets:', err.message);
    console.error('   Verifique o arquivo credentials.json e o .env\n');
  }

  // Sincronização automática em segundo plano: a cada 30s tenta enviar a fila
  // de ações feitas offline. (Também é tentado a cada /api/status do frontend.)
  setInterval(async () => {
    try {
      if (getStatus().pending > 0) {
        await testConnection();
        if (getStatus().online) await flushQueue();
      }
    } catch { /* silencioso: tenta de novo no próximo ciclo */ }
  }, 30_000);
});
