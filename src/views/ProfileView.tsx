import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Building, 
  Calendar, 
  ShieldCheck, 
  Mail, 
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfileView() {
  const { userProfile, user } = useAuth();

  // In a real app, we would fetch the tenant data based on userProfile.tenantId
  // For now, we'll simulate the tenant data if not found or show it from a potential context
  // but let's just show what we have.

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ativo': return 'text-green-500 bg-green-500/10';
      case 'inativo': return 'text-red-500 bg-red-500/10';
      default: return 'text-primary-gold bg-primary-gold/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* User Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 bg-white p-8 rounded-[40px] border border-primary-cream shadow-sm"
        >
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-3xl bg-primary-gold/10 flex items-center justify-center text-primary-gold overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary-dark">{user?.displayName || 'Usuário'}</h2>
              <div className="flex items-center gap-2 text-primary-dark/40 font-bold text-xs uppercase tracking-widest mt-1">
                <ShieldCheck size={14} className="text-primary-gold" />
                <span>{userProfile?.role === 'admin' ? 'Support Admin' : userProfile?.role === 'gerencia' ? 'Gerência' : 'Profissional'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-cream/30 border border-primary-cream/50">
              <Mail size={20} className="text-primary-gold" />
              <div>
                <p className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-tighter">E-mail</p>
                <p className="text-sm font-bold text-primary-dark">{userProfile?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-cream/30 border border-primary-cream/50">
              <Clock size={20} className="text-primary-gold" />
              <div>
                <p className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-tighter">ID do Usuário</p>
                <p className="text-[10px] font-mono text-primary-dark/60">{userProfile?.uid}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Unit Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-primary-dark p-8 rounded-[40px] text-white shadow-xl shadow-primary-dark/20"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-primary-gold">
                <Building size={24} />
              </div>
              <h3 className="text-xl font-bold">Minha Unidade</h3>
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full", getStatusColor('ativo'))}>
              Ativo
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Identificador</p>
              <p className="text-lg font-bold font-mono">{userProfile?.tenantId}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Plano Atual</p>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary-gold" />
                  <span className="font-bold">Mensal</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Próxima Fatura</p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary-gold" />
                  <span className="font-bold">13 Jun 2026</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary-gold/10 border border-primary-gold/20 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary-gold" />
              <p className="text-xs font-bold text-primary-gold/80">Sua conta está em dia e protegida pela LGPD.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Subscription Help */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-primary-cream p-6 rounded-3xl flex items-center gap-4"
      >
        <div className="p-3 rounded-2xl bg-blue-50 text-blue-500">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-primary-dark">Precisa mudar de plano ou suporte técnico?</h4>
          <p className="text-sm text-primary-dark/60">Entre em contato com o suporte admin do sistema para alterações na sua unidade.</p>
        </div>
        <button className="ml-auto px-6 py-2 bg-primary-dark text-white rounded-xl text-xs font-bold uppercase tracking-widest">
          Suporte
        </button>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
