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
  Flag,
  FileText,
  MessageSquare
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Profissional, Cliente, Procedimento, Agendamento, Disponibilidade } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import AnamnesisForm from '../components/AnamnesisForm';
import { Lock, Unlock, Eye, Settings2, Check } from 'lucide-react';

export default function AgendaView({ initialProfId = '' }: { initialProfId?: string }) {
  const hours = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];
  
  // Data State
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<{ hour: string, profId: string } | null>(null);
  const [endHourForDisp, setEndHourForDisp] = useState<string>('');
  const [selectedProceduresForDisp, setSelectedProceduresForDisp] = useState<string[]>([]);

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
    procedimentoIds: [] as string[],
    notas: ''
  });

  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnamnesis, setShowAnamnesis] = useState<string | null>(null);
  const [fichaStatus, setFichaStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (agendamentos.length > 0) {
      const unsubFichas = onSnapshot(collection(db, 'fichasAnamnese'), (shot) => {
        const statuses: Record<string, boolean> = {};
        shot.docs.forEach(doc => {
          const data = doc.data();
          statuses[data.clienteId] = true;
        });
        setFichaStatus(statuses);
      });
      return () => unsubFichas();
    }
  }, [agendamentos]);

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

  const handleNotifySpecialist = (appointment: Agendamento) => {
    const prof = profissionais.find(p => p.id === appointment.profissionalId);
    const client = clientes.find(c => c.id === appointment.clienteId);
    const appProcIds = appointment.procedimentoIds || [(appointment as any).procedimentoId];
    const selectedProcs = procedimentos.filter(p => appProcIds.includes(p.id));
    const procsLabel = selectedProcs.map(p => p.nome).join(', ');
    
    if (!prof || !prof.telefone) {
      alert("Profissional sem telefone cadastrado.");
      return;
    }

    const date = appointment.data.toDate();
    const message = `Olá *${prof.nome}*! 💅%0A%0A` +
      `*Novo agendamento confirmado para você:*%0A` +
      `📅 Data: ${date.toLocaleDateString('pt-BR')}%0A` +
      `⏰ Hora: ${date.getHours().toString().padStart(2, '0')}:00%0A` +
      `👤 Cliente: ${client?.nome}%0A` +
      `✨ Serviços: ${procsLabel}%0A` +
      `📝 Notas: ${appointment.notas || 'Nenhuma'}%0A%0A` +
      `Confira os detalhes no sistema *BellaEstética*! ✨`;

    const phone = prof.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
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
    });
    const unsubDisp = onSnapshot(collection(db, 'disponibilidades'), (shot) => {
      setDisponibilidades(shot.docs.map(d => ({ id: d.id, ...d.data() } as Disponibilidade)));
      setLoading(false);
    });

    return () => { unsubProf(); unsubCli(); unsubProc(); unsubAgenda(); unsubDisp(); };
  }, []);

  const handleOpenBook = (hour: string, profId: string) => {
    setSelectedSlot({ hour, profId });
    setShowModal(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !formData.clienteId || formData.procedimentoIds.length === 0) return;

    const selectedProcs = procedimentos.filter(p => formData.procedimentoIds.includes(p.id));
    const totalDuration = selectedProcs.reduce((sum, p) => sum + (p.duracao || 30), 0);
    const slotsNeeded = Math.ceil(totalDuration / 30);

    const startIndex = hours.indexOf(selectedSlot.hour);
    
    // Check all needed slots
    for (let i = 0; i < slotsNeeded; i++) {
       const currentHour = hours[startIndex + i];
       if (!currentHour) {
         alert("O procedimento ultrapassa o horário de funcionamento.");
         return;
       }
       
       const existingApp = getAppointment(currentHour, selectedSlot.profId);
       const availability = getDisponibilidade(currentHour, selectedSlot.profId);

       if (existingApp) {
         alert(`O horário ${currentHour} já possui um agendamento.`);
         return;
       }

       if (!availability || !availability.aberta) {
         alert(`O horário ${currentHour} não foi aberto pelo especialista.`);
         return;
       }

       if (availability.procedimentosIds && availability.procedimentosIds.length > 0) {
          // Verify if all selected procs are allowed in this slot
          const disallowed = formData.procedimentoIds.filter(pid => !availability.procedimentosIds?.includes(pid));
          if (disallowed.length > 0) {
            const names = procedimentos.filter(p => disallowed.includes(p.id)).map(p => p.nome).join(', ');
            alert(`Os procedimentos: ${names} não estão disponíveis para o horário ${currentHour}.`);
            return;
          }
       }
    }

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
      setFormData({ clienteId: '', procedimentoIds: [], notas: '' });
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
      const appProcIds = a.procedimentoIds || [(a as any).procedimentoId];
      const selectedProcs = procedimentos.filter(p => appProcIds.includes(p.id));
      const totalDuration = selectedProcs.reduce((sum, p) => sum + (p.duracao || 30), 0);
      
      const sameDay = date.getDate() === dateToCheck.getDate() &&
                     date.getMonth() === dateToCheck.getMonth() &&
                     date.getFullYear() === dateToCheck.getFullYear();

      if (!sameDay || a.profissionalId !== profId) return false;

      const [h, m] = hour.split(':');
      const slotMinutes = parseInt(h) * 60 + parseInt(m);
      const startMinutes = date.getHours() * 60 + date.getMinutes();
      const endMinutes = startMinutes + totalDuration;

      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const isSlotStartOfAppointment = (appointment: Agendamento, hour: string) => {
    if (!appointment.data) return false;
    const date = appointment.data.toDate ? appointment.data.toDate() : new Date(appointment.data);
    const appHour = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return appHour === hour;
  };

  const getDisponibilidade = (hour: string, profId: string, dateToCheck: Date = currentDate) => {
    return disponibilidades.find(d => {
      if (!d.data) return false;
      const date = d.data.toDate ? d.data.toDate() : new Date(d.data);
      const dispHour = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const sameDay = date.getDate() === dateToCheck.getDate() &&
                     date.getMonth() === dateToCheck.getMonth() &&
                     date.getFullYear() === dateToCheck.getFullYear();

      return dispHour === hour && d.profissionalId === profId && sameDay;
    });
  };

  const canServiceFit = (startHour: string, profId: string, duration: number, dateToCheck: Date = currentDate) => {
    const startIndex = hours.indexOf(startHour);
    const slotsNeeded = Math.ceil(duration / 30);
    
    for (let i = 0; i < slotsNeeded; i++) {
      const currentHour = hours[startIndex + i];
      if (!currentHour) return false;
      
      // Check if slot is open
      const disp = getDisponibilidade(currentHour, profId, dateToCheck);
      if (!disp || !disp.aberta) return false;
      
      // Check if slot is busy
      const app = getAppointment(currentHour, profId, dateToCheck);
      if (app) return false;
    }
    return true;
  };

  const handleToggleAvailability = async (hour: string, profId: string) => {
    const disp = getDisponibilidade(hour, profId);
    
    if (disp && disp.aberta) {
      try {
        await updateDoc(doc(db, 'disponibilidades', disp.id), { aberta: false });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'disponibilidades');
      }
    } else {
      setSelectedProceduresForDisp(disp?.procedimentosIds || []);
      setEndHourForDisp(hour);
      setShowAvailabilityModal({ hour, profId });
    }
  };

  const handleSaveAvailability = async () => {
    if (!showAvailabilityModal) return;
    const { hour, profId } = showAvailabilityModal;
    
    const startIndex = hours.indexOf(hour);
    const endIndex = hours.indexOf(endHourForDisp);
    const targetHours = hours.slice(startIndex, endIndex + 1);

    try {
      const batch = writeBatch(db);
      
      for (const h of targetHours) {
        const existing = getDisponibilidade(h, profId);
        if (existing) {
          batch.update(doc(db, 'disponibilidades', existing.id), {
            aberta: true,
            procedimentosIds: selectedProceduresForDisp
          });
        } else {
          const bookDate = new Date(currentDate);
          const [hh, mm] = h.split(':');
          bookDate.setHours(parseInt(hh), parseInt(mm), 0, 0);
          
          const newDoc = doc(collection(db, 'disponibilidades'));
          batch.set(newDoc, {
            profissionalId: profId,
            data: Timestamp.fromDate(bookDate),
            aberta: true,
            procedimentosIds: selectedProceduresForDisp
          });
        }
      }
      
      await batch.commit();
      setShowAvailabilityModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'disponibilidades');
    }
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManagementMode(!isManagementMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              isManagementMode 
                ? 'bg-primary-dark text-white shadow-xl scale-105' 
                : 'bg-primary-cream text-primary-dark/40 hover:text-primary-dark'
            }`}
          >
            {isManagementMode ? <Settings2 size={16} className="text-primary-gold" /> : <Eye size={16} />}
            {isManagementMode ? 'Modo Gestão' : 'Modo Visualização'}
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
                    const disp = getDisponibilidade(hour, prof.id);
                    const client = clientes.find(c => c.id === app?.clienteId);
                    const appProcIds = app ? (app.procedimentoIds || [(app as any).procedimentoId]) : [];
                    const selectedProcs = app ? procedimentos.filter(p => appProcIds.includes(p.id)) : [];
                    const totalDuration = selectedProcs.reduce((sum, p) => sum + (p.duracao || 30), 0);
                    const isStart = app ? isSlotStartOfAppointment(app, hour) : false;
                    const slotsNeeded = Math.ceil(totalDuration / 30);

                    return (
                      <div key={prof.id} className={`p-2 border-l border-primary-dark/5 min-h-[100px] relative group transition-colors ${!app && !disp?.aberta ? 'bg-primary-dark/[0.02]' : ''}`}>
                        {app ? (
                          isStart && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => {
                                setSelectedAppointment(app);
                                setShowDetailModal(true);
                              }}
                              style={{ 
                                height: `calc(${slotsNeeded * 100}% - 12px)`,
                                zIndex: 20
                              }}
                              className={`absolute top-2 left-2 right-2 p-3 rounded-2xl border-2 shadow-2xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col items-start ${
                                app.status === 'concluido' 
                                  ? 'bg-green-600 border-green-400' 
                                  : 'bg-primary-dark border-primary-gold'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-primary-gold mb-1 truncate max-w-[120px]">
                                    {selectedProcs.length > 1 ? `${selectedProcs.length} Serviços` : (selectedProcs[0]?.nome || 'Procedimento')}
                                  </p>
                                  <p className="text-sm font-bold leading-tight text-white mb-1">{client?.nome || 'Cliente'}</p>
                                  <div className="text-[10px] text-white/60 flex items-center gap-1 font-medium">
                                    <span>{totalDuration} min</span>
                                  </div>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${fichaStatus[app.clienteId] ? 'bg-green-400' : 'bg-red-400 shadow-lg shadow-red-500/50'}`} title={fichaStatus[app.clienteId] ? 'Ficha Ok' : 'Ficha Pendente'} />
                              </div>
                              
                              <div className="mt-auto flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-full">
                                {app.status === 'concluido' ? (
                                  <CheckCircle2 size={12} className="text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-primary-gold animate-pulse" />
                                )}
                                <span className="text-[9px] uppercase font-bold text-white tracking-widest">
                                  {app.status === 'concluido' ? 'Concluído' : 'Confirmado'}
                                </span>
                              </div>
                            </motion.div>
                          )
                        ) : disp?.aberta ? (
                          <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
                             <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-lg">Livre</span>
                             <button 
                               onClick={() => isManagementMode ? handleToggleAvailability(hour, prof.id) : handleOpenBook(hour, prof.id)}
                               className={`text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                                 isManagementMode 
                                   ? 'bg-primary-dark text-white shadow-lg shadow-primary-dark/10' 
                                   : 'bg-primary-gold text-white shadow-lg shadow-primary-gold/10'
                               }`}
                             >
                               {isManagementMode ? 'Gerenciar' : 'Agendar'}
                             </button>
                             {isManagementMode && (
                               <button 
                                onClick={() => handleToggleAvailability(hour, prof.id)}
                                className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-primary-dark/5 rounded-full text-green-600 hover:text-red-500 transition-colors"
                                title="Fechar Horário"
                               >
                                 <Unlock size={12} />
                               </button>
                             )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                             {isManagementMode ? (
                               <button 
                                 onClick={() => handleToggleAvailability(hour, prof.id)}
                                 className="flex flex-col items-center gap-1 text-primary-dark hover:text-primary-gold transition-colors"
                               >
                                 <Lock size={16} />
                                 <span className="text-[8px] font-bold uppercase">Abrir Horário</span>
                               </button>
                             ) : (
                               <div className="flex flex-col items-center gap-1">
                                 <Lock size={16} className="text-primary-dark/20" />
                                 <span className="text-[8px] font-bold uppercase text-primary-dark/20">Indisponível</span>
                               </div>
                             )}
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
                        const disp = getDisponibilidade(hour, selectedProfId, day);
                        const client = clientes.find(c => c.id === app?.clienteId);
                        const appProcIds = app ? (app.procedimentoIds || [(app as any).procedimentoId]) : [];
                        const selectedProcs = app ? procedimentos.filter(p => appProcIds.includes(p.id)) : [];
                        const totalDuration = selectedProcs.reduce((sum, p) => sum + (p.duracao || 30), 0);
                        const isStart = app ? isSlotStartOfAppointment(app, hour) : false;
                        const slotsNeeded = totalDuration / 30;

                        return (
                          <div key={offset} className={`p-1 border-l border-primary-dark/5 min-h-[80px] relative group transition-colors ${!app && !disp?.aberta ? 'bg-primary-dark/[0.02]' : ''}`}>
                            {app ? (
                              isStart && (
                                <div 
                                  onClick={() => {
                                    setSelectedAppointment(app);
                                    setShowDetailModal(true);
                                  }}
                                  style={{ 
                                    height: `calc(${slotsNeeded * 100}% - 4px)`,
                                    zIndex: 20
                                  }}
                                  className={`absolute top-1 left-1 right-1 bg-primary-dark text-white p-2 rounded-xl shadow-lg border-l-4 border-primary-gold cursor-pointer transition-all hover:scale-105 ${
                                    app.status === 'concluido' ? 'bg-green-700 border-green-400' : ''
                                  }`}
                                >
                                  <p className="text-[7px] font-bold uppercase text-primary-gold truncate mb-0.5">
                                    {selectedProcs.length > 1 ? `${selectedProcs.length} Serviços` : (selectedProcs[0]?.nome || 'Procedimento')}
                                  </p>
                                  <p className="text-[9px] font-bold leading-tight truncate text-white">{client?.nome}</p>
                                  <p className="text-[7px] text-white/40 mt-1">{totalDuration} min</p>
                                </div>
                              )
                            ) : disp?.aberta ? (
                              <div className="w-full h-full flex flex-col items-center justify-center space-y-1">
                                <span className="text-[8px] font-bold text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded cursor-default">Livre</span>
                                <button 
                                  onClick={() => {
                                    if (isManagementMode) {
                                      setCurrentDate(day);
                                      handleToggleAvailability(hour, selectedProfId);
                                    } else {
                                      setCurrentDate(day);
                                      handleOpenBook(hour, selectedProfId);
                                    }
                                  }}
                                  className={`text-[8px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${
                                    isManagementMode 
                                      ? 'bg-primary-dark text-white' 
                                      : 'bg-primary-gold text-white'
                                  }`}
                                >
                                  {isManagementMode ? 'Editar' : 'Agendar'}
                                </button>
                                {isManagementMode && (
                                   <button 
                                    onClick={() => {
                                      setCurrentDate(day);
                                      handleToggleAvailability(hour, selectedProfId);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-white shadow-sm border border-primary-dark/5 rounded-full text-green-600"
                                   >
                                     <Unlock size={10} />
                                   </button>
                                 )}
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                 {isManagementMode ? (
                                   <button 
                                     onClick={() => {
                                       setCurrentDate(day);
                                       handleToggleAvailability(hour, selectedProfId);
                                     }}
                                     className="flex flex-col items-center gap-0.5 text-primary-dark hover:text-primary-gold transition-colors"
                                   >
                                     <Lock size={12} />
                                     <span className="text-[7px] font-bold uppercase">Abrir</span>
                                   </button>
                                 ) : (
                                   <div className="flex flex-col items-center gap-0.5">
                                     <Lock size={12} className="text-primary-dark/20" />
                                     <span className="text-[7px] font-bold uppercase text-primary-dark/20">Indis-</span>
                                   </div>
                                 )}
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest flex items-center gap-2">
                    <Scissors size={12} /> Selecionar Procedimentos
                  </label>
                  <p className="text-[10px] text-primary-dark/40 italic">Selecione um ou mais serviços para este agendamento.</p>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const disp = selectedSlot ? getDisponibilidade(selectedSlot.hour, selectedSlot.profId) : null;
                      const filteredProcs = disp?.procedimentosIds && disp.procedimentosIds.length > 0
                        ? procedimentos.filter(p => disp.procedimentosIds?.includes(p.id))
                        : procedimentos;
                      
                      return filteredProcs.map(proc => {
                        const isSelected = formData.procedimentoIds.includes(proc.id);
                        return (
                          <button
                            key={proc.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                procedimentoIds: isSelected 
                                  ? prev.procedimentoIds.filter(id => id !== proc.id)
                                  : [...prev.procedimentoIds, proc.id]
                              }));
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isSelected
                                ? 'border-primary-gold bg-primary-gold/5 text-primary-dark'
                                : 'border-primary-dark/5 bg-white text-primary-dark/60'
                            }`}
                          >
                            <div className="text-left">
                              <p className="text-sm font-bold">{proc.nome}</p>
                              <p className="text-[10px] opacity-60">{proc.duracao} min • R$ {proc.preco}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary-gold border-primary-gold text-white' : 'border-primary-dark/10'
                            }`}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  {formData.procedimentoIds.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-primary-gold/10 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-gold animate-pulse" />
                      <span className="text-[10px] font-bold text-primary-gold uppercase">
                        Duração Total: {procedimentos.filter(p => formData.procedimentoIds.includes(p.id)).reduce((s, p) => s + p.duracao, 0)} minutos
                      </span>
                    </div>
                  )}
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
                        <p className="text-[10px] text-primary-dark/40 font-bold uppercase tracking-widest">Serviços</p>
                        <p className="text-sm font-bold text-primary-dark">
                           {(() => {
                             const ids = selectedAppointment.procedimentoIds || [(selectedAppointment as any).procedimentoId];
                             return procedimentos.filter(p => ids.includes(p.id)).map(p => p.nome).join(', ');
                           })()}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <button 
                    onClick={() => handleNotifySpecialist(selectedAppointment)}
                    className="w-full py-4 bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-dark/20 hover:scale-[1.02] transition-transform"
                  >
                    <MessageSquare size={18} className="text-primary-gold" />
                    Enviar para WhatsApp do Especialista
                  </button>

                  <button 
                    onClick={() => {
                      setShowAnamnesis(selectedAppointment.clienteId);
                      setShowDetailModal(false);
                    }}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${
                      fichaStatus[selectedAppointment.clienteId]
                        ? 'bg-primary-cream/30 border-primary-gold/20 text-primary-dark'
                        : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    <FileText size={18} />
                    {fichaStatus[selectedAppointment.clienteId] 
                      ? 'Revisar Ficha de Anamnese' 
                      : 'Preencher Ficha de Anamnese'}
                  </button>
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

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-primary-dark/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-primary-dark/5 flex items-center justify-between bg-primary-cream/20">
              <div>
                <h4 className="text-xl font-serif font-bold text-primary-dark">Abrir Horário</h4>
                <p className="text-xs text-primary-dark/40 font-medium">{showAvailabilityModal.hour} - {profissionais.find(p => p.id === showAvailabilityModal.profId)?.nome}</p>
              </div>
              <button 
                onClick={() => setShowAvailabilityModal(null)}
                className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest block">Início</label>
                  <div className="px-4 py-3 bg-primary-cream/40 border border-primary-dark/5 rounded-2xl font-bold text-primary-dark">
                    {showAvailabilityModal.hour}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest block">Repetir até</label>
                  <select
                    value={endHourForDisp}
                    onChange={(e) => setEndHourForDisp(e.target.value)}
                    className="w-full px-4 py-3 bg-primary-cream/40 border border-primary-dark/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 appearance-none font-bold text-primary-dark"
                  >
                    {hours.slice(hours.indexOf(showAvailabilityModal.hour)).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest block">Serviços Permitidos</label>
                <p className="text-xs text-primary-dark/40 italic">Se nenhum for selecionado, todos os serviços serão permitidos.</p>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {procedimentos.map(proc => (
                    <button
                      key={proc.id}
                      onClick={() => {
                        setSelectedProceduresForDisp(prev => 
                          prev.includes(proc.id) ? prev.filter(id => id !== proc.id) : [...prev, proc.id]
                        );
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedProceduresForDisp.includes(proc.id)
                          ? 'border-primary-gold bg-primary-gold/5 text-primary-dark'
                          : 'border-primary-dark/5 bg-white text-primary-dark/60'
                      }`}
                    >
                      <span className="text-sm font-bold">{proc.nome}</span>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedProceduresForDisp.includes(proc.id) ? 'bg-primary-gold border-primary-gold text-white' : 'border-primary-dark/10'
                      }`}>
                        {selectedProceduresForDisp.includes(proc.id) && <Check size={12} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-primary-cream/10 border-t border-primary-dark/5 flex gap-3">
              <button 
                onClick={() => setShowAvailabilityModal(null)}
                className="flex-1 py-3 border border-primary-dark text-primary-dark rounded-xl font-bold hover:bg-primary-cream transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAvailability}
                className="flex-1 py-3 bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary-dark/10 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAnamnesis && (
        <AnamnesisForm 
          clienteId={showAnamnesis}
          onClose={() => setShowAnamnesis(null)}
        />
      )}
    </div>
  );
}
