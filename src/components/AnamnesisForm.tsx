import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Cliente, FichaAnamnese } from '../types';
import { X, Check, Save, FileText, AlertCircle, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnamnesisFormProps {
  clienteId: string;
  onClose: () => void;
}

export default function AnamnesisForm({ clienteId, onClose }: AnamnesisFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ficha, setFicha] = useState<FichaAnamnese | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const initialRespostas = {
    aspirina5Dias: false,
    hipertensao: false,
    tonturas: false,
    cardiopatia: false,
    menstruada: false,
    amamentando: false,
    colesterol: false,
    problemaRenal: false,
    marcaPasso: false,
    circulatorio: false,
    respiratorio: false,
    hepatite: false,
    depressao: false,
    micropigmentacao: false,
    alergia: false,
    alergiaQuais: '',
    herpes: false,
    hemofilia: false,
    cancer: false,
    hiv: false,
    gravida: false,
    asma: false,
    epilepsia: false,
    glaucoma: false,
    diabetes: false,
    lupus: false,
    psoriase: false,
    fumante: false,
  };

  const [formData, setFormData] = useState({
    respostas: { ...initialRespostas },
    outrasObservacoes: '',
    consentimento: false,
    autorizoImagem: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load Client info
        const clientSnap = await getDocs(query(collection(db, 'clientes'), where('__name__', '==', clienteId), limit(1)));
        if (!clientSnap.empty) setCliente({ id: clientSnap.docs[0].id, ...clientSnap.docs[0].data() } as Cliente);

        // Load existing Ficha
        const q = query(
          collection(db, 'fichasAnamnese'), 
          where('clienteId', '==', clienteId),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as FichaAnamnese;
          setFicha(data);
          setFormData({
            respostas: { ...initialRespostas, ...data.respostas },
            outrasObservacoes: data.outrasObservacoes || '',
            consentimento: data.consentimento || false,
            autorizoImagem: data.autorizoImagem || false,
          });
        }
      } catch (error) {
        console.error("Error loading anamnesis data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clienteId]);

  const handleToggle = (field: keyof typeof initialRespostas) => {
    if (field === 'alergiaQuais') return;
    setFormData(prev => ({
      ...prev,
      respostas: {
        ...prev.respostas,
        [field]: !prev.respostas[field as keyof typeof prev.respostas]
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.consentimento) {
      alert("É necessário aceitar os termos de consentimento.");
      return;
    }

    setSaving(true);
    try {
      if (ficha) {
        await updateDoc(doc(db, 'fichasAnamnese', ficha.id), {
          respostas: formData.respostas,
          outrasObservacoes: formData.outrasObservacoes,
          consentimento: formData.consentimento,
          autorizoImagem: formData.autorizoImagem,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'fichasAnamnese'), {
          clienteId,
          respostas: formData.respostas,
          outrasObservacoes: formData.outrasObservacoes,
          consentimento: formData.consentimento,
          autorizoImagem: formData.autorizoImagem,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, ficha ? OperationType.UPDATE : OperationType.CREATE, 'fichasAnamnese');
    } finally {
      setSaving(false);
    }
  };

  const questions = [
    { id: 'aspirina5Dias', label: 'Aspirina 05 Dias' },
    { id: 'hipertensao', label: 'Hipertensão' },
    { id: 'tonturas', label: 'Tonturas' },
    { id: 'cardiopatia', label: 'Cardiopatia' },
    { id: 'menstruada', label: 'Menstruada' },
    { id: 'amamentando', label: 'Amamentando' },
    { id: 'colesterol', label: 'Colesterol' },
    { id: 'problemaRenal', label: 'Problema Renal' },
    { id: 'marcaPasso', label: 'Marca Passo' },
    { id: 'circulatorio', label: 'Circulatório' },
    { id: 'respiratorio', label: 'Respiratório' },
    { id: 'hepatite', label: 'Hepatite' },
    { id: 'depressao', label: 'Depressão' },
    { id: 'micropigmentacao', label: 'Micropigmentação' },
    { id: 'herpes', label: 'Herpes' },
    { id: 'hemofilia', label: 'Hemofilia' },
    { id: 'cancer', label: 'Câncer' },
    { id: 'hiv', label: 'HIV' },
    { id: 'gravida', label: 'Grávida' },
    { id: 'asma', label: 'Asma' },
    { id: 'epilepsia', label: 'Epilepsia' },
    { id: 'glaucoma', label: 'Glaucoma' },
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'lupus', label: 'Lúpus' },
    { id: 'psoriase', label: 'Psoríase' },
    { id: 'fumante', label: 'Fumante' },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm z-[150] flex items-center justify-center">
        <div className="bg-white p-8 rounded-[2rem] flex items-center gap-4">
          <div className="w-6 h-6 border-4 border-primary-gold border-t-transparent rounded-full animate-spin" />
          <p className="font-serif font-bold text-primary-dark">Carregando Ficha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-primary-dark/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-primary-cream/20 bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col my-8"
      >
        <div className="p-8 border-b border-primary-dark/5 flex items-center justify-between bg-primary-cream/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-dark text-primary-gold rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="text-2xl font-serif font-bold text-primary-dark">Ficha de Anamnese</h4>
              <p className="text-sm text-primary-dark/40 font-medium">Paciente: <span className="text-primary-gold">{cliente?.nome}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-primary-cream rounded-full text-primary-dark/40 hover:text-primary-dark transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-2xl">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-400" size={20} />
              <p className="text-sm text-blue-800 font-medium">
                Questionário de saúde central. Marque apenas as condições que se aplicam ao paciente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-4 bg-white border border-primary-dark/5 rounded-2xl group hover:border-primary-gold/20 transition-all">
                <span className="text-sm font-medium text-primary-dark/60 group-hover:text-primary-dark transition-colors">{q.label}</span>
                <button 
                  onClick={() => handleToggle(q.id as any)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.respostas[q.id as keyof typeof formData.respostas] ? 'bg-primary-gold' : 'bg-primary-dark/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.respostas[q.id as keyof typeof formData.respostas] ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}

            <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-4 p-6 bg-primary-gold/5 border border-primary-gold/20 rounded-[2rem]">
               <div className="flex items-center justify-between">
                  <div>
                    <h6 className="font-bold text-primary-dark">Alergia</h6>
                    <p className="text-xs text-primary-dark/40 italic">Possui alguma alergia medicamentosa ou alimentar?</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('alergia')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${formData.respostas.alergia ? 'bg-primary-gold' : 'bg-primary-dark/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.respostas.alergia ? 'right-1' : 'left-1'}`} />
                  </button>
               </div>
               {formData.respostas.alergia && (
                 <input 
                  type="text"
                  value={formData.respostas.alergiaQuais}
                  onChange={(e) => setFormData(prev => ({ ...prev, respostas: { ...prev.respostas, alergiaQuais: e.target.value } }))}
                  placeholder="Quais alergias possui?"
                  className="w-full px-6 py-3 bg-white border border-primary-gold/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/40 transition-all"
                 />
               )}
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-4 p-6 bg-primary-cream/20 border border-primary-dark/5 rounded-[2rem]">
               <div>
                  <h6 className="font-bold text-primary-dark flex items-center gap-2">
                    <PlusCircle size={16} /> Outras Observações / Patologias
                  </h6>
                  <p className="text-xs text-primary-dark/40 italic">Adicione qualquer outra condição de saúde relevante.</p>
               </div>
               <textarea 
                value={formData.outrasObservacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, outrasObservacoes: e.target.value }))}
                placeholder="Descreva aqui outras patologias ou observações importantes..."
                rows={4}
                className="w-full px-6 py-4 bg-white border border-primary-dark/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-gold/40 transition-all resize-none text-sm"
               />
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-primary-dark/5">
            <h5 className="text-lg font-serif font-bold text-primary-dark uppercase tracking-widest text-center">Termos de Responsabilidade</h5>
            <div className="grid grid-cols-1 gap-4">
               <div 
                onClick={() => setFormData(p => ({ ...p, consentimento: !p.consentimento }))}
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex gap-4 items-start ${formData.consentimento ? 'bg-primary-dark text-white border-primary-dark shadow-xl' : 'bg-white border-primary-dark/5 text-primary-dark/60 hover:border-primary-dark/20'}`}
               >
                 <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${formData.consentimento ? 'bg-primary-gold text-white' : 'bg-primary-dark/10'}`}>
                    {formData.consentimento && <Check size={16} />}
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-bold">Declaração de Veracidade e Consentimento</p>
                    <p className="text-xs font-medium italic opacity-60">
                      Declaro a veracidade das informações e assumo a responsabilidade pelo pós-atendimento.
                    </p>
                 </div>
               </div>

               <div 
                onClick={() => setFormData(p => ({ ...p, autorizoImagem: !p.autorizoImagem }))}
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex gap-4 items-start ${formData.autorizoImagem ? 'bg-primary-gold text-white border-primary-gold shadow-xl' : 'bg-white border-primary-dark/5 text-primary-dark/60 hover:border-primary-dark/20'}`}
               >
                 <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${formData.autorizoImagem ? 'bg-white text-primary-gold' : 'bg-primary-dark/10'}`}>
                    {formData.autorizoImagem && <Check size={16} />}
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-bold">Autorização de Uso de Imagem</p>
                    <p className="text-xs font-medium italic opacity-60">
                      Autorizo a exibição da minha imagem gratuitamente para fins profissionais.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-primary-cream/10 border-t border-primary-dark/5 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-8 border border-primary-dark text-primary-dark rounded-2xl font-bold hover:bg-primary-cream transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 px-8 bg-primary-dark text-white rounded-2xl font-bold shadow-xl shadow-primary-dark/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {ficha ? 'Atualizar Ficha' : 'Salvar Ficha'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
