import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Detection of current project and database
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

let firebaseApp: App;
try {
  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    firebaseApp = getApps()[0];
  }
} catch (err) {
  console.error('Firebase initializeApp failed, falling back to default:', err);
  firebaseApp = initializeApp();
}

// In modular SDK v13+, getFirestore(app, databaseId) is supported
let currentDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
let db: Firestore;

try {
  db = getFirestore(firebaseApp, currentDatabaseId);
} catch (err) {
  console.error(`Failed to initialize Firestore with DB ID "${currentDatabaseId}", falling back to (default):`, err);
  db = getFirestore(firebaseApp);
  currentDatabaseId = '(default)';
}

// Test connectivity and perform defensive fallback
const testFirestoreConnection = async () => {
  const projectId = firebaseApp.options.projectId || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;
  console.log(`--- Firestore connectivity check (Target Project: ${projectId}, Target DB: ${currentDatabaseId}) ---`);
  
  try {
    // Try a simple operation to verify permissions
    await db.collection('test').doc('connection').get();
    console.log('Firestore connection success.');
  } catch (err: any) {
    console.error(`Firestore connection attempt failed for DB "${currentDatabaseId}":`, err.message);
    
    // If it's a permission error, maybe the named database isn't provisioned with access yet
    if (err.code === 7 || err.message?.includes('PERMISSION_DENIED')) {
      if (currentDatabaseId !== '(default)') {
        console.warn('PERMISSION_DENIED on named database. Checking (default) database as fallback...');
        try {
          const fallbackDb = getFirestore(firebaseApp, '(default)');
          await fallbackDb.collection('test').doc('connection').get();
          db = fallbackDb;
          currentDatabaseId = '(default)';
          console.log('Fallback to (default) database SUCCESSFUL.');
        } catch (fErr: any) {
          console.error('Fallback to (default) database also FAILED:', fErr.message);
        }
      }
    } else if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
      // If the named database just doesn't exist at all
      if (currentDatabaseId !== '(default)') {
         console.warn('Named database NOT_FOUND. Falling back to (default)...');
         try {
           const fallbackDb = getFirestore(firebaseApp);
           await fallbackDb.collection('test').doc('connection').get();
           db = fallbackDb;
           currentDatabaseId = '(default)';
           console.log('Fallback to (default) SUCCESSFUL.');
         } catch (fErr: any) {
           console.error('Fallback also failed:', fErr.message);
         }
      }
    }
  }
};

testFirestoreConnection();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Dynamic PWA Manifest Route
  app.get('/api/manifest', (req, res) => {
    const iconUrl = req.query.icon as string || 'https://firebasestorage.googleapis.com/v0/b/igreja-batista-coqueiral.appspot.com/o/assets%2Flogo_ibc.png?alt=media';
    const userName = req.query.name as string || 'IBC App';
    const themeColor = "#0d9488";

    // Standard PWA icon sizes
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    const icons = sizes.flatMap(size => [
      {
        src: iconUrl,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any"
      },
      {
        src: iconUrl,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable"
      }
    ]);

    const manifest = {
      id: "/",
      name: `IBC - ${userName}`,
      short_name: userName,
      description: "Sistema de Gestão IBC",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      orientation: "portrait",
      icons: icons,
      categories: ["business", "productivity"],
      shortcuts: [
        {
          name: "Membros",
          short_name: "Membros",
          description: "Gerenciar membros",
          url: "/?tab=members",
          icons: [{ src: iconUrl, sizes: "192x192" }]
        },
        {
          name: "Financeiro",
          short_name: "Financeiro",
          description: "Relatórios financeiros",
          url: "/?tab=reports",
          icons: [{ src: iconUrl, sizes: "192x192" }]
        }
      ]
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); // Avoid manifest caching issues
    res.send(JSON.stringify(manifest));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
