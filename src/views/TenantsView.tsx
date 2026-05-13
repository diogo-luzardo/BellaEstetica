import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  MoreVertical, 
  CreditCard, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Edit2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

export default function TenantsView() {
  const { switchTenant } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    plan: 'trial' as Tenant['plan'],
    status: 'ativo' as Tenant['status'],
    monthsDuration: 1
  });

  useEffect(() => {
    const q = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTenants(snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        expiresAt: d.data().expiresAt?.toDate(),
        createdAt: d.data().createdAt?.toDate()
      } as any)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + formData.monthsDuration);

      const data = {
        name: formData.name,
        plan: formData.plan,
        status: formData.status,
        expiresAt: Timestamp.fromDate(expirationDate),
        updatedAt: Timestamp.now()
      };

      if (editingId) {
        await updateDoc(doc(db, 'tenants', editingId), data);
      } else {
        await addDoc(collection(db, 'tenants'), {
          ...data,
          createdAt: Timestamp.now()
        });
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', plan: 'trial', status: 'ativo', monthsDuration: 1 });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary-dark tracking-tight">Gerenciamento de Unidades</h1>
          <p className="text-primary-dark/40 font-bold text-xs uppercase tracking-widest mt-1">Controle de Assinaturas e Multi-tenancy</p>
        </div>
        <button 
          onClick={() => { setShowModal(true); setEditingId(null); }}
          className="flex items-center justify-center gap-2 bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary-dark/20"
        >
          <Plus size={18} />
          Nova Unidade
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-primary-cream flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Unidades Ativas</p>
            <p className="text-2xl font-bold text-primary-dark">{tenants.filter(t => t.status === 'ativo').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-primary-cream flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-gold/10 flex items-center justify-center text-primary-gold">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Planos Trial</p>
            <p className="text-2xl font-bold text-primary-dark">{tenants.filter(t => t.plan === 'trial').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-primary-cream flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Em Atraso</p>
            <p className="text-2xl font-bold text-primary-dark">{tenants.filter(t => t.status === 'inativo').length}</p>
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[40px] border border-primary-cream shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary-cream flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-dark/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar unidade pelo nome ou ID..."
              className="w-full pl-12 pr-6 py-3 bg-primary-cream/30 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-gold/20 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-primary-cream/10">
                <th className="px-6 py-4 text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Unidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Plano</th>
                <th className="px-6 py-4 text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Expiração</th>
                <th className="px-6 py-4 text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-cream/30">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-primary-cream/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-dark/5 flex items-center justify-center text-primary-dark/40">
                        <Building size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary-dark">{tenant.name}</p>
                        <p className="text-[10px] font-mono text-primary-dark/40">{tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-gold"></div>
                      <span className="text-xs font-bold text-primary-dark capitalize">{tenant.plan}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      tenant.status === 'ativo' ? 'bg-green-100 text-green-600' : 
                      tenant.status === 'inativo' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary-dark/60">
                      <Clock size={14} />
                      {tenant.expiresAt ? format(tenant.expiresAt as Date, "dd 'de' MMM, yyyy", { locale: ptBR }) : '---'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => switchTenant(tenant.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-gold/10 text-primary-gold rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary-gold hover:text-white transition-all"
                        title="Entrar nesta unidade"
                      >
                        <ExternalLink size={12} />
                        Gerenciar
                      </button>
                       <button 
                        onClick={() => {
                          setEditingId(tenant.id);
                          setFormData({
                            name: tenant.name,
                            plan: tenant.plan,
                            status: tenant.status,
                            monthsDuration: 1 // Default to adding 1 month when editing or keep as is
                          });
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-primary-cream rounded-lg text-primary-dark/40 hover:text-primary-dark transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTenants.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-primary-cream/30 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-dark/20">
                <Building size={32} />
              </div>
              <p className="text-primary-dark/40 font-medium">Nenhuma unidade encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-dark/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-primary-cream flex justify-between items-center bg-primary-cream/10">
                <div>
                  <h3 className="text-xl font-bold text-primary-dark">{editingId ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}</h3>
                  <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-widest mt-0.5">Defina os parâmetros de acesso</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <Plus className="rotate-45 text-primary-dark/40" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest mb-2 ml-1">Nome da Clínica/Unidade</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-5 py-3 bg-primary-cream/30 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-gold/20 outline-none font-medium text-primary-dark"
                    placeholder="Ex: Clínica Beauty Unidade Jardins"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest mb-2 ml-1">Plano</label>
                    <select 
                      className="w-full px-5 py-3 bg-primary-cream/30 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-gold/20 outline-none font-medium text-primary-dark"
                      value={formData.plan}
                      onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
                    >
                      <option value="trial">Trial (Teste)</option>
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest mb-2 ml-1">Status</label>
                    <select 
                      className="w-full px-5 py-3 bg-primary-cream/30 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-gold/20 outline-none font-medium text-primary-dark"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest mb-2 ml-1">Tempo de Acesso (Meses)</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-5 py-3 bg-primary-cream/30 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-gold/20 outline-none font-medium text-primary-dark"
                    value={formData.monthsDuration}
                    onChange={e => setFormData({ ...formData, monthsDuration: parseInt(e.target.value) })}
                  />
                  <p className="text-[10px] text-primary-dark/40 mt-2 italic">* A contagem de expiração começa a partir de hoje.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-primary-dark/40 hover:bg-primary-cream transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-primary-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-dark/90 shadow-xl shadow-primary-dark/20 transition-all"
                  >
                    {editingId ? 'Salvar Alterações' : 'Criar Unidade'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
