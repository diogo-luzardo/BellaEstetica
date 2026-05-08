/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Settings, 
  DollarSign, 
  MessageSquare, 
  Menu,
  X,
  UserCheck,
  TrendingUp,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';

// Import Views
import DashboardView from './views/DashboardView';
import ClientsView from './views/ClientsView';
import ManagementView from './views/ManagementView';
import ProfessionalsView from './views/ProfessionalsView';
import AgendaView from './views/AgendaView';
import WhatsAppView from './views/WhatsAppView';

type View = 'dashboard' | 'clientes' | 'agenda' | 'gestao' | 'profissionais' | 'whatsapp';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const navigateToAgenda = (profId: string) => {
    setSelectedProfessionalId(profId);
    setCurrentView('agenda');
  };

  const navItems = [
    { id: 'dashboard', label: 'Monitor', icon: TrendingUp },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'profissionais', label: 'Especialistas', icon: UserCheck },
    { id: 'gestao', label: 'Financeiro/Estoque', icon: DollarSign },
    { id: 'whatsapp', label: 'WhatsApp Assistant', icon: MessageSquare },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'clientes': return <ClientsView />;
      case 'agenda': return <AgendaView initialProfId={selectedProfessionalId} />;
      case 'gestao': return <ManagementView />;
      case 'profissionais': return <ProfessionalsView onVerAgenda={navigateToAgenda} />;
      case 'whatsapp': return <WhatsAppView />;
      default: return <DashboardView />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-cream">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-primary-gold text-4xl font-serif"
        >
          BellaEstética
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-cream p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-8 border border-primary-gold/10"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-primary-gold font-bold premium-shadow">BellaEstética</h1>
            <p className="text-primary-dark/60 font-medium">Gestão de Luxo para Clínicas</p>
          </div>
          
          <div className="py-4">
            <button 
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 bg-primary-dark text-white p-4 rounded-2xl hover:bg-primary-gold transition-all shadow-lg font-bold group"
            >
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
              Entrar com Google
            </button>
          </div>
          
          <p className="text-[10px] text-primary-dark/30 uppercase tracking-widest leading-loose">
            Sistema restrito para administradores e profissionais credenciados.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-primary-cream overflow-hidden relative">
      {/* Sidebar - Desktop & Tablet */}
      <aside 
        className={cn(
          "bg-white border-r border-primary-dark/5 transition-all duration-300 z-50 flex flex-col shadow-sm hidden md:flex",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between overflow-hidden">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-2xl font-serif font-bold text-primary-gold whitespace-nowrap premium-shadow"
              >
                BellaEstética
              </motion.h1>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-10 h-10 rounded-xl bg-primary-gold flex items-center justify-center text-white font-serif font-bold shadow-md"
              >
                B
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-primary-cream rounded-xl transition-all"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group relative",
                currentView === item.id 
                  ? "bg-primary-dark text-white shadow-xl shadow-primary-dark/20" 
                  : "text-primary-dark/40 hover:bg-primary-cream hover:text-primary-dark"
              )}
            >
              <item.icon size={20} className={cn(currentView === item.id ? "text-primary-gold" : "group-hover:scale-110 transition-transform")} />
              {isSidebarOpen && <span className="font-semibold text-sm tracking-wide">{item.label}</span>}
              {!isSidebarOpen && (
                <div className="absolute left-16 bg-primary-dark text-white text-[10px] uppercase font-bold tracking-widest px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl z-[100] whitespace-nowrap">
                   {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-dark/5 bg-gray-50/50">
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-4 p-3.5 text-primary-dark/40 hover:text-red-500 rounded-2xl transition-all hover:bg-white"
          >
            <LogIn size={20} className="rotate-180" />
            {isSidebarOpen && <span className="text-sm font-semibold">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[70] md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between">
                <h1 className="text-2xl font-serif font-bold text-primary-gold">BellaEstética</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-primary-cream rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id as View);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                      currentView === item.id 
                        ? "bg-primary-dark text-white shadow-lg" 
                        : "text-primary-dark/40 hover:bg-primary-cream"
                    )}
                  >
                    <item.icon size={20} className={currentView === item.id ? "text-primary-gold" : ""} />
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="p-6 border-t border-primary-dark/5">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 p-4 text-red-500 font-bold bg-red-50 rounded-2xl"
                >
                  <LogIn size={20} className="rotate-180" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-primary-dark/5 flex items-center justify-between px-4 md:px-8 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-primary-cream rounded-xl text-primary-dark"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary-gold inline-block" />
              <h2 className="text-xs md:text-sm uppercase tracking-[0.2em] font-bold text-primary-dark/40">
                {navItems.find(i => i.id === currentView)?.label}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-primary-dark">{user.displayName || 'Administrador'}</span>
              <span className="text-[10px] text-primary-gold font-bold uppercase tracking-tighter">Sessão Ativa</span>
            </div>
            <button className="relative p-2 hover:bg-primary-cream rounded-full transition-colors group">
              {user.photoURL ? (
                <img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-primary-gold/10" alt="Avatar" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary-cream border-2 border-primary-gold/10 flex items-center justify-center font-bold text-primary-gold group-hover:border-primary-gold transition-all">
                  {user.displayName?.charAt(0) || 'A'}
                </div>
              )}
              <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 bg-primary-cream/40 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-7xl mx-auto min-h-full"
            >
              <div className="mb-10">
                <h3 className="text-3xl md:text-4xl font-serif text-primary-dark leading-tight premium-shadow">
                  {navItems.find(i => i.id === currentView)?.label}
                </h3>
                <p className="text-sm text-primary-dark/40 font-medium">Controle e excelência para sua unidade BellaEstética.</p>
              </div>
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
