/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  X,
  User,
  Scissors,
  CheckCircle2,
  Trash2,
  Flag
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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Profissional, Cliente, Procedimento, Agendamento } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function AgendaView({ initialProfId = '' }: { initialProfId?: string }) {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  
  // Data State
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Date & View State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [selectedProfId, setSelectedProfId] = useState<string>(initialProfId); // Vazio significa Todos

  // Sincronizar com prop
  useEffect(() => {
    if (initialProfId) setSelectedProfId(initialProfId);
  }, [initialProfId]);

  // Modal/Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: string, profId: string, date?: Date } | null>(null);
  const [formData, setFormData] = useState({
    clienteId: '',
    procedimentoId: '',
    notas: ''
  });

  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'agendamentos', appId), {
        status: newStatus
      });
      setShowDetailModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'agendamentos');
    }
  };

  const handleDeleteAppointment = async (appId: string) => {
    if (confirm('Deseja realmente remover este agendamento?')) {
      try {
        await deleteDoc(doc(db, 'agendamentos', appId));
        setShowDetailModal(false);
        setSelectedAppointment(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'agendamentos');
      }
    }
  };

  useEffect(() => {
    const unsubProf = onSnapshot(collection(db, 'profissionais'), (shot) => {
      const prods = shot.docs.map(d => ({ id: d.id, ...d.data() } as Profissional));
      setProfissionais(prods);
      // Não forçamos seleção automática para permitir "Todos" como padrão
    });
    const unsubCli = onSnapshot(collection(db, 'clientes'), (shot) => {
      setClientes(shot.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
    });
    const unsubProc = onSnapshot(collection(db, 'procedimentos'), (shot) => {
      setProcedimentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Procedimento)));
    });
    const unsubAgenda = onSnapshot(collection(db, 'agendamentos'), (shot) => {
      setAgendamentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento)));
      setLoading(false);
    });

    return () => { unsubProf(); unsubCli(); unsubProc(); unsubAgenda(); };
  }, []);

  const handleOpenBook = (hour: string, profId: string) => {
    setSelectedSlot({ hour, profId });
    setShowModal(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !formData.clienteId || !formData.procedimentoId) return;

    try {
      const bookDate = new Date(currentDate);
      const [h, m] = selectedSlot.hour.split(':');
      bookDate.setHours(parseInt(h), parseInt(m), 0, 0);

      await addDoc(collection(db, 'agendamentos'), {
        ...formData,
        profissionalId: selectedSlot.profId,
        data: Timestamp.fromDate(bookDate),
        status: 'confirmado'
      });

      setShowModal(false);
      setFormData({ clienteId: '', procedimentoId: '', notas: '' });
      setSelectedSlot(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agendamentos');
    }
  };

  const changeDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'dia') newDate.setDate(newDate.getDate() + direction);
    else if (viewMode === 'semana') newDate.setDate(newDate.getDate() + (direction * 7));
    else if (viewMode === 'mes') newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getAppointment = (hour: string, profId: string, dateToCheck: Date = currentDate) => {
    return agendamentos.find(a => {
      if (!a.data) return false;
      const date = a.data.toDate ? a.data.toDate() : new Date(a.data);
      const appHour = `${date.getHours().toString().padStart(2, '0')}:00`;
      
      const sameDay = date.getDate() === dateToCheck.getDate() &&
                     date.getMonth() === dateToCheck.getMonth() &&
                     date.getFullYear() === dateToCheck.getFullYear();

      return appHour === hour && a.profissionalId === profId && sameDay;
    });
  };

  const formatDateLabel = () => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', weekday: 'long' };
    if (viewMode === 'mes') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return currentDate.toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="bg-white rounded-3xl border border-primary-dark/5 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* Calendar Header */}
      <div className="p-6 border-b border-primary-dark/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CalendarDays className="text-primary-gold" size={24} />
          <div>
            <h3 className="text-xl font-serif font-bold text-primary-dark">Agenda BellaEstética</h3>
            <p className="text-xs text-primary-dark/40 font-bold uppercase tracking-widest">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex bg-primary-cream p-1 rounded-2xl">
          {(['dia', 'semana', 'mes'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === mode 
                  ? 'bg-white text-primary-gold shadow-sm' 
                  : 'text-primary-dark/40 hover:text-primary-dark'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-primary-cream rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="bg-primary-gold/10 text-primary-gold px-6 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] min-w-[200px] text-center">
            {formatDateLabel()}
          </div>
          <button 
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-primary-cream rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {(viewMode === 'semana' || viewMode === 'dia') && profissionais.length > 0 && (
        <div className="px-6 py-3 bg-primary-cream/20 border-b border-primary-dark/5 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase text-primary-dark/40 tracking-widest whitespace-nowrap">Filtrar Especialista:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedProfId('')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedProfId === '' 
                  ? 'bg-primary-gold text-white shadow-md' 
                  : 'bg-white text-primary-dark/60 border border-primary-dark/5 hover:border-primary-gold'
              }`}
            >
              Todos
            </button>
            {profissionais.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProfId(p.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedProfId === p.id 
                    ? 'bg-primary-gold text-white shadow-md' 
                    : 'bg-white text-primary-dark/60 border border-primary-dark/5 hover:border-primary-gold'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] h-full">
          {viewMode === 'dia' && (
            <>
              {/* Header Grid */}
              <div 
                className="grid border-b border-primary-dark/5 bg-primary-cream/20 sticky top-0 z-10"
                style={{ gridTemplateColumns: `100px repeat(${(selectedProfId ? profissionais.filter(p => p.id === selectedProfId) : profissionais).length || 1}, 1fr)` }}
              >
                <div className="p-4 bg-white" />
                {(selectedProfId ? profissionais.filter(p => p.id === selectedProfId) : (profissionais.length > 0 ? profissionais : [1])).map((prof: any, i) => (
                  <div key={prof.id || i} className="p-4 text-center border-l border-primary-dark/5">
                    <p className="font-serif font-bold text-primary-dark truncate">{prof.nome || 'Carregando...'}</p>
                    <p className="text-[10px] text-primary-gold font-bold uppercase tracking-tighter">Especialista</p>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              {hours.map((hour, i) => (
                <div 
                  key={i} 
                  className="grid border-b border-primary-dark/5 hover:bg-primary-cream/5 transition-colors"
                  style={{ gridTemplateColumns: `100px repeat(${(selectedProfId ? profissionais.filter(p => p.id === selectedProfId) : profissionais).length || 1}, 1fr)` }}
                >
                  <div className="p-4 flex flex-col items-center justify-center border-r border-primary-dark/5 bg-white">
                    <span className="text-sm font-bold text-primary-dark/40 tracking-tighter">{hour}</span>
                  </div>
                  {(selectedProfId ? profissionais.filter(p => p.id === selectedProfId) : profissionais).map((prof) => {
                    const app = getAppointment(hour, prof.id);
                    const client = clientes.find(c => c.id === app?.clienteId);
                    const procedure = procedimentos.find(p => p.id === app?.procedimentoId);

                    return (
                      <div key={prof.id} className="p-2 border-l border-primary-dark/5 min-h-[100px] relative group">
                        {app ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                              setSelectedAppointment(app);
                              setShowDetailModal(true);
                            }}
                            className={`p-3 rounded-2xl shadow-xl h-full border-l-4 cursor-pointer hover:scale-[1.02] transition-transform flex flex-col justify-between ${
                              app.status === 'concluido' 
                                ? 'bg-green-600 border-green-400' 
                                : 'bg-primary-dark border-primary-gold'
                            }`}
                          >
                            <div>
                              <p className="text-[10px] font-bold uppercase text-primary-gold mb-1">{procedure?.nome || 'Injetável'}</p>
                              <p className="text-xs font-bold leading-tight text-white">{client?.nome || 'Cliente Oculto'}</p>
                            </div>
                            <div className="flex items-center gap-1 mt-2 bg-white/10 w-fit px-2 py-0.5 rounded-full">
                               {app.status === 'concluido' ? (
                                 <CheckCircle2 size={10} className="text-white" />
                               ) : (
                                 <div className="w-2 h-2 rounded-full bg-primary-gold animate-pulse" />
                               )}
                               <span className="text-[9px] uppercase font-bold">
                                 {app.status === 'concluido' ? 'Concluído' : 'Confirmado'}
                               </span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <button 
                               onClick={() => handleOpenBook(hour, prof.id)}
                               className="text-[10px] bg-primary-gold text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary-gold/10 hover:scale-105 active:scale-95 transition-all"
                             >
                               Agendar
                             </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {viewMode === 'semana' && (
            <div className="h-full flex flex-col">
              {!selectedProfId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="p-6 bg-primary-gold/10 rounded-full text-primary-gold">
                    <User size={48} />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-bold text-primary-dark">Selecione um Especialista</h4>
                    <p className="text-sm text-primary-dark/40 max-w-xs mx-auto">A visualização semanal requer a seleção de um profissional específico no filtro acima.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-primary-dark/5 bg-primary-cream/20 sticky top-0 z-10">
                    <div className="p-4 bg-white" />
                    {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                      const day = new Date(currentDate);
                      day.setDate(currentDate.getDate() - currentDate.getDay() + offset + (currentDate.getDay() === 0 ? -6 : 1)); // Start Monday
                      return (
                        <div key={offset} className={`p-4 text-center border-l border-primary-dark/5 ${day.toDateString() === new Date().toDateString() ? 'bg-primary-gold/5' : ''}`}>
                          <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-widest">
                            {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </p>
                          <p className="font-serif font-bold text-primary-dark">{day.getDate()}</p>
                        </div>
                      );
                    })}
                  </div>
                  {hours.map((hour, i) => (
                    <div key={i} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-primary-dark/5 hover:bg-primary-cream/5 transition-colors">
                      <div className="p-4 flex items-center justify-center border-r border-primary-dark/5 bg-white">
                        <span className="text-sm font-bold text-primary-dark/40 tracking-tighter">{hour}</span>
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                        const day = new Date(currentDate);
                        day.setDate(currentDate.getDate() - currentDate.getDay() + offset + (currentDate.getDay() === 0 ? -6 : 1));
                        const app = getAppointment(hour, selectedProfId, day);
                        const client = clientes.find(c => c.id === app?.clienteId);
                        const procedure = procedimentos.find(p => p.id === app?.procedimentoId);

                        return (
                          <div key={offset} className="p-1 border-l border-primary-dark/5 min-h-[80px] relative group">
                            {app ? (
                              <div className="bg-primary-dark text-white p-2 rounded-xl shadow-md h-full border-l-2 border-primary-gold">
                                <p className="text-[8px] font-bold uppercase text-primary-gold truncate">{procedure?.nome}</p>
                                <p className="text-[10px] font-bold leading-tight truncate text-white">{client?.nome}</p>
                              </div>
                            ) : (
                              <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <button 
                                  onClick={() => {
                                    setCurrentDate(day);
                                    handleOpenBook(hour, selectedProfId);
                                  }}
                                  className="text-[8px] bg-primary-gold text-white px-2 py-1 rounded-lg font-bold uppercase tracking-wider"
                                >
                                  Agendar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {viewMode === 'mes' && (
            <div className="p-6 h-full bg-primary-cream/10">
              <div className="grid grid-cols-7 gap-px bg-primary-dark/5 border border-primary-dark/5 rounded-3xl overflow-hidden shadow-2xl">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(d => (
                  <div key={d} className="bg-primary-cream/50 p-4 text-center text-[10px] font-bold uppercase tracking-widest text-primary-dark/40">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                  const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1 - startOffset);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  // Count appointments for this day
                  const dayApps = agendamentos.filter(a => {
                    const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
                    return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
                  });

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('dia');
                      }}
                      className={`bg-white min-h-[120px] p-4 transition-all hover:bg-primary-cream/30 cursor-pointer flex flex-col justify-between ${!isCurrentMonth ? 'opacity-20' : ''}`}
                    >
                      <span className={`text-sm font-bold ${isToday ? 'bg-primary-gold text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-primary-gold/20' : 'text-primary-dark/40'}`}>
                        {day.getDate()}
                      </span>
                      {dayApps.length > 0 && (
                        <div className="space-y-1">
                          {dayApps.slice(0, 2).map((a, idx) => (
                            <div key={idx} className="text-[8px] bg-primary-dark/5 text-primary-dark px-2 py-1 rounded-lg truncate border-l-2 border-primary-gold font-bold">
                              {clientes.find(c => c.id === a.clienteId)?.nome}
                            </div>
                          ))}
                          {dayApps.length > 2 && (
                            <div className="text-[8px] text-primary-gold font-bold pl-2">
                              + {dayApps.length - 2} mais
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-primary-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleBook}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-serif text-primary-dark font-bold">Novo Agendamento</h3>
                  <p className="text-xs text-primary-dark/40 font-bold uppercase">Reservando para às {selectedSlot?.hour}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Selecionar Cliente
                  </label>
                  <select 
                    required
                    value={formData.clienteId}
                    onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                    className="w-full px-4 py-3 bg-primary-cream/40 border border-primary-dark/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 appearance-none font-medium"
                  >
                    <option value="">Buscar cliente cadastrado...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest flex items-center gap-2">
                    <Scissors size={12} /> Selecionar Procedimento
                  </label>
                  <select 
                    required
                    value={formData.procedimentoId}
                    onChange={(e) => setFormData({...formData, procedimentoId: e.target.value})}
                    className="w-full px-4 py-3 bg-primary-cream/40 border border-primary-dark/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 appearance-none font-medium"
                  >
                    <option value="">Escolher serviço...</option>
                    {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest">Observações (Opcional)</label>
                  <textarea 
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    className="w-full px-4 py-3 bg-primary-cream/40 border border-primary-dark/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 h-24 resize-none" 
                    placeholder="Ex: Alérgica a algum produto..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 border border-primary-dark/10 rounded-2xl font-bold hover:bg-primary-cream text-primary-dark transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-primary-gold text-white rounded-2xl font-bold shadow-xl shadow-primary-gold/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  Confirmar Reserva
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAppointment && (
          <div className="fixed inset-0 bg-primary-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 space-y-6"
            >
               <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-primary-gold/10 rounded-full flex items-center justify-center text-primary-gold">
                     <CheckCircle2 size={24} />
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40">
                     <X size={20} />
                  </button>
               </div>

               <div className="text-center">
                  <h4 className="text-xl font-serif font-bold text-primary-dark">Detalhes do Agendamento</h4>
                  <p className="text-sm text-primary-dark/40 font-medium italic mt-1">Status atual: <span className="text-primary-gold font-bold uppercase">{selectedAppointment.status}</span></p>
               </div>

               <div className="bg-primary-cream/30 p-5 rounded-3xl space-y-3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-dark shadow-sm">
                        <User size={14} />
                     </div>
                     <div>
                        <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-widest">Cliente</p>
                        <p className="text-sm font-bold text-primary-dark">
                           {clientes.find(c => c.id === selectedAppointment.clienteId)?.nome}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-dark shadow-sm">
                        <Scissors size={14} />
                     </div>
                     <div>
                        <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-widest">Serviço</p>
                        <p className="text-sm font-bold text-primary-dark">
                           {procedimentos.find(p => p.id === selectedAppointment.procedimentoId)?.nome}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  {selectedAppointment.status !== 'concluido' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'concluido')}
                      className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Flag size={18} />
                      Marcar como Concluído
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmado')}
                      className="w-full py-4 bg-primary-dark text-white rounded-2xl font-bold shadow-lg shadow-primary-dark/20 hover:bg-primary-dark/90 transition-colors flex items-center justify-center gap-2"
                    >
                      Reverter para Confirmado
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                    className="w-full py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Remover Agendamento
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
