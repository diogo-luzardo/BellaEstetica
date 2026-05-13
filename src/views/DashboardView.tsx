/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Package
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { seedMockData } from '../lib/mockData';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardView() {
  const { currentTenantId, userProfile } = useAuth();
  const stats = [
    { label: 'Total Clientes', value: '124', icon: Users, color: 'text-blue-500' },
    { label: 'Agendamentos Hoje', value: '8', icon: Calendar, color: 'text-primary-gold' },
    { label: 'Receita Mensal', value: 'R$ 12.450', icon: DollarSign, color: 'text-green-500' },
    { label: 'Produtos em Baixa', value: '3', icon: Package, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Dev Tools / Seed Header */}
      {(userProfile?.role === 'admin' || userProfile?.role === 'gerencia') && (
        <div className="flex items-center justify-between bg-primary-gold/5 p-4 rounded-3xl border border-primary-gold/10">
          <div>
            <h4 className="text-sm font-bold text-primary-gold uppercase tracking-widest">Modo de Teste</h4>
            <p className="text-[10px] text-primary-dark/60">Clique ao lado para preencher a clínica com dados modelo.</p>
          </div>
          <button 
            onClick={() => seedMockData(currentTenantId || '')}
            className="bg-primary-gold text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-gold/20"
          >
            Gerar Dados Iniciais
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm flex flex-col gap-4 cursor-pointer"
          >
            <div className={cn("p-2 rounded-xl w-fit bg-primary-cream", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-primary-dark/40 uppercase tracking-wider font-semibold">{stat.label}</p>
              <h3 className="text-3xl font-serif font-bold mt-1 text-primary-dark premium-shadow">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-primary-dark/5 shadow-sm">
          <h3 className="text-xl font-serif mb-6 flex items-center justify-between">
            Próximos Atendimentos
            <button className="text-sm text-primary-gold font-sans font-medium hover:underline">Ver Agenda</button>
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-primary-dark/5 hover:bg-primary-cream/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-primary-gold text-lg font-bold">
                    {['M', 'J', 'R'][i]}
                  </div>
                  <div>
                    <p className="font-medium text-primary-dark">{['Maria Oliveira', 'Julia Costa', 'Ricardo Alves'][i]}</p>
                    <p className="text-sm text-primary-dark/40">{['Limpeza de Pele', 'Drenagem Lymph', 'Massagem'][i]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-serif">14:{i*2}0</p>
                  <p className="text-xs text-primary-dark/40">Dra. Ana Silva</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-primary-dark/5 shadow-sm">
          <h3 className="text-xl font-serif mb-6 text-primary-dark">Desempenho da Clínica</h3>
          <div className="h-48 md:h-64 flex items-end gap-2 px-4">
            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-primary-gold/10 rounded-t-lg group-hover:bg-primary-gold/30 transition-all flex items-end justify-center" 
                  style={{ height: `${h}%` }}
                >
                  <div className="w-full bg-primary-gold opacity-0 group-hover:opacity-100 transition-opacity" style={{ height: '30%' }} />
                </div>
                <span className="text-[10px] text-primary-dark/40 uppercase">Sem {i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
