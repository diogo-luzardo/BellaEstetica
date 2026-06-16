/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smartphone, 
  User, 
  Sparkles,
  CheckCheck,
  Clock,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  query,
  where,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Profissional, Procedimento, Cliente, Agendamento, Disponibilidade } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: number;
  type: 'client' | 'system';
  text: string;
  time: string;
  isAI?: boolean;
}

export default function WhatsAppView() {
  const { currentTenantId } = useAuth();
  
  // Data State
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);

  // Simulation State
  const [selectedSimulatedClientId, setSelectedSimulatedClientId] = useState<string>('novo_coleta');
  const [customClientName, setCustomClientName] = useState<string>('');
  const [customClientPhone, setCustomClientPhone] = useState<string>('');

  const [notificacoesDoutoras, setNotificacoesDoutoras] = useState<{
    id: number;
    doctorName: string;
    doctorPhone: string;
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    service: string;
    text: string;
    sentAt: string;
  }[]>(() => {
    try {
      const stored = localStorage.getItem('notif_doutoras');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('notif_doutoras', JSON.stringify(notificacoesDoutoras));
  }, [notificacoesDoutoras]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'system', text: 'Olá! Sou a Bella, sua assistente da BellaEstética. Como posso ajudar com sua beleza hoje? 🏠✨', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prevClientRef = useRef<string>(selectedSimulatedClientId);

  // Dynamically update greeting message based on selected client (ONLY on manual client switch)
  useEffect(() => {
    if (prevClientRef.current !== selectedSimulatedClientId) {
      prevClientRef.current = selectedSimulatedClientId;
      if (selectedSimulatedClientId === 'novo_coleta') {
        setMessages([
          { 
            id: 1, 
            type: 'system', 
            text: 'Olá! Sou a Bella, sua assistente da BellaEstética. Como posso ajudar com sua beleza hoje? 🏠✨', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }
        ]);
        setCustomClientName('');
        setCustomClientPhone('');
      } else {
        const activeClient = clientes.find(c => c.id === selectedSimulatedClientId);
        if (activeClient) {
          setMessages([
            { 
              id: 1, 
              type: 'system', 
              text: `Olá, ${activeClient.nome}! Sou a Bella, sua assistente da BellaEstética. Que maravilhoso falar com você de novo! 🌸 Deseja agendar um novo horário ou consultar seus agendamentos atuais? ✨`, 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }
          ]);
        }
      }
    } else if (selectedSimulatedClientId !== 'novo_coleta' && messages.length <= 1) {
      const activeClient = clientes.find(c => c.id === selectedSimulatedClientId);
      if (activeClient) {
        setMessages([
          { 
            id: 1, 
            type: 'system', 
            text: `Olá, ${activeClient.nome}! Sou a Bella, sua assistente da BellaEstética. Que maravilhoso falar com você de novo! 🌸 Deseja agendar um novo horário ou consultar seus agendamentos atuais? ✨`, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }
        ]);
      }
    }
  }, [selectedSimulatedClientId, clientes]);

  useEffect(() => {
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (!currentTenantId) return;

    const qProf = query(collection(db, 'profissionais'), where('tenantId', '==', currentTenantId));
    const unsubProf = onSnapshot(qProf, (shot) => {
      setProfissionais(shot.docs.map(d => ({ id: d.id, ...d.data() } as Profissional)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'profissionais');
    });

    const qProc = query(collection(db, 'procedimentos'), where('tenantId', '==', currentTenantId));
    const unsubProc = onSnapshot(qProc, (shot) => {
      setProcedimentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Procedimento)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'procedimentos');
    });

    const qCli = query(collection(db, 'clientes'), where('tenantId', '==', currentTenantId));
    const unsubCli = onSnapshot(qCli, (shot) => {
      setClientes(shot.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'clientes');
    });

    const qAgenda = query(collection(db, 'agendamentos'), where('tenantId', '==', currentTenantId));
    const unsubAgenda = onSnapshot(qAgenda, (shot) => {
      setAgendamentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'agendamentos');
    });

    const qDisp = query(collection(db, 'disponibilidades'), where('tenantId', '==', currentTenantId));
    const unsubDisp = onSnapshot(qDisp, (shot) => {
      setDisponibilidades(shot.docs.map(d => ({ id: d.id, ...d.data() } as Disponibilidade)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'disponibilidades');
    });

    return () => { 
      unsubProf(); 
      unsubProc(); 
      unsubCli(); 
      unsubAgenda(); 
      unsubDisp(); 
    };
  }, [currentTenantId]);

  const generateAIResponse = async (userText: string, currentHistory: Message[]) => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

      const finalClientName = selectedSimulatedClientId === 'novo_coleta' 
        ? (customClientName || 'Cliente Novo') 
        : (clientes.find(c => c.id === selectedSimulatedClientId)?.nome || 'Cliente Selecionado');

      const finalClientPhone = selectedSimulatedClientId === 'novo_coleta' 
        ? (customClientPhone || 'Telefone não informado') 
        : (clientes.find(c => c.id === selectedSimulatedClientId)?.telefone || 'Sem telefone');
      
      const now = new Date();
      const currentDayOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][now.getDay()];
      const currentDateString = now.toLocaleDateString('pt-BR');
      const currentTimeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Build context listing existing client appointments dynamically under Firestore
      const filteredAppointments = selectedSimulatedClientId !== 'novo_coleta'
        ? agendamentos.filter(a => a.clienteId === selectedSimulatedClientId)
        : [];

      const formattedAppointments = filteredAppointments.length > 0
        ? filteredAppointments.map(a => {
            const appointmentDate = a.data ? (a.data.toDate ? a.data.toDate() : new Date(a.data)) : null;
            if (!appointmentDate) return '- Sem data';
            const dateStr = appointmentDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const prof = profissionais.find(p => p.id === a.profissionalId)?.nome || 'Especialista';
            const procs = (a.procedimentoIds || []).map(pid => procedimentos.find(p => p.id === pid)?.nome || 'Procedimento').join(', ');
            return `- Dia/Hora: ${dateStr}, Profissional: ${prof}, Serviço(s): ${procs} (Status: ${a.status})`;
          }).join('\n')
        : 'Nenhum agendamento encontrado para este paciente.';

      // Get open slots (disponibilidades)
      const openSlots = disponibilidades.filter(d => d.aberta);
      const formattedSlots = openSlots.length > 0
        ? openSlots.map(d => {
            const slotDate = d.data ? (d.data.toDate ? d.data.toDate() : new Date(d.data)) : null;
            if (!slotDate) return '';
            const slotStr = slotDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const prof = profissionais.find(p => p.id === d.profissionalId)?.nome || 'Especialista';
            return `- ${slotStr} com especialista ${prof}`;
          }).filter(Boolean).join('\n')
        : 'Sem disponibilidades cadastrais específicas. Use o horário de funcionamento padrão de Segunda a Sábado das 08:00 às 18:30.';

      // Format conversation history
      const formattedHistory = currentHistory
        .map(m => m.type === 'client' ? `Paciente: ${m.text}` : `Bella (IA): ${m.text}`)
        .join('\n');

      const context = `
        Você é a Bella, assistente virtual de luxo da clínica BellaEstética.
        Seja extremamente cordial, use alguns emojis e trate agendamentos com toda precisão estética.
        
        Sua clínica possui os seguintes PROFISSIONAIS cadastrados (identifique-os quando o cliente solicitar):
        ${profissionais.map(p => `- ID: ${p.id}, Nome: ${p.nome} (Especialidade: ${p.especialidade})`).join('\n')}
        
        E os seguintes PROCEDIMENTOS/SERVIÇOS que a clínica realiza:
        ${procedimentos.map(p => `- ID: ${p.id}, Nome: ${p.nome}, Preço: R$ ${p.preco}, Duração: ${p.duracao}min`).join('\n')}
        
        ---
        DADOS DE DATA E HORA DE HOJE (Crucial para identificar "amanhã", "esta semana", etc.):
        Hoje é: ${currentDayOfWeek}, ${currentDateString}.
        Hora atual: ${currentTimeString}.
        
        ---
        DADOS DO PACIENTE ATUAL DO ATENDIMENTO WHATSAPP:
        - Nome atual do sistema: ${selectedSimulatedClientId === 'novo_coleta' ? (customClientName ? customClientName : 'Não cadastrado nos dados da IA/Pergunte') : finalClientName}
        - Telefone atual do sistema: ${selectedSimulatedClientId === 'novo_coleta' ? (customClientPhone ? customClientPhone : 'Não cadastrado nos dados da IA/Pergunte') : finalClientPhone}
        - Status do cliente: ${selectedSimulatedClientId === 'novo_coleta' ? 'NOVO PACIENTE (Simulado)' : 'PACIENTE EXISTENTE NO SISTEMA'}

        ---
        FICHAS DE AGENDAMENTOS DO PACIENTE SELECIONADO:
        ${formattedAppointments}
        
        ---
        HORÁRIOS DE DISPONIBILIDADE DO EXPEDIENTE (Disponibilidades abertas de especialistas):
        ${formattedSlots}

        ---
        HISTÓRICO DA CONVERSAÇÃO ATUAL (Consulte para saber o que já foi dito, o nome informado e o telefone):
        ${formattedHistory}

        ---
        MENSAGEM MAIS RECENTE ENVIADA PELO PACIENTE (Responda a ela):
        "${userText}"

        DIRETRIZES E REGRAS CRÍTICAS DE CONVERSAÇÃO (SIGA À RISCA):
        1. MERA SONDAGEM / PERGUNTAS DE DISPONIBILIDADE: Se o paciente apenas perguntar se há horários ativos, se há agenda de Botox para hoje, preços, ou se estiver tirando qualquer dúvida, responda acolhedoramente informando suas opções de horários de folga ou funcionamento comercial. Mantenha o objeto "booking" como null! NÃO PREENCHA o objeto "booking" para perguntas ou sondagens de horários.
        2. COLETAR DADOS PARA NOVOS PACIENTES: Para novos pacientes (onde o Nome atual ou Telefone atual nos dados acima constam como 'Não cadastrado nos dados da IA/Pergunte' ou não foram informados no histórico de mensagens acima), você é terminantemente PROIBIDA de preencher o objeto "booking" com dados inventados, vazios ou genéricos (como "Cliente Novo", "Não informado", etc). Você DEVE primeiro solicitar educadamente o Nome Completo e o Telefone de contato dele. Enquanto ele não os fornecer formalmente no chat, mantenha "booking" obrigatoriamente como null na sua resposta JSON.
        3. QUANDO AGENDAR (REQUISITOS): Você SÓ PODERÁ preencher e retornar o objeto "booking" (não-null) quando se cumprirem TODOS os requisitos abaixo cumulativamente:
           - O paciente der uma instrução explícita de confirmação de agendamento (ex: "pode agendar", "quero marcar", "confirma para mim para hoje às 14:30 com tal profissional").
           - Você possuir o Nome Completo verídico informado pelo próprio paciente no histórico das mensagens.
           - Você possuir o Telefone verídico informado pelo próprio paciente no histórico.
           - Você possuir um dia e horário específicos acordados.
           - O serviço desejado constar na lista de PROCEDIMENTOS permitidos.
           - O profissional preferido estar selecionado.
           Se faltar qualquer um desses itens, mantenha "booking" como null e solicite amigavelmente o dado que falta em sua resposta ("reply").
        4. Se preencher "booking" (somente nas condições perfeitas descritas na Regra 3), garanta que:
           - "date" seja no formato YYYY-MM-DD (converta termos como "hoje" para data real com base no dia de hoje ${currentDateString}, "amanhã" ou "segunda que vem" para datas reais com base no dia de hoje ${currentDateString}).
           - "time" seja no formato HH:MM (ex: "18:00").
           - "profissionalId" seja o ID real do profissional escolhido (ex: "${profissionais[0]?.id || ''}").
           - "procedimentoIds" seja uma lista contendo os IDs reais correspondentes (ex: ["${procedimentos[0]?.id || ''}"]).
           - "clientName" contendo o nome fornecido pelo paciente.
           - "clientPhone" contendo o telefone do paciente.

        Seu retorno DEVE ser obrigatoriamente um objeto JSON com o formato exato:
        {
          "reply": "Sua resposta com emojis para o painel do WhatsApp",
          "booking": null ou {
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "profissionalId": "ID_DO_PROFISSIONAL",
            "procedimentoIds": ["ID_DO_PROCEDIMENTO"],
            "clientName": "NOME_DO_CLIENTE",
            "clientPhone": "TELEFONE_DO_CLIENTE"
          }
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: context,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              booking: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  time: { type: Type.STRING },
                  profissionalId: { type: Type.STRING },
                  procedimentoIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  clientName: { type: Type.STRING },
                  clientPhone: { type: Type.STRING }
                },
                required: ["date", "time", "profissionalId", "procedimentoIds", "clientName", "clientPhone"]
              }
            },
            required: ["reply"]
          }
        }
      });

      let parsedResponse: { reply: string; booking: any } = { 
        reply: "Desculpe, tive um probleminha ao processar minha resposta. Pode repetir?", 
        booking: null 
      };

      try {
        const textToParse = result.text || '';
        parsedResponse = JSON.parse(textToParse);
      } catch (parseError) {
        console.error("Erro ao ler resposta JSON do Gemini:", parseError);
        let cleanText = (result.text || '').trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        try {
          parsedResponse = JSON.parse(cleanText.trim());
        } catch (e) {
          parsedResponse = {
            reply: result.text || "Desculpe, tive um contratempo. Vamos tentar novamente?",
            booking: null
          };
        }
      }

      let responseText = parsedResponse.reply;

      // STAGE 1: Strict Validation to verify if AI booked without actual name/phone info.
      // If we are simulating "novo_coleta", check if details are fake or unsupplied.
      if (parsedResponse.booking && selectedSimulatedClientId === 'novo_coleta') {
        const { clientName, clientPhone } = parsedResponse.booking;
        const lowerName = (clientName || '').toLowerCase();
        const lowerPhone = (clientPhone || '').toLowerCase();

        const nameIsPlaceholder = !clientName || 
          ['cliente', 'novo', 'paciente', 'cadastrado', 'pergunte', 'selecionado', 'informado', 'maria', 'joão', 'fulano', 'sicrano', 'visitante'].some(p => lowerName.includes(p)) ||
          clientName.trim().length < 3;

        const phoneIsPlaceholder = !clientPhone || 
          ['telefone', 'informado', 'sem', '00000', '12345', 'não', 'null', 'undefined'].some(p => lowerPhone.includes(p)) ||
          clientPhone.replace(/\D/g, '').length < 8;

        if (nameIsPlaceholder || phoneIsPlaceholder) {
          console.log("Validação: IA tentou agendar sem os detalhes reais do paciente. Cancelando agendamento direto.");
          // We override the AI reply to strictly request details.
          responseText = "Com todo prazer! Mas para que eu possa concluir sua reserva de horário com segurança, você poderia me informar o seu **Nome Completo** e um **Telefone com DDD** por aqui? Assim já realizo o seu cadastro no sistema da BellaEstética! ✨🌸";
          parsedResponse.booking = null;
        }
      }

      const aiMsg: Message = {
        id: Date.now(),
        type: 'system',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAI: true
      };

      setMessages(prev => [...prev, aiMsg]);

      // Handle actual Firestore database insert if booking is confirmed
      if (parsedResponse.booking) {
        const { date, time, profissionalId, procedimentoIds, clientName, clientPhone } = parsedResponse.booking;
        
        let targetClientId = selectedSimulatedClientId;

        // If it's a new simulated client, let's create it in database or fetch existing matching client
        if (selectedSimulatedClientId === 'novo_coleta') {
          const rawPhone = clientPhone.replace(/\D/g, '');
          const existingClient = clientes.find(c => c.telefone.replace(/\D/g, '') === rawPhone);

          if (existingClient) {
            targetClientId = existingClient.id;
          } else {
            console.log("Criando novo cliente no banco:", clientName, clientPhone);
            const newClientRef = await addDoc(collection(db, 'clientes'), {
              tenantId: currentTenantId!,
              nome: clientName,
              telefone: clientPhone,
              cpf: '',
              email: '',
              createdAt: serverTimestamp()
            });
            targetClientId = newClientRef.id;

            // Save variables locally to maintain continuity
            setCustomClientName(clientName);
            setCustomClientPhone(clientPhone);
          }
        }

        // Add Agendamento directly to Firestore
        const [year, month, day] = date.split('-').map((n: string) => parseInt(n));
        const [hours, minutes] = time.split(':').map((n: string) => parseInt(n));
        const appointmentDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

        console.log("Criando agendamento real no banco de dados para data:", appointmentDate);
        await addDoc(collection(db, 'agendamentos'), {
          tenantId: currentTenantId!,
          clienteId: targetClientId,
          profissionalId,
          procedimentoIds,
          data: Timestamp.fromDate(appointmentDate),
          status: 'confirmado',
          notas: 'Consulta agendada de forma automática pela Assistente de IA Bella'
        });

        // NOTIFICATION FOR THE DOCTOR / SPECIALIST
        const doctor = profissionais.find(p => p.id === profissionalId);
        const doctorName = doctor ? doctor.nome : 'Dra. Especialista';
        const doctorPhone = doctor ? doctor.telefone || '(vazio)' : '(não informado)';
        const selectedProcs = procedimentos.filter(p => procedimentoIds.includes(p.id));
        const procsLabel = selectedProcs.map(p => p.nome).join(', ');

        const doctorNotifMessage = `Dra. *${doctorName}*! 💅\n\n` +
          `*Novo agendamento confirmado para você pelo WhatsApp:* \n` +
          `📅 Data: *${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}*\n` +
          `⏰ Horário: *${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} h*\n` +
          `👤 Paciente: *${clientName}* (${clientPhone})\n` +
          `✨ Serviços: *${procsLabel}*\n` +
          `💬 Nota: Agendamento e confirmação imediatos gerados por Assistente de IA Bella.`;

        // Update Dr. notifications list so user can see it instantly
        setNotificacoesDoutoras(prev => [
          {
            id: Date.now(),
            doctorName,
            doctorPhone,
            clientName,
            clientPhone,
            date,
            time,
            service: procsLabel,
            text: doctorNotifMessage,
            sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ]);

        // Add a nice system notification in chat that booking was created AND doctor notified!
        setMessages(prev => [
          ...prev, 
          {
            id: Date.now() + 1,
            type: 'system',
            text: `📢 [SISTEMA]: Agendamento registrado com sucesso no banco de dados! Dia ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')} às ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: Date.now() + 2,
            type: 'system',
            text: `📬 [SISTEMA - WHATSAPP]: Notificação enviada com sucesso no celular da ${doctorName} (${doctorPhone}) sobre este compromisso!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

    } catch (error) {
      console.error("Erro AI:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteAppointment = async (appId: string) => {
    if (confirm('Deseja realmente remover este agendamento?')) {
      try {
        await deleteDoc(doc(db, 'agendamentos', appId));
        // Add a local notification that booking was deleted
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'system',
            text: `📢 [SISTEMA]: Agendamento excluído do banco de dados com sucesso.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'agendamentos');
      }
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    
    const newMsg: Message = {
      id: Date.now(),
      type: 'client',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    const currentInput = inputValue;
    setInputValue('');

    generateAIResponse(currentInput, updatedMessages);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Coluna de Explicação */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-primary-gold">
            <Sparkles size={24} />
            <h3 className="text-xl font-serif font-bold">IA de Agendamento</h3>
          </div>
          <p className="text-sm text-primary-dark/60 leading-relaxed">
            Este módulo utiliza a IA do Gemini para simular conversas reais no WhatsApp com sincronização total do Firestore.
          </p>
          <ul className="mt-4 space-y-3">
            {[
              'Verifica disponibilidade em tempo real',
              'Sugere horários com base na especialidade',
              'Confirma agendamentos e grava no banco',
              'Responde dúvidas sobre procedimentos'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-primary-dark/80">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-gold flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Seletor do Simulador de Cliente */}
        <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-primary-gold">
            <User size={20} />
            <h3 className="text-base font-serif font-bold">Simular Qual Paciente?</h3>
          </div>
          <p className="text-xs text-primary-dark/60">
            Escolha um paciente cadastrado para simular a conversa ou selecione "Novo Paciente" para deixar a IA capturar o cadastro.
          </p>

          <div>
            <label className="block text-[10px] font-bold text-primary-dark/60 uppercase tracking-wider mb-1">Paciente Simulado</label>
            <select
              value={selectedSimulatedClientId}
              onChange={(e) => setSelectedSimulatedClientId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-gold"
            >
              <option value="novo_coleta">👤 Simular Novo Paciente (Coleta de Dados por IA)</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  👥 {c.nome} ({c.telefone})
                </option>
              ))}
            </select>
          </div>

          {selectedSimulatedClientId === 'novo_coleta' ? (
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs space-y-1 text-amber-800">
              <p className="font-semibold">Modo Coleta Ativo ✨</p>
              <p className="opacity-85 leading-relaxed">
                Neste modo, a IA Bella agirá sem dados prévios. Ela vai solicitar o <b>Nome Completo</b> e o <b>Telefone</b> do paciente durante a conversa. Assim que confirmado, o paciente será cadastrado no banco automaticamente e o agendamento criado!
              </p>
            </div>
          ) : (
            <div className="bg-primary-gold/5 border border-primary-gold/15 p-3 rounded-lg text-xs space-y-2">
              <p className="font-semibold text-primary-gold">Paciente Cadastrado Ativo ✔️</p>
              <div className="space-y-1 text-primary-dark/80">
                <p><b>Nome:</b> {clientes.find(c => c.id === selectedSimulatedClientId)?.nome}</p>
                <p><b>Telefone:</b> {clientes.find(c => c.id === selectedSimulatedClientId)?.telefone}</p>
              </div>
              
              <div className="border-t border-primary-gold/10 pt-2 mt-2 font-sans">
                <p className="font-semibold text-[10px] uppercase tracking-wider text-primary-dark/60 mb-1">
                  Agenda deste Paciente:
                </p>
                {agendamentos.filter(a => a.clienteId === selectedSimulatedClientId).length > 0 ? (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {agendamentos
                      .filter(a => a.clienteId === selectedSimulatedClientId)
                      .map((a, i) => {
                        const date = a.data ? (a.data.toDate ? a.data.toDate() : new Date(a.data)) : null;
                        const dateString = date ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sem data';
                        const prof = profissionais.find(p => p.id === a.profissionalId)?.nome || 'Especialista';
                        return (
                          <div key={a.id || i} className="bg-white p-1.5 rounded border border-primary-gold/10 text-[10px] flex justify-between items-center gap-2">
                            <span className="truncate">📅 {dateString} ({prof})</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="bg-green-100 text-green-800 px-1 rounded uppercase font-bold text-[8px]">
                                {a.status}
                              </span>
                              <button
                                onClick={() => handleDeleteAppointment(a.id)}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition-colors"
                                title="Excluir Agendamento"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-[10px] text-primary-dark/40 italic">Nenhum agendamento ativo.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notificações das Doutoras */}
        <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-primary-gold">
            <div className="flex items-center gap-2">
              <Smartphone size={20} />
              <h3 className="text-base font-serif font-bold text-primary-dark">Notificações p/ Médicas</h3>
            </div>
            {notificacoesDoutoras.length > 0 && (
              <button
                onClick={() => setNotificacoesDoutoras([])}
                className="text-[10px] text-red-500 hover:underline font-bold transition-all"
              >
                Limpar
              </button>
            )}
          </div>
          <p className="text-xs text-primary-dark/60">
            Mensagens enviadas automaticamente para o WhatsApp das especialistas assim que o agendamento é confirmado:
          </p>
          {notificacoesDoutoras.length > 0 ? (
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {notificacoesDoutoras.map((notif) => (
                <div key={notif.id} className="bg-green-50/60 border border-green-100 p-3 rounded-xl text-xs space-y-1.5 relative shadow-sm">
                  <div className="flex justify-between items-center text-[10px] text-green-800 font-bold uppercase tracking-wider">
                    <span>📱 WhatsApp Enviado</span>
                    <span className="font-normal text-[9px] text-gray-400">{notif.sentAt}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed font-sans whitespace-pre-line bg-white/75 p-2 rounded-lg border border-green-50 shadow-inner">
                    {notif.text}
                  </p>
                  <div className="text-[10px] text-primary-dark/60 flex flex-wrap gap-x-2">
                    <span>👩‍⚕️ <b>Especialista:</b> {notif.doctorName} ({notif.doctorPhone})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-dashed border-gray-100">
              <p className="text-[11px] text-gray-400 italic">Nenhuma mensagem disparada ainda.</p>
            </div>
          )}
        </div>

        <div className="bg-primary-dark text-white p-6 rounded-2xl shadow-xl shadow-primary-dark/20">
          <h4 className="font-serif text-lg mb-2">Prompt de IA Ativo</h4>
          <code className="text-[10px] opacity-70 block bg-white/10 p-3 rounded-lg">
            "Você é a Bella, assistente de uma clínica de estética de luxo. 
            Seja cordial e use emojis discretos. Consulte sempre a agenda antes de confirmar..."
          </code>
        </div>
      </div>

      {/* Simulador de Chat */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-primary-dark/5 shadow-2xl overflow-hidden max-h-[600px]">
        {/* Topo do Chat */}
        <div className="bg-[#075e54] text-white p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User size={24} />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {selectedSimulatedClientId === 'novo_coleta' 
                ? (customClientName || 'Paciente Novo') 
                : (clientes.find(c => c.id === selectedSimulatedClientId)?.nome || 'Paciente Selecionado')}
            </p>
            <p className="text-[10px] opacity-70">
              {selectedSimulatedClientId === 'novo_coleta' 
                ? (customClientPhone || 'Online') 
                : (clientes.find(c => c.id === selectedSimulatedClientId)?.telefone || 'Online')}
            </p>
          </div>
        </div>

        {/* Corpo do Chat */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]" 
          style={{ backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-bg.png")', backgroundSize: 'contain' }}
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "max-w-[80%] p-3 rounded-xl text-sm shadow-sm relative",
                msg.type === 'client' 
                  ? "bg-white ml-auto rounded-tr-none" 
                  : "bg-[#dcf8c6] mr-auto rounded-tl-none"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] opacity-40">{msg.time}</span>
                {msg.type === 'client' && <CheckCheck size={12} className="text-blue-400" />}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="bg-[#dcf8c6] mr-auto rounded-xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary-dark/40" />
              <span className="text-[10px] text-primary-dark/40 uppercase font-bold tracking-widest">Bella digitando...</span>
            </div>
          )}
        </div>

        {/* Rodapé Input */}
        <div className="p-4 bg-gray-50 flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Digite uma mensagem como o cliente..."
            className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="w-10 h-10 bg-[#075e54] text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
