import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Components
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import CertificatesView from './components/CertificatesView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'certificates' | 'settings'>('certificates');
  
  const [institutionSettings, setInstitutionSettings] = useState({
    name: "ثانوية النهضة الإعدادية",
    academy: "مراكش - أسفي",
    province: "مراكش",
    refNumber: "2025",
    phone: "0524360090",
    address: "ثانوية النهضة المحاميد",
    managerName: "عبد الرحيم مخايري",
    city: "مراكش"
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
             setInstitutionSettings(snap.data() as any);
          }
        } catch (e) {
          console.error("Error fetching settings:", e);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveSettings = async (newSettings: any) => {
    if (!user) return;
    setInstitutionSettings(newSettings);
    await setDoc(doc(db, 'users', user.uid), {
      ...newSettings,
      userId: user.uid,
      updatedAt: serverTimestamp()
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">جاري التحميل...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
        {/* Background animation like the original */}
        <div className="bg-p" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}></div>
        <div className="bg-[#1a2535] p-8 rounded-2xl border border-[#263348] text-center max-w-sm w-full relative z-10 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-red-900/20 text-red-500 flex items-center justify-center rounded-2xl mb-4 text-3xl">
            <i className="fas fa-archive"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">أرشيف المؤسسة التعليمية</h1>
          <p className="text-sm text-gray-400 mb-6 font-semibold">بوابة استخراج الشواهد المدرسية</p>
          <button onClick={loginWithGoogle} className="btn btn-p w-full justify-center">
            <i className="fab fa-google"></i> تسجيل الدخول باستخدام جوجل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen relative overflow-hidden bg-gray-900">
        {/* Background animation like the original */}
        <div className="bg-p" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}></div>
        <div className="ma-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '4px', background: 'repeating-linear-gradient(90deg, #c1272d 0 12px, #006233 12px 24px, #c89b3c 24px 36px)', zIndex: 50, opacity: 0.7 }}></div>

        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          user={user} 
          onLogout={logout} 
        />
        
        <main className="flex-1 relative z-10 p-6 overflow-y-auto w-full">
          {currentView === 'settings' ? (
             <SettingsView settings={institutionSettings} onSave={saveSettings} />
          ) : (
             <CertificatesView institutionSettings={institutionSettings} />
          )}
        </main>
    </div>
  )
}
