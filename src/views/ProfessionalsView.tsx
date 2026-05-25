/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Star, 
  Clock, 
  Award,
  X,
  Edit2,
  Trash2,
  TrendingUp,
  ChevronRight,
  User,
  Calendar,
  Check
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  orderBy,
  where,
  getDocs,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Profissional, Agendamento, Procedimento, Cliente } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfessionalsView({ onVerAgenda }: { onVerAgenda?: (id: string) => void }) {
  const { currentTenantId, userProfile } = useAuth();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    telefone: '',
    bio: '',
    procedimentoIds: [] as string[]
  });

  useEffect(() => {
    if (!currentTenantId) return;

    const q = query(
      collection(db, 'profissionais'), 
      where('tenantId', '==', currentTenantId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Profissional[];
      
      // Sort client-side by name
      setProfissionais(docs.sort((a, b) => a.nome.localeCompare(b.nome)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profissionais');
    });

    const qProc = query(
      collection(db, 'procedimentos'),
      where('tenantId', '==', currentTenantId)
    );
    const unsubProc = onSnapshot(qProc, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Procedimento[];
      setProcedimentos(docs.sort((a, b) => a.nome.localeCompare(b.nome)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'procedimentos');
    });

    return () => {
      unsubscribe();
      unsubProc();
    };
  }, [currentTenantId]);

  const handleOpenModal = (prof?: Profissional) => {
    if (prof) {
      setEditingId(prof.id);
      setFormData({
        nome: prof.nome,
        especialidade: prof.especialidade,
        telefone: prof.telefone || '',
        bio: prof.bio || '',
        procedimentoIds: prof.procedimentoIds || []
      });
    } else {
      setEditingId(null);
      setFormData({ 
        nome: '', 
        especialidade: '', 
        telefone: '', 
        bio: '',
        procedimentoIds: []
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.especialidade) return;

    try {
      if (editingId) {
        const updateData = {
          nome: formData.nome,
          especialidade: formData.especialidade,
          telefone: formData.telefone,
          bio: formData.bio,
          procedimentoIds: formData.procedimentoIds
        };
        await updateDoc(doc(db, 'profissionais', editingId), updateData);
      } else {
        const cleanData = {
          ...formData,
          tenantId: currentTenantId!
        };
        await addDoc(collection(db, 'profissionais'), cleanData);
      }
      setShowModal(false);
      setFormData({ 
        nome: '', 
        especialidade: '', 
        telefone: '', 
        bio: '',
        procedimentoIds: []
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'profissionais');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);
  const [showFinanceModal, setShowFinanceModal] = useState<Profissional | null>(null);
  const [earningsData, setEarningsData] = useState<{
    total: number;
    history: {
      id: string;
      data: Timestamp;
      clienteNome: string;
      procedimentoNome: string;
      valor: number;
    }[];
  }>({ total: 0, history: [] });
  const [loadingFinance, setLoadingFinance] = useState(false);

  useEffect(() => {
    if (showFinanceModal) {
      loadFinanceData(showFinanceModal.id);
    }
  }, [showFinanceModal]);

  const loadFinanceData = async (profId: string) => {
    if (!currentTenantId) return;
    setLoadingFinance(true);
    try {
      // 1. Fetch procedures for this tenant
      const procSnap = await getDocs(
        query(collection(db, 'procedimentos'), where('tenantId', '==', currentTenantId))
      );
      const procsMap = new Map();
      procSnap.docs.forEach(d => procsMap.set(d.id, d.data()));

      // 2. Fetch clients for this tenant
      const clientSnap = await getDocs(
        query(collection(db, 'clientes'), where('tenantId', '==', currentTenantId))
      );
      const clientsMap = new Map();
      clientSnap.docs.forEach(d => clientsMap.set(d.id, d.data()));

      // 3. Fetch finished appointments for this tenant
      const q = query(
        collection(db, 'agendamentos'), 
        where('tenantId', '==', currentTenantId),
        where('profissionalId', '==', profId),
        where('status', '==', 'concluido')
      );
      const appointSnap = await getDocs(q);
      
      let total = 0;
      const rawHistory = appointSnap.docs.map(docSnap => {
        const data = docSnap.data() as Agendamento;
        const appProcIds = data.procedimentoIds || [(data as any).procedimentoId];
        const client = clientsMap.get(data.clienteId);
        
        // Calcule o valor baseando-se em todos os procedimentos do agendamento
        const selectedProcs = Array.isArray(appProcIds) ? appProcIds.map(id => procsMap.get(id)) : [];
        const valorTotalAgendamento = selectedProcs.reduce((acc, p) => acc + (p?.preco || 0), 0);
        
        total += valorTotalAgendamento;
        
        return {
          id: docSnap.id,
          data: data.data,
          clienteNome: client?.nome || 'Cliente Removido',
          procedimentoNome: selectedProcs.map(p => p?.nome).join(', ') || 'Serviço Removido',
          valor: valorTotalAgendamento
        };
      });

      // Sort history by date desc client-side
      const historySorted = rawHistory.sort((a, b) => b.data.seconds - a.data.seconds);

      setEarningsData({ total, history: historySorted });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.LIST, 'agendamentos');
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal || !userProfile?.tenantId) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Buscar agendamentos deste profissional
      const q = query(
        collection(db, 'agendamentos'), 
        where('tenantId', '==', userProfile.tenantId),
        where('profissionalId', '==', showDeleteModal.id)
      );
      const agendamentosSnap = await getDocs(q);
      
      // 2. Adicionar exclusões de agendamentos ao batch
      agendamentosSnap.forEach((appointmentDoc) => {
        batch.delete(doc(db, 'agendamentos', appointmentDoc.id));
      });
      
      // 3. Adicionar exclusão do profissional ao batch
      batch.delete(doc(db, 'profissionais', showDeleteModal.id));
      
      // 4. Executar batch
      await batch.commit();
      
      setShowDeleteModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'profissionais');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif text-primary-dark font-bold">Nossa Equipe de Especialistas</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary-gold text-white px-6 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-primary-gold/90 transition-colors shadow-lg shadow-primary-gold/20"
        >
          <UserPlus size={18} />
          Novo Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-primary-dark/40 italic">Carregando especialistas...</div>
        ) : profissionais.length === 0 ? (
          <div className="col-span-full py-20 text-center text-primary-dark/40 italic">Nenhum profissional cadastrado.</div>
        ) : profissionais.map((prof) => (
          <div key={prof.id} className="bg-white rounded-3xl border border-primary-dark/5 shadow-sm p-6 space-y-4 hover:shadow-xl transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between">
               <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
               <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(prof)} 
                    className="p-2 bg-primary-cream rounded-lg text-primary-dark/60 hover:text-primary-gold transition-colors"
                    title="Editar Especialista"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setShowFinanceModal(prof)} 
                    className="p-2 bg-primary-cream rounded-lg text-primary-dark/60 hover:text-primary-gold transition-colors"
                    title="Faturamento e Histórico"
                  >
                    <TrendingUp size={14} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal({ id: prof.id, name: prof.nome })} 
                    className="p-2 bg-primary-cream rounded-lg text-primary-dark/60 hover:text-red-500 transition-colors"
                    title="Excluir Especialista"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-cream flex items-center justify-center text-2xl font-serif font-bold text-primary-gold border-2 border-primary-gold/10">
                {prof.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold text-primary-dark">{prof.nome}</h4>
                <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-tighter">{prof.telefone}</p>
                <div className="flex items-center gap-1 mt-1">
                   <div className="flex text-primary-gold">
                     {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                   </div>
                   <span className="text-[10px] text-primary-gold font-bold">5.0</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-primary-cream/30 p-4 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-primary-gold uppercase tracking-tighter flex items-center gap-1">
                  <Award size={12} /> Especialidade
                </p>
                <p className="text-sm font-medium text-primary-dark">{prof.especialidade}</p>

                <div className="pt-3 border-t border-primary-dark/5 space-y-2">
                  <p className="text-[10px] font-bold text-primary-gold uppercase tracking-widest flex items-center gap-1">
                    <Check size={12} strokeWidth={2.5} /> Serviços Habilitados ({prof.procedimentoIds?.length || 0})
                  </p>
                  {prof.procedimentoIds && prof.procedimentoIds.length > 0 ? (
                    <div className="max-h-28 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                      {prof.procedimentoIds.map(pid => {
                        const proc = procedimentos.find(p => p.id === pid);
                        if (!proc) return null;
                        return (
                          <div key={pid} className="flex items-center justify-between text-xs py-1.5 px-3 bg-primary-cream/25 hover:bg-primary-cream/40 rounded-xl border border-primary-dark/5 transition-colors">
                            <span className="font-semibold text-primary-dark truncate max-w-[150px]">{proc.nome}</span>
                            <span className="text-[10px] text-primary-gold font-bold bg-white px-2 py-0.5 rounded-full shadow-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.preco || 0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-primary-dark/40 italic py-1">Nenhum serviço habilitado</p>
                  )}
                </div>
              </div>

              {prof.bio && (
                <p className="text-sm text-primary-dark/60 leading-relaxed italic line-clamp-2">
                  "{prof.bio}"
                </p>
              )}

              <div className="pt-2">
                <button 
                  onClick={() => onVerAgenda?.(prof.id)}
                  className="w-full py-3 text-xs bg-primary-cream text-primary-dark font-bold rounded-xl hover:bg-primary-gold hover:text-white transition-all"
                >
                  Ver Agenda Completa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.form 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onSubmit={handleSave}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif text-primary-dark font-bold">
                  {editingId ? 'Editar Especialista' : 'Novo Profissional'}
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Especialidade</label>
                  <input 
                    required
                    type="text" 
                    value={formData.especialidade}
                    onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Telefone (WhatsApp)</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Bio / Descrição</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 h-20 resize-none" 
                  />
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest block">Serviços Habilitados (Especialidades)</label>
                  {procedimentos.length === 0 ? (
                    <p className="text-xs text-primary-dark/40 italic py-2 bg-primary-cream/20 rounded-xl px-3 border border-dashed border-primary-dark/5">
                      Nenhum procedimento cadastrado no sistema. Cadastre-os primeiro na aba Gerência.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-primary-dark/5 bg-primary-cream/25 rounded-2xl p-3 grid grid-cols-1 gap-2 shadow-inner custom-scrollbar">
                      {procedimentos.map((proc) => {
                        const isChecked = formData.procedimentoIds.includes(proc.id);
                        return (
                          <button
                            key={proc.id}
                            type="button"
                            onClick={() => {
                              const newIds = isChecked 
                                ? formData.procedimentoIds.filter(id => id !== proc.id)
                                : [...formData.procedimentoIds, proc.id];
                              setFormData(prev => ({ ...prev, procedimentoIds: newIds }));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                              isChecked
                                ? 'border-primary-gold bg-white text-primary-dark shadow-sm scale-[1.01]'
                                : 'border-primary-dark/5 bg-white/40 text-primary-dark/60 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isChecked 
                                  ? 'bg-primary-gold border-primary-gold text-white' 
                                  : 'border-primary-dark/20 text-transparent'
                              }`}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                              <span className="text-xs font-semibold truncate max-w-[200px]">{proc.nome}</span>
                            </div>
                            <span className="text-[10px] text-primary-gold font-bold bg-primary-gold/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.preco || 0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-primary-dark/10 rounded-xl font-medium hover:bg-primary-cream transition-colors text-primary-dark"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                >
                  {editingId ? 'Salvar Alterações' : 'Salvar Especialista'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold text-primary-dark">Remover Especialista?</h4>
                <p className="text-sm text-primary-dark/40 mt-1">Deseja realmente remover <strong>{showDeleteModal.name}</strong>? Esta ação não pode ser desfeita.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 px-4 py-2 border border-primary-dark/10 rounded-xl text-sm font-medium hover:bg-primary-cream transition-colors"
                >
                  Não, manter
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                >
                  Sim, remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFinanceModal && (
          <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-primary-dark/5 flex items-center justify-between bg-primary-cream/20">
                <div>
                  <h4 className="text-2xl font-serif font-bold text-primary-dark">Ganhos de {showFinanceModal.nome}</h4>
                  <p className="text-sm text-primary-dark/40 font-medium tracking-tight">Histórico de faturamento e atendimentos concluídos.</p>
                </div>
                <button 
                  onClick={() => setShowFinanceModal(null)}
                  className="p-3 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Dashboard de Faturamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-primary-dark text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} />
                      </div>
                      <p className="text-xs font-bold text-primary-gold uppercase tracking-[0.2em] mb-1">Total Faturado</p>
                      <h5 className="text-4xl font-serif font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(earningsData.total)}
                      </h5>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-white/40">
                         <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                         Atualizado em tempo real
                      </div>
                   </div>

                   <div className="bg-primary-gold/10 p-6 rounded-[2rem] border border-primary-gold/20 flex flex-col justify-center">
                      <p className="text-xs font-bold text-primary-gold uppercase tracking-[0.2em] mb-1">Atendimentos Concluídos</p>
                      <h5 className="text-4xl font-serif font-bold text-primary-dark">
                        {loadingFinance ? '...' : earningsData.history.length}
                      </h5>
                      <p className="text-[10px] text-primary-dark/40 mt-1 font-medium italic">Baseado no histórico total</p>
                   </div>
                </div>

                {/* Lista de Histórico */}
                <div className="space-y-4">
                   <h6 className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                     <Clock size={12} /> Últimos Procedimentos
                   </h6>
                   
                   {loadingFinance ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="h-20 bg-primary-cream/20 animate-pulse rounded-2xl" />
                        ))}
                      </div>
                   ) : earningsData.history.length === 0 ? (
                      <div className="text-center py-12 bg-primary-cream/10 rounded-3xl border-2 border-dashed border-primary-dark/5">
                         <div className="w-16 h-16 bg-primary-cream rounded-full flex items-center justify-center text-primary-gold mx-auto mb-4 opacity-50">
                            <Calendar size={32} />
                         </div>
                         <p className="text-sm text-primary-dark/40 font-medium italic">Nenhum atendimento concluído encontrado.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {earningsData.history.map((item) => (
                          <div key={item.id} className="group flex items-center justify-between p-4 bg-white border border-primary-dark/5 rounded-2xl hover:border-primary-gold/20 hover:shadow-lg hover:shadow-primary-gold/5 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary-cream flex items-center justify-center text-primary-gold group-hover:scale-110 transition-transform">
                                   <User size={20} />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-bold text-primary-dark leading-tight">{item.clienteNome}</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-[10px] bg-primary-cream px-2 py-0.5 rounded-full text-primary-dark font-medium border border-primary-dark/5">
                                        {item.procedimentoNome}
                                      </span>
                                      <span className="text-[10px] text-primary-dark/30 font-mono">
                                        {item.data.toDate().toLocaleDateString('pt-BR')}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-bold text-primary-dark">
                                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                                </p>
                                <div className="flex items-center gap-1 justify-end text-[8px] text-green-500 font-bold uppercase tracking-widest">
                                   <div className="w-1 h-1 rounded-full bg-green-500" />
                                   Pago
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                   )}
                </div>
              </div>

              <div className="p-8 bg-primary-cream/20 border-t border-primary-dark/5">
                 <button 
                  onClick={() => setShowFinanceModal(null)}
                  className="w-full py-4 bg-primary-dark text-white rounded-2xl font-bold shadow-xl shadow-primary-dark/20 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                >
                  Fechar Relatório
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
