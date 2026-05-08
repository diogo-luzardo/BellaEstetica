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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Profissional, Procedimento } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: number;
  type: 'client' | 'system';
  text: string;
  time: string;
  isAI?: boolean;
}

export default function WhatsAppView() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'system', text: 'Olá! Sou a Bella, sua assistente da BellaEstética. Como posso ajudar com sua beleza hoje? 🏠✨', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const unsubProf = onSnapshot(collection(db, 'profissionais'), (shot) => {
      setProfissionais(shot.docs.map(d => ({ id: d.id, ...d.data() } as Profissional)));
    });
    const unsubProc = onSnapshot(collection(db, 'procedimentos'), (shot) => {
      setProcedimentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Procedimento)));
    });
    return () => { unsubProf(); unsubProc(); };
  }, []);

  const generateAIResponse = async (userText: string) => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const context = `
        Você é a Bella, assistente virtual de luxo da clínica BellaEstética.
        Seja extremamente cordial, use alguns emojis e foque em agendamentos.
        
        Sua clínica possui os seguintes PROFISSIONAIS:
        ${profissionais.map(p => `- ${p.nome} (${p.especialidade})`).join('\n')}
        
        E os seguintes PROCEDIMENTOS:
        ${procedimentos.map(p => `- ${p.nome}: R$ ${p.preco} (Duração: ${p.duracao}min)`).join('\n')}
        
        REGRAS:
        1. Se o cliente demonstrar interesse em algo, explique brevemente e ofereça um especialista.
        2. Se ele quiser agendar, peça para informar a data e o especialista.
        3. Se ele confirmar um agendamento, responda com uma frase que contenha obrigatoriamente a palavra "CONFIRMADO" seguida dos detalhes (Data, Serviço, Profissional).
        
        Histórico da conversa:
        ${messages.map(m => `${m.type === 'client' ? 'Cliente' : 'Bella'}: ${m.text}`).join('\n')}
        Cliente agora disse: ${userText}
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: context
      });

      const responseText = result.text || "Desculpe, tive um probleminha. Pode repetir?";
      
      const aiMsg: Message = {
        id: Date.now(),
        type: 'system',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAI: true
      };

      setMessages(prev => [...prev, aiMsg]);

      // Detect "CONFIRMADO" to simulate backend booking
      if (responseText.toUpperCase().includes('CONFIRMADO')) {
        // Here we could extract data and save to Firestore, but for simulation let's just log it
        console.log('Agendamento detectado pela IA!');
      }

    } catch (error) {
      console.error("Erro AI:", error);
    } finally {
      setIsTyping(false);
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
    
    setMessages(prev => [...prev, newMsg]);
    const currentInput = inputValue;
    setInputValue('');

    generateAIResponse(currentInput);
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
            Este módulo utiliza a IA do Gemini para simular conversas reais no WhatsApp.
          </p>
          <ul className="mt-4 space-y-3">
            {[
              'Verifica disponibilidade em tempo real',
              'Sugere horários com base na especialidade',
              'Confirma agendamentos automaticamente',
              'Responde dúvidas sobre procedimentos'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-primary-dark/80">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-gold flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
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
            <p className="font-semibold text-sm">Cliente Teste</p>
            <p className="text-[10px] opacity-70">Online</p>
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
