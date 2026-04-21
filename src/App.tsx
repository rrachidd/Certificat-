import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Components
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import CertificatesView from './components/CertificatesView';
import ArchiveView from './components/ArchiveView';
import AddStudentView from './components/AddStudentView';
import StatsView from './components/StatsView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'certificates' | 'settings' | 'archive' | 'add-student' | 'stats'>('certificates');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
        <div className="bg-[var(--color-card)] p-8 rounded-2xl border border-[var(--color-brd)] text-center max-w-sm w-full relative z-10 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_4px_20px_var(--color-primary-g)] text-white flex items-center justify-center rounded-2xl mb-4 text-3xl">
            <i className="fas fa-archive"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">أرشيف المؤسسة التعليمية</h1>
          <p className="text-sm text-[var(--color-mt)] mb-6 font-semibold">بوابة استخراج الشواهد المدرسية</p>
          <button onClick={loginWithGoogle} className="btn btn-p w-full justify-center">
            <i className="fab fa-google"></i> تسجيل الدخول باستخدام جوجل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
        {/* Background animation like the original */}
        <div className="bg-p" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}></div>
        <div className="ma-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '4px', background: 'repeating-linear-gradient(90deg, var(--color-primary) 0 12px, var(--color-secondary) 12px 24px, #c89b3c 24px 36px)', zIndex: 50, opacity: 0.7 }}></div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
           <div className="fixed inset-0 bg-[#00000080] z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          user={user} 
          onLogout={logout} 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        <main className="flex-1 relative z-10 p-4 lg:p-6 overflow-y-auto w-full">
          <div className="lg:hidden mb-6 flex items-center justify-between bg-[var(--color-card)] p-4 rounded-xl border border-[var(--color-brd)]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white">
                 <i className="fas fa-school text-sm"></i>
               </div>
               <h1 className="font-bold text-lg">بوابة المؤسسة</h1>
             </div>
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[var(--color-fg)] bg-[var(--color-bg)] rounded-lg border border-[var(--color-brd)]">
                <i className="fas fa-bars"></i>
             </button>
          </div>

          {currentView === 'settings' ? (
             <SettingsView settings={institutionSettings} onSave={saveSettings} />
          ) : currentView === 'archive' ? (
             <ArchiveView user={user} />
          ) : currentView === 'stats' ? (
             <StatsView user={user} />
          ) : currentView === 'add-student' ? (
             <AddStudentView user={user} onSuccess={() => setCurrentView('certificates')} />
          ) : (
             <CertificatesView institutionSettings={institutionSettings} user={user} />
          )}
        </main>
    </div>
  )
}
