// NAS100 신호 상태 업데이트 API
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

let app, database;
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.log('Firebase 초기화 오류:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId, processed, processingTime, result, method } = req.body;

    console.log('NAS100 신호 상태 업데이트:', {
      signalId,
      processed,
      processingTime,
      result,
      method
    });

    // Firebase 업데이트 (RTDB 방식)
    if (database && method === 'rtdb') {
      try {
        const latestRef = ref(database, 'nas100_signals/latest');
        const updateData = {
          processed: processed,
          processingTime: processingTime,
          result: result,
          completedAt: serverTimestamp()
        };
        
        await set(latestRef, updateData);
        console.log('Firebase 상태 업데이트 완료');
      } catch (firebaseError) {
        console.error('Firebase 업데이트 오류:', firebaseError);
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'NAS100 signal status updated',
      instrument: 'NAS100'
    });

  } catch (error) {
    console.error('신호 상태 업데이트 오류:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
