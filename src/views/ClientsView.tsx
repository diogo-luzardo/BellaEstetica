/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  Plus,
  Mail,
  Phone,
  Cake,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Cliente } from '../types';

export default function ClientsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    dataNascimento: ''
  });

  const [cpfError, setCpfError] = useState('');

  const formatCPF = (value: string) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[];
      setClientes(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clientes');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (cliente?: Cliente) => {
    setCpfError('');
    if (cliente) {
      setEditingId(cliente.id);
      setFormData({
        nome: cliente.nome,
        cpf: cliente.cpf || '',
        telefone: cliente.telefone,
        email: cliente.email || '',
        dataNascimento: cliente.dataNascimento || ''
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', cpf: '', telefone: '', email: '', dataNascimento: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.telefone || !formData.cpf) return;
    setCpfError('');

    try {
      const cleanCpf = formData.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        setCpfError('CPF deve conter 11 dígitos');
        return;
      }

      // Verificar CPF único
      const cpfQuery = query(collection(db, 'clientes'), where('cpf', '==', cleanCpf));
      const cpfSnap = await getDocs(cpfQuery);
      
      const isDuplicate = cpfSnap.docs.some(doc => doc.id !== editingId);
      if (isDuplicate) {
        setCpfError('Este CPF já está cadastrado para outro cliente');
        return;
      }

      // Limpar campos vazios para não enviar strings vazias ao Firestore
      const cleanData: any = {
        nome: formData.nome.trim(),
        cpf: cleanCpf,
        telefone: formData.telefone.trim()
      };

      if (formData.email.trim()) cleanData.email = formData.email.trim();
      if (formData.dataNascimento) cleanData.dataNascimento = formData.dataNascimento;

      if (editingId) {
        cleanData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'clientes', editingId), cleanData);
      } else {
        cleanData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'clientes'), cleanData);
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({ nome: '', cpf: '', telefone: '', email: '', dataNascimento: '' });
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'clientes');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Buscar agendamentos deste cliente
      const q = query(collection(db, 'agendamentos'), where('clienteId', '==', showDeleteModal.id));
      const agendamentosSnap = await getDocs(q);
      
      // 2. Adicionar exclusões de agendamentos ao batch
      agendamentosSnap.forEach((appointmentDoc) => {
        batch.delete(doc(db, 'agendamentos', appointmentDoc.id));
      });
      
      // 3. Adicionar exclusão do cliente ao batch
      batch.delete(doc(db, 'clientes', showDeleteModal.id));
      
      // 4. Executar batch
      await batch.commit();
      
      setShowDeleteModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clientes');
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.telefone.includes(searchTerm) ||
    c.cpf?.includes(searchTerm.replace(/\D/g, ''))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/30" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-primary-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20 focus:border-primary-gold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary-dark text-white px-6 py-2 rounded-xl border border-primary-dark hover:bg-white hover:text-primary-dark transition-all flex items-center gap-2 font-medium"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-primary-dark/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-primary-cream/50 text-xs uppercase tracking-widest text-primary-dark/40">
                <th className="px-6 py-4 font-semibold text-primary-dark">Cliente</th>
                <th className="px-6 py-4 font-semibold text-primary-dark">Contato</th>
                <th className="px-6 py-4 font-semibold text-primary-dark">Nascimento</th>
                <th className="px-6 py-4 font-semibold text-right text-primary-dark">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-dark/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-primary-dark/40 italic">Carregando clientes...</td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-primary-dark/40 italic">Nenhum cliente encontrado.</td>
                </tr>
              ) : filteredClientes.map((cliente) => (
                <tr key={cliente.id} className="group hover:bg-primary-cream/10 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-primary-dark">
                      <div className="w-10 h-10 rounded-full bg-primary-gold/10 text-primary-gold flex items-center justify-center font-bold">
                        {cliente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-primary-dark">{cliente.nome}</p>
                        {cliente.cpf && (
                          <p className="text-[10px] text-primary-dark/40 font-mono">CPF: {formatCPF(cliente.cpf)}</p>
                        )}
                        <p className="text-[10px] text-primary-dark/40 italic">
                          Cadastrado em {cliente.createdAt?.toDate ? cliente.createdAt.toDate().toLocaleDateString('pt-BR') : '...'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-primary-dark flex items-center gap-2"><Phone size={12} className="opacity-40" /> {cliente.telefone}</p>
                    {cliente.email && (
                      <p className="text-xs text-primary-dark/40 flex items-center gap-2"><Mail size={12} className="opacity-40" /> {cliente.email}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-dark/60">
                    <div className="flex items-center gap-2">
                      <Cake size={14} className="opacity-40" /> {cliente.dataNascimento || 'Não informado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(cliente); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-primary-gold transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowDeleteModal({ id: cliente.id, name: cliente.nome }); }}
                        className="p-1.5 bg-primary-cream rounded-lg text-primary-dark/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.form 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSave}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif text-primary-dark font-bold">
                {editingId ? 'Editar Cliente' : 'Novo Cadastro'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20" 
                    placeholder="Ex: Ana Maria Silva" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">CPF (Garante cadastro único)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                    className={`w-full px-4 py-2 bg-primary-cream/30 border ${cpfError ? 'border-red-500' : 'border-primary-dark/5'} rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-gold/20`}
                    placeholder="000.000.000-00" 
                  />
                  {cpfError && <p className="text-[10px] text-red-500 font-medium">{cpfError}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Telefone</label>
                  <input 
                    required
                    type="text" 
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl transition-all" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary-dark/40 uppercase tracking-widest">E-mail</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-primary-cream/30 border border-primary-dark/5 rounded-xl" 
                  placeholder="exemplo@email.com" 
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
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
                Salvar Cliente
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Modal de Exclusão */}
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
                <h4 className="text-xl font-serif font-bold text-primary-dark">Excluir Cliente?</h4>
                <p className="text-sm text-primary-dark/40 mt-1">Deseja realmente excluir <strong>{showDeleteModal.name}</strong>? Esta ação não pode ser desfeita.</p>
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
                  Sim, excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

