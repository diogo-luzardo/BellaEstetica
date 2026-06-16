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
  Clock,
  Headset
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
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Procedimento, Custo, Produto, Atendente } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ManagementView() {
  const { currentTenantId, userProfile } = useAuth();
  const [tab, setTab] = useState<'procedimentos' | 'estoque' | 'custos' | 'atendentes'>('procedimentos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
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
  const [atendenteForm, setAtendenteForm] = useState({
    nome: '',
    telefone: '',
    percentualComissao: '5'
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (!currentTenantId) return;
    setLoading(true);

    const unsubProc = onSnapshot(
      query(collection(db, 'procedimentos'), where('tenantId', '==', currentTenantId)), 
      (shot) => {
        const data = shot.docs.map(d => ({ id: d.id, ...d.data() } as Procedimento));
        setProcedimentos(data.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'procedimentos')
    );
    const unsubCusto = onSnapshot(
      query(collection(db, 'custos'), where('tenantId', '==', currentTenantId)), 
      (shot) => {
        const data = shot.docs.map(d => ({ id: d.id, ...d.data() } as Custo));
        setCustos(data.sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'custos')
    );
    const unsubProd = onSnapshot(
      query(collection(db, 'produtos'), where('tenantId', '==', currentTenantId)), 
      (shot) => {
        const data = shot.docs.map(d => ({ id: d.id, ...d.data() } as Produto));
        setProdutos(data.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'produtos')
    );
    const unsubAtendentes = onSnapshot(
      query(collection(db, 'atendentes'), where('tenantId', '==', currentTenantId)), 
      (shot) => {
        const data = shot.docs.map(d => ({ id: d.id, ...d.data() } as Atendente));
        setAtendentes(data.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'atendentes')
    );
    return () => { unsubProc(); unsubCusto(); unsubProd(); unsubAtendentes(); };
  }, [currentTenantId]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      if (tab === 'procedimentos') {
        const p = item as Procedimento;
        setProcForm({
          nome: p.nome || '',
          preco: (p.preco ?? 0).toString(),
          custo: (p.custo ?? 0).toString(),
          duracao: (p.duracao ?? 0).toString(),
          categoria: p.categoria || ''
        });
      } else if (tab === 'custos') {
        const c = item as Custo;
        setCustoForm({
          descricao: c.descricao || '',
          valor: (c.valor ?? 0).toString(),
          data: c.data || new Date().toISOString().split('T')[0],
          categoria: c.categoria || ''
        });
      } else if (tab === 'estoque') {
        const pr = item as Produto;
        setProdForm({
          nome: pr.nome || '',
          quantidade: (pr.quantidade ?? 0).toString(),
          valorUnitario: (pr.valorUnitario ?? 0).toString(),
          categoria: pr.categoria || '',
          alertaMinimo: (pr.alertaMinimo ?? 0).toString()
        });
      } else if (tab === 'atendentes') {
        const at = item as Atendente;
        setAtendenteForm({
          nome: at.nome || '',
          telefone: at.telefone || '',
          percentualComissao: (at.percentualComissao ?? 5).toString()
        });
      }
    } else {
      setEditingId(null);
      setProcForm({ nome: '', preco: '', custo: '', duracao: '', categoria: '' });
      setCustoForm({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], categoria: '' });
      setProdForm({ nome: '', quantidade: '', valorUnitario: '', categoria: '', alertaMinimo: '5' });
      setAtendenteForm({ nome: '', telefone: '', percentualComissao: '5' });
    }
    setShowModal(true);
  };

  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...prodForm,
        tenantId: currentTenantId!,
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
        tenantId: currentTenantId!,
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
        tenantId: currentTenantId!,
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

  const handleSaveAtendente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...atendenteForm,
        tenantId: currentTenantId!,
        percentualComissao: parseFloat(atendenteForm.percentualComissao)
      };

      if (editingId) {
        await updateDoc(doc(db, 'atendentes', editingId), data);
      } else {
        await addDoc(collection(db, 'atendentes'), data);
      }
      setShowModal(false);
      setEditingId(null);
      setAtendenteForm({ nome: '', telefone: '', percentualComissao: '5' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'atendentes');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const coll = tab === 'procedimentos' ? 'procedimentos' : tab === 'estoque' ? 'produtos' : tab === 'atendentes' ? 'atendentes' : 'custos';
      await deleteDoc(doc(db, coll, deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, tab);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Tabs */}
      <div className="border-b border-primary-dark/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex gap-4 overflow-x-auto w-full no-scrollbar pb-2 xl:pb-0">
          {[
            { id: 'procedimentos', label: 'Procedimentos', icon: Scissors },
            { id: 'estoque', label: 'Produtos/Estoque', icon: Package },
            { id: 'custos', label: 'Custos/Despesas', icon: DollarSign },
            { id: 'atendentes', label: 'Atendentes', icon: Headset },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`pb-2 xl:pb-4 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
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
          className="bg-primary-gold text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mb-2 w-full xl:w-auto hover:bg-primary-gold/90 transition-colors"
        >
          <Plus size={16} />
          Novo {tab === 'procedimentos' ? 'Procedimento' : tab === 'estoque' ? 'Produto' : tab === 'atendentes' ? 'Atendente' : 'Custo'}
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
                {tab === 'procedimentos' ? (
                  <>
                    <th className="px-6 py-4 font-semibold">Descrição</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Custo de Material</th>
                    <th className="px-6 py-4 font-semibold">Preço de Venda</th>
                  </>
                ) : tab === 'estoque' ? (
                  <>
                    <th className="px-6 py-4 font-semibold">Nome do Produto</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Quantidade</th>
                    <th className="px-6 py-4 font-semibold">Valor Unitário</th>
                  </>
                ) : tab === 'atendentes' ? (
                  <>
                    <th className="px-6 py-4 font-semibold">Nome</th>
                    <th className="px-6 py-4 font-semibold">Telefone</th>
                    <th className="px-6 py-4 font-semibold">Comissão (%)</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-semibold">Descrição da Despesa</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Valor Pago</th>
                    <th className="px-6 py-4 font-semibold">Data de Lançamento</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-dark/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">Carregando...</td></tr>
              ) : tab === 'procedimentos' ? (
                procedimentos.filter(p => (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-medium">
                      {item.nome}
                      <div className="text-[10px] text-primary-dark/40 flex items-center gap-1">
                        <Clock size={10} /> {item.duracao} min
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-dark/60">{item.categoria}</td>
                    <td className="px-6 py-4 text-sm text-red-500">{formatCurrency(item.custo)}</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(item.preco)}</td>
                  </tr>
                ))
              ) : tab === 'estoque' ? (
                produtos.filter(p => (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
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
                  </tr>
                ))
              ) : tab === 'custos' ? (
                custos.filter(c => (c.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-medium">{item.descricao}</td>
                    <td className="px-6 py-4 text-sm text-primary-dark/60">{item.categoria}</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">{formatCurrency(item.valor)}</td>
                    <td className="px-6 py-4 text-sm text-primary-dark/60">{item.data}</td>
                  </tr>
                ))
              ) : tab === 'atendentes' ? (
                atendentes.filter(a => (a.nome || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-primary-cream/10 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-medium">{item.nome}</td>
                    <td className="px-6 py-4 text-sm text-primary-dark/60">{item.telefone}</td>
                    <td className="px-6 py-4 text-sm text-primary-gold font-medium">{item.percentualComissao}%</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">Módulo selecionado não implementado...</td></tr>
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
                {editingId ? 'Editar' : 'Novo'} {tab === 'procedimentos' ? 'Procedimento' : tab === 'estoque' ? 'Produto' : tab === 'atendentes' ? 'Atendente' : 'Custo'}
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
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                  >
                    {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => { setShowModal(false); handleDelete(editingId, procForm.nome); }}
                      className="py-4 px-6 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
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
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                  >
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => { setShowModal(false); handleDelete(editingId, prodForm.nome); }}
                      className="py-4 px-6 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </form>
            ) : tab === 'atendentes' ? (
              <form onSubmit={handleSaveAtendente} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Nome da Atendente</label>
                  <input 
                    required
                    type="text" 
                    value={atendenteForm.nome}
                    onChange={(e) => setAtendenteForm({...atendenteForm, nome: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Telefone</label>
                    <input 
                      required
                      type="text" 
                      value={atendenteForm.telefone}
                      onChange={(e) => setAtendenteForm({...atendenteForm, telefone: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Comissão (%)</label>
                    <input 
                      required
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      value={atendenteForm.percentualComissao}
                      onChange={(e) => setAtendenteForm({...atendenteForm, percentualComissao: e.target.value})}
                      className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                  >
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Atendente'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => { setShowModal(false); handleDelete(editingId, atendenteForm.nome); }}
                      className="py-4 px-6 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
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
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.02] transition-transform"
                  >
                    {editingId ? 'Salvar Alterações' : 'Salvar Despesa'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => { setShowModal(false); handleDelete(editingId, custoForm.descricao); }}
                      className="py-4 px-6 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary-dark">Excluir item?</h3>
                <p className="text-sm text-primary-dark/60">
                  Tem certeza que deseja excluir "{deleteConfirm.name}"? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-primary-cream text-primary-dark font-bold rounded-xl hover:bg-primary-cream/80 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
