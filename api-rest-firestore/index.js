const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

app.get('/api/operatividad', async (req, res) => {
  try {
    const snapshot = await db.collection('operatividad').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener operatividad:', err);
    res.status(500).json({ error: 'Error al obtener operatividad' });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.get('/api/equipos', async (req, res) => {
  try {
    const snapshot = await db.collection('equipos').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener equipos:', err);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

app.get('/api/contratos', async (req, res) => {
  try {
    const snapshot = await db.collection('contratos').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener contratos:', err);
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

app.get('/api/historial_operatividad', async (req, res) => {
  try {
    const snapshot = await db.collection('historial_operatividad').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener contratos:', err);
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

app.get('/api/categorias', async (req, res) => {
  try {
    const snapshot = await db.collection('categorias').get();
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(datos);
  } catch (err) {
    console.error('❌ Error al obtener contratos:', err);
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando en http://0.0.0.0:${PORT}`);
});