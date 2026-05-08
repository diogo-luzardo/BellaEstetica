/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Scissors,
  DollarSign,
  X,
  Clock
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Procedimento, Custo, Produto } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';

export default function ManagementView() {
  const [tab, setTab] = useState<'procedimentos' | 'estoque' | 'custos'>('procedimentos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [procForm, setProcForm] = useState({
    nome: '',
    preco: '',
    custo: '',
    duracao: '',
    categoria: ''
  });
  const [custoForm, setCustoForm] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoria: ''
  });
  const [prodForm, setProdForm] = useState({
    nome: '',
    quantidade: '',
    valorUnitario: '',
    categoria: '',
    alertaMinimo: ''
  });

  useEffect(() => {
    setLoading(true);
    const unsubProc = onSnapshot(query(collection(db, 'procedimentos'), orderBy('nome')), (shot) => {
      setProcedimentos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Procedimento)));
      setLoading(false);
    });
    const unsubCusto = onSnapshot(query(collection(db, 'custos'), orderBy('data', 'desc')), (shot) => {
      setCustos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Custo)));
    });
    const unsubProd = onSnapshot(query(collection(db, 'produtos'), orderBy('nome')), (shot) => {
      setProdutos(shot.docs.map(d => ({ id: d.id, ...d.data() } as Produto)));
    });
    return () => { unsubProc(); unsubCusto(); unsubProd(); };
  }, []);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      if (tab === 'procedimentos') {
        const p = item as Procedimento;
        setProcForm({
          nome: p.nome,
          preco: p.preco.toString(),
          custo: p.custo.toString(),
          duracao: p.duracao.toString(),
          categoria: p.categoria
        });
      } else if (tab === 'custos') {
        const c = item as Custo;
        setCustoForm({
          descricao: c.descricao,
          valor: c.valor.toString(),
          data: c.data,
          categoria: c.categoria
        });
      } else if (tab === 'estoque') {
        const pr = item as Produto;
        setProdForm({
          nome: pr.nome,
          quantidade: pr.quantidade.toString(),
          valorUnitario: pr.valorUnitario.toString(),
          categoria: pr.categoria,
          alertaMinimo: pr.alertaMinimo.toString()
        });
      }
    } else {
      setEditingId(null);
      setProcForm({ nome: '', preco: '', custo: '', duracao: '', categoria: '' });
      setCustoForm({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], categoria: '' });
      setProdForm({ nome: '', quantidade: '', valorUnitario: '', categoria: '', alertaMinimo: '5' });
    }
    setShowModal(true);
  };

  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...prodForm,
        quantidade: parseInt(prodForm.quantidade),
        valorUnitario: parseFloat(prodForm.valorUnitario),
        alertaMinimo: parseInt(prodForm.alertaMinimo)
      };

      if (editingId) {
        await updateDoc(doc(db, 'produtos', editingId), data);
      } else {
        await addDoc(collection(db, 'produtos'), data);
      }
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'produtos');
    }
  };

  const handleSaveProc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...procForm,
        preco: parseFloat(procForm.preco),
        custo: parseFloat(procForm.custo),
        duracao: parseInt(procForm.duracao)
      };

      if (editingId) {
        await updateDoc(doc(db, 'procedimentos', editingId), data);
      } else {
        await addDoc(collection(db, 'procedimentos'), data);
      }
      setShowModal(false);
      setEditingId(null);
      setProcForm({ nome: '', preco: '', custo: '', duracao: '', categoria: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'procedimentos');
    }
  };

  const handleSaveCusto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...custoForm,
        valor: parseFloat(custoForm.valor)
      };

      if (editingId) {
        await updateDoc(doc(db, 'custos', editingId), data);
      } else {
        await addDoc(collection(db, 'custos'), data);
      }
      setShowModal(false);
      setEditingId(null);
      setCustoForm({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], categoria: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'custos');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir "${name}"?`)) {
      try {
        await deleteDoc(doc(db, tab === 'procedimentos' ? 'procedimentos' : tab === 'estoque' ? 'produtos' : 'custos', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, tab);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Tabs */}
      <div className="border-b border-primary-dark/5 flex items-center justify-between">
        <div className="flex gap-8">
          {[
            { id: 'procedimentos', label: 'Procedimentos', icon: Scissors },
            { id: 'estoque', label: 'Produtos/Estoque', icon: Package },
            { id: 'custos', label: 'Custos/Despesas', icon: DollarSign },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`pb-4 text-sm font-medium transition-all flex items-center gap-2 ${
                tab === item.id 
                  ? 'border-b-2 border-primary-gold text-primary-gold' 
                  : 'text-primary-dark/40 hover:text-primary-dark'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary-gold text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mb-2 hover:bg-primary-gold/90 transition-colors"
        >
          <Plus size={16} />
          Novo {tab === 'procedimentos' ? 'Procedimento' : tab === 'estoque' ? 'Produto' : 'Custo'}
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/30" size={16} />
          <input 
            type="text" 
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-primary-dark/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-gold/20"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-primary-dark/10 rounded-xl text-sm flex items-center gap-2 text-primary-dark/60">
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico conforme a Tab */}
      <div className="bg-white rounded-2xl border border-primary-dark/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-primary-cream/30 text-xs uppercase tracking-widest text-primary-dark/40">
              <th className="px-6 py-4 font-semibold">Descrição</th>
              <th className="px-6 py-4 font-semibold">Categoria</th>
              <th className="px-6 py-4 font-semibold">Custo/Investimento</th>
              <th className="px-6 py-4 font-semibold">Preço de Venda</th>
              <th className="px-6 py-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-dark/5">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">Carregando...</td></tr>
            ) : tab === 'procedimentos' ? (
              procedimentos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-medium">
                    {item.nome}
                    <div className="text-[10px] text-primary-dark/40 flex items-center gap-1">
                      <Clock size={10} /> {item.duracao} min
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-dark/60">{item.categoria}</td>
                  <td className="px-6 py-4 text-sm text-red-500">{formatCurrency(item.custo)}</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(item.preco)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-primary-gold transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.nome); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : tab === 'estoque' ? (
              produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-medium">
                    {item.nome}
                    {item.quantidade <= item.alertaMinimo && (
                      <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                        <AlertTriangle size={10} /> Estoque Baixo
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-dark/60">{item.categoria}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${item.quantidade <= item.alertaMinimo ? 'text-red-500' : 'text-primary-gold'}`}>
                    {item.quantidade} un
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-dark/60">{formatCurrency(item.valorUnitario)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-primary-gold transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.nome); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : tab === 'custos' ? (
              custos.filter(c => c.descricao.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-medium">{item.descricao}</td>
                  <td className="px-6 py-4 text-sm text-primary-dark/60">{item.categoria}</td>
                  <td className="px-6 py-4 text-sm text-red-500">{formatCurrency(item.valor)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <span className="text-xs text-primary-dark/40">{item.data}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                          className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-primary-gold transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.descricao); }}
                          className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">Módulo de estoque em desenvolvimento...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif text-primary-dark font-bold">
                {editingId ? 'Editar' : 'Novo'} {tab === 'procedimentos' ? 'Procedimento' : tab === 'estoque' ? 'Produto' : 'Custo'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {tab === 'procedimentos' ? (
              <form onSubmit={handleSaveProc} className="space-y-4">
                {/* ... existing fields ... */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Nome do Serviço</label>
                  <input 
                    required
                    type="text" 
                    value={procForm.nome}
                    onChange={(e) => setProcForm({...procForm, nome: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    placeholder="Ex: Botox 50 unidades"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Preço de Venda</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={procForm.preco}
                      onChange={(e) => setProcForm({...procForm, preco: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Custo de Material</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={procForm.custo}
                      onChange={(e) => setProcForm({...procForm, custo: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Duração (minutos)</label>
                    <input 
                      required
                      type="number" 
                      value={procForm.duracao}
                      onChange={(e) => setProcForm({...procForm, duracao: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Categoria</label>
                    <input 
                      required
                      type="text" 
                      value={procForm.categoria}
                      onChange={(e) => setProcForm({...procForm, categoria: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                >
                  {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </form>
            ) : tab === 'estoque' ? (
              <form onSubmit={handleSaveProd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Nome do Produto</label>
                  <input 
                    required
                    type="text" 
                    value={prodForm.nome}
                    onChange={(e) => setProdForm({...prodForm, nome: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Qtd. Atual</label>
                    <input 
                      required
                      type="number" 
                      value={prodForm.quantidade}
                      onChange={(e) => setProdForm({...prodForm, quantidade: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Alerta Mínimo</label>
                    <input 
                      required
                      type="number" 
                      value={prodForm.alertaMinimo}
                      onChange={(e) => setProdForm({...prodForm, alertaMinimo: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Valor Unitário</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={prodForm.valorUnitario}
                      onChange={(e) => setProdForm({...prodForm, valorUnitario: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Categoria</label>
                    <input 
                      required
                      type="text" 
                      value={prodForm.categoria}
                      onChange={(e) => setProdForm({...prodForm, categoria: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveCusto} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Descrição da Despesa</label>
                  <input 
                    required
                    type="text" 
                    value={custoForm.descricao}
                    onChange={(e) => setCustoForm({...custoForm, descricao: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Valor</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={custoForm.valor}
                      onChange={(e) => setCustoForm({...custoForm, valor: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Data</label>
                    <input 
                      required
                      type="date" 
                      value={custoForm.data}
                      onChange={(e) => setCustoForm({...custoForm, data: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Categoria</label>
                  <input 
                    required
                    type="text" 
                    value={custoForm.categoria}
                    onChange={(e) => setCustoForm({...custoForm, categoria: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                >
                  {editingId ? 'Salvar Alterações' : 'Salvar Despesa'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
