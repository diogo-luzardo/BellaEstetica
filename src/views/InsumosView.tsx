import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Trash2, 
  Sparkles, 
  History, 
  Loader2, 
  Search, 
  Filter, 
  Check, 
  AlertCircle, 
  TrendingDown, 
  LineChart as ChartIcon, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  writeBatch,
  deleteDoc,
  doc,
  query, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { ListaPromocional, PrecoInsumo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function InsumosView() {
  const { currentTenantId, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registrar' | 'historico'>('dashboard');
  
  // Data States
  const [listas, setListas] = useState<ListaPromocional[]>([]);
  const [precos, setPrecos] = useState<PrecoInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paste / Import State
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    titulo: string;
    dataRef: string;
    produtos: Omit<PrecoInsumo, 'id' | 'tenantId' | 'listaId' | 'dataRef' | 'createdAt'>[];
  } | null>(null);
  const [customTitulo, setCustomTitulo] = useState('');
  const [customDataRef, setCustomDataRef] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');

  // Load sample data as a backup/test tool
  const handleLoadSample = () => {
    const sample = {
      titulo: 'Promoção Tabela Especial Harmonização (Maio)',
      dataRef: '2026-05',
      produtos: [
        {
          nome: 'XEOMIN XT 100UI',
          categoria: 'TOXINAS BOTULÍNICAS',
          precoUnitario: 569.00,
          detalhes: 'Marca nacional Merz. Entrega imediata.',
          tiers: [
            { quantidade: 3, precoCada: 550.00 },
            { quantidade: 5, precoCada: 539.00 }
          ]
        },
        {
          nome: 'BOTOX ALLERGAN 200UI',
          categoria: 'TOXINAS BOTULÍNICAS',
          precoUnitario: 980.00,
          detalhes: 'Garantia de procedência direta.',
          tiers: [
            { quantidade: 2, precoCada: 940.00 },
            { quantidade: 4, precoCada: 899.00 }
          ]
        },
        {
          nome: 'RENNOVA ULTRA DEEP (1x1ml)',
          categoria: 'PREENCHEDORES',
          precoUnitario: 320.00,
          detalhes: 'Ganhe 1 cânula descartável por seringa.',
          tiers: [
            { quantidade: 5, precoCada: 299.00 },
            { quantidade: 10, precoCada: 279.00 }
          ]
        },
        {
          nome: 'SCULPTRA BIOESTIMULADOR',
          categoria: 'BIOESTIMULADORES',
          precoUnitario: 1450.00,
          detalhes: 'Frasco original Galderma.',
          tiers: [
            { quantidade: 3, precoCada: 1390.00 },
            { quantidade: 5, precoCada: 1320.00 }
          ]
        },
        {
          nome: 'FIOS PDO ESPICULADOS 21G 100MM',
          categoria: 'FIOS DE PDO',
          precoUnitario: 65.00,
          detalhes: 'Fios espiculados alta tração.',
          tiers: [
            { quantidade: 20, precoCada: 58.00 },
            { quantidade: 50, precoCada: 52.00 }
          ]
        }
      ]
    };
    setRawText(
      'PROMOÇÃO ESPECIAL BELLAESTÉTICA - MAIO 🌸\n' +
      '> 💉 TOXINAS BOTULÍNICAS\n' +
      '▫️ XEOMIN XT 100UI - R$ 569,00. Levando 3 cx - R$ 550,00 cada. Levando 5 cx - R$ 539,00 cada\n' +
      '▫️ BOTOX ALLERGAN 200UI - R$ 980,00. Levando 2 cx - R$ 940,00 cada. Levando 4 cx - R$ 899,00 cada\n' +
      '> ✨ PREENCHEDORES\n' +
      '▫️ RENNOVA ULTRA DEEP (1x1ml) - R$ 320,00. Levando 5 cx - R$ 299,00 cada. Levando 10 cx - R$ 279,00 cada\n' +
      '> 🧬 BIOESTIMULADORES\n' +
      '▫️ SCULPTRA BIOESTIMULADOR - R$ 1450,00. Levando 3 cx - R$ 1390,00 cada. Levando 5 cx - R$ 1320,00 cada'
    );
    setParsedData(sample);
    setCustomTitulo(sample.titulo);
    setCustomDataRef(sample.dataRef);
    setParseError(null);
  };

  // Dashboard Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductDetails, setSelectedProductDetails] = useState<string | null>(null);

  // Load Pricing Data from Firestore
  useEffect(() => {
    if (!currentTenantId) return;
    setLoading(true);

    const qListas = query(collection(db, 'listasPromocionais'), where('tenantId', '==', currentTenantId));
    const unsubListas = onSnapshot(qListas, (shot) => {
      const data = shot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ListaPromocional));
      // Sort lists by references decending YYYY-MM
      setListas(data.sort((a, b) => b.dataRef.localeCompare(a.dataRef)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'listasPromocionais');
    });

    const qPrecos = query(collection(db, 'precosInsumos'), where('tenantId', '==', currentTenantId));
    const unsubPrecos = onSnapshot(qPrecos, (shot) => {
      const data = shot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrecoInsumo));
      setPrecos(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'precosInsumos');
    });

    return () => {
      unsubListas();
      unsubPrecos();
    };
  }, [currentTenantId]);

  // Handle Gemini parsing
  const handleParseText = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParsedData(null);
    setParseError(null);
    setImportStatus('idle');

    try {
      const response = await fetch('/api/parse-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao processar texto com a IA');
      }

      const resJson = await response.json();
      setParsedData(resJson);
      setCustomTitulo(resJson.titulo || 'Promoção de Insumos');
      setCustomDataRef(resJson.dataRef || new Date().toISOString().slice(0, 7));
    } catch (e: any) {
      console.error(e);
      setParseError(e.message || 'Erro de conexão ou timeout da IA. Por favor, tente novamente.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm Import (Save to Firestore batch write)
  const handleConfirmImport = async () => {
    if (!currentTenantId || !parsedData) return;
    setImportStatus('importing');
    setSaveError(null);

    try {
      const batch = writeBatch(db);

      // Create new List document
      const listRef = doc(collection(db, 'listasPromocionais'));
      const listData = {
        tenantId: currentTenantId,
        titulo: customTitulo,
        dataRef: customDataRef,
        rawText: rawText,
        createdAt: Timestamp.now()
      };
      batch.set(listRef, listData);

      // Create each Price Log document
      parsedData.produtos.forEach((p) => {
        const priceRef = doc(collection(db, 'precosInsumos'));
        const priceData = {
          tenantId: currentTenantId,
          listaId: listRef.id,
          nome: p.nome,
          categoria: p.categoria,
          precoUnitario: Number(p.precoUnitario) || 0,
          tiers: p.tiers || [],
          detalhes: p.detalhes || '',
          dataRef: customDataRef,
          createdAt: Timestamp.now()
        };
        batch.set(priceRef, priceData);
      });

      await batch.commit();
      setImportStatus('success');
      setRawText('');
      setParsedData(null);
      // Auto switch back to dashboard after brief delay
      setTimeout(() => {
        setActiveTab('dashboard');
        setImportStatus('idle');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setImportStatus('error');
      setSaveError(err.message || String(err));
      handleFirestoreError(err, OperationType.WRITE, 'precosInsumos');
    }
  };

  // Delete promotional list along with all its prices
  const handleDeleteList = async (listId: string) => {
    if (!confirm('Deseja realmente excluir esta lista e todos os preços vinculados a ela do histórico?')) return;
    try {
      const assocPrices = precos.filter(p => p.listaId === listId);
      const batch = writeBatch(db);
      
      // Delete prices
      assocPrices.forEach(p => {
        batch.delete(doc(db, 'precosInsumos', p.id));
      });
      // Delete list
      batch.delete(doc(db, 'listasPromocionais', listId));

      await batch.commit();
      alert('Lista promocional e todos os preços vinculados foram excluídos com sucesso.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'listasPromocionais');
    }
  };

  // Calculate Product Consolidated Metrics
  // Group by product name
  const productSummary = React.useMemo(() => {
    const summaryMap: Record<string, {
      nome: string;
      categoria: string;
      prices: PrecoInsumo[];
      bestPrice: number;
      bestTier: { quantidade: number; precoCada: number; p: PrecoInsumo } | null;
      latestPrice: number;
      latestPriceDoc: PrecoInsumo | null;
      percentageDiff: number; // diff from last month
    }> = {};

    precos.forEach(item => {
      const cleanName = item.nome.trim();
      if (!summaryMap[cleanName]) {
        summaryMap[cleanName] = {
          nome: cleanName,
          categoria: item.categoria,
          prices: [],
          bestPrice: Infinity,
          bestTier: null,
          latestPrice: 0,
          latestPriceDoc: null,
          percentageDiff: 0
        };
      }
      summaryMap[cleanName].prices.push(item);
    });

    Object.values(summaryMap).forEach(summary => {
      // Sort prices chronologically (ascending YYYY-MM)
      summary.prices.sort((a, b) => a.dataRef.localeCompare(b.dataRef));
      
      // Best Price Ever Found
      summary.prices.forEach(p => {
        if (p.precoUnitario < summary.bestPrice && p.precoUnitario > 0) {
          summary.bestPrice = p.precoUnitario;
        }
        // Check ties / tiers as well
        p.tiers.forEach(t => {
          if (t.precoCada < summary.bestPrice && t.precoCada > 0) {
            summary.bestPrice = t.precoCada;
          }
          if (!summary.bestTier || t.precoCada < summary.bestTier.precoCada) {
            summary.bestTier = { quantidade: t.quantidade, precoCada: t.precoCada, p };
          }
        });
      });

      // Latest Price Entry
      const latest = summary.prices[summary.prices.length - 1];
      if (latest) {
        summary.latestPrice = latest.precoUnitario;
        summary.latestPriceDoc = latest;

        // Calculate transition from second latest
        const secondLatest = summary.prices[summary.prices.length - 2];
        if (secondLatest && secondLatest.precoUnitario > 0) {
          summary.percentageDiff = ((latest.precoUnitario - secondLatest.precoUnitario) / secondLatest.precoUnitario) * 100;
        }
      }
    });

    return Object.values(summaryMap);
  }, [precos]);

  // Unique Categories list
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    precos.forEach(p => {
      if (p.categoria) cats.add(p.categoria.toUpperCase());
    });
    return Array.from(cats);
  }, [precos]);

  // Filter products for dashboard
  const filteredProducts = React.useMemo(() => {
    return productSummary.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.categoria.toUpperCase() === selectedCategory.toUpperCase();
      return matchesSearch && matchesCategory;
    });
  }, [productSummary, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Visual Navigation Tabs */}
      <div className="border-b border-primary-dark/5 flex items-center justify-between">
        <div className="flex gap-8">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedProductDetails(null); }}
            className={`pb-4 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'dashboard' 
                ? 'border-b-2 border-primary-gold text-primary-gold font-semibold' 
                : 'text-primary-dark/40 hover:text-primary-dark'
            }`}
          >
            <TrendingUp size={16} />
            Acompanhamento de Preços
          </button>
          <button
            onClick={() => { setActiveTab('registrar'); setSelectedProductDetails(null); }}
            className={`pb-4 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'registrar' 
                ? 'border-b-2 border-primary-gold text-primary-gold font-semibold' 
                : 'text-primary-dark/40 hover:text-primary-dark'
            }`}
          >
            <Sparkles size={16} className="text-amber-500 animate-pulse" />
            Analisar Promoção (IA)
          </button>
          <button
            onClick={() => { setActiveTab('historico'); setSelectedProductDetails(null); }}
            className={`pb-4 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'historico' 
                ? 'border-b-2 border-primary-gold text-primary-gold font-semibold' 
                : 'text-primary-dark/40 hover:text-primary-dark'
            }`}
          >
            <History size={16} />
            Minhas Listas Salvas
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: DASHBOARD & TREND TRACKER */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-primary-cream rounded-xl text-primary-gold">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-dark">{productSummary.length}</div>
                  <div className="text-xs text-primary-dark/40 font-semibold uppercase tracking-wider">Insumos Registrados</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-primary-cream rounded-xl text-primary-gold">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-dark">{listas.length}</div>
                  <div className="text-xs text-primary-dark/40 font-semibold uppercase tracking-wider">Históricos de Campanhas</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-primary-dark/5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Coins size={24} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Sugestão Inteligente Ativa</div>
                  <div className="text-xs text-primary-dark/60 mt-1">Sempre buscando as melhores escalas de descontos.</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/30" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar insumos (ex: Xeomin, Botox)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-primary-dark/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-gold/20"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === 'all' 
                      ? 'bg-primary-dark text-white' 
                      : 'bg-white border border-primary-dark/10 text-primary-dark/60 hover:bg-primary-cream/20'
                  }`}
                >
                  Todas Categorias
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory.toUpperCase() === cat.toUpperCase()
                        ? 'bg-primary-dark text-white' 
                        : 'bg-white border border-primary-dark/10 text-primary-dark/60 hover:bg-primary-cream/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Product list table */}
              <div className="bg-white rounded-2xl border border-primary-dark/5 shadow-sm overflow-hidden lg:col-span-2">
                <div className="p-6 border-b border-primary-dark/5">
                  <h4 className="text-lg font-serif font-bold text-primary-dark">Insumos Monitorados</h4>
                  <p className="text-xs text-primary-dark/40">Clique em qualquer produto da lista para abrir o histórico de curvas e ofertas.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-primary-cream/10 text-[10px] uppercase tracking-widest text-primary-dark/40 border-b border-primary-dark/5">
                        <th className="px-6 py-3 font-semibold">Insumo</th>
                        <th className="px-6 py-3 font-semibold">Categoria</th>
                        <th className="px-6 py-3 font-semibold text-right">Último Valor</th>
                        <th className="px-6 py-3 font-semibold text-right">Melhor Valor</th>
                        <th className="px-6 py-3 font-semibold text-center">Trend de Preços</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-dark/5">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="animate-spin text-primary-gold" size={16} />
                              Carregando histórico de compras...
                            </div>
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">
                            Nenhum preço de produto cadastrado no momento. Acesse a aba "Analisar Promoção" para começar!
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isSelected = selectedProductDetails === p.nome;
                          const showDiff = p.percentageDiff !== 0;

                          return (
                            <tr 
                              key={p.nome} 
                              onClick={() => setSelectedProductDetails(isSelected ? null : p.nome)}
                              className={`hover:bg-primary-cream/5 transition-colors cursor-pointer ${
                                isSelected ? 'bg-primary-cream/10 border-l-4 border-primary-gold' : ''
                              }`}
                            >
                              <td className="px-6 py-4 font-medium text-sm">
                                {p.nome}
                                {p.latestPriceDoc?.detalhes && (
                                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                                    • {p.latestPriceDoc.detalhes}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs text-primary-dark/50">
                                <span className="bg-primary-cream px-2.5 py-1 rounded-full text-primary-dark/60 font-semibold tracking-wider text-[9px] uppercase">
                                  {p.categoria}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-right text-primary-dark">
                                {formatCurrency(p.latestPrice)}
                                {showDiff && (
                                  <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                                    p.percentageDiff > 0 ? 'text-red-500' : 'text-emerald-500'
                                  }`}>
                                    {p.percentageDiff > 0 ? (
                                      <>
                                        <TrendingUp size={10} /> +{p.percentageDiff.toFixed(1)}%
                                      </>
                                    ) : (
                                      <>
                                        <TrendingDown size={10} /> {p.percentageDiff.toFixed(1)}%
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600">
                                {formatCurrency(p.bestPrice)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center gap-1 text-xs text-primary-gold hover:underline font-bold">
                                  <ChartIcon size={14} /> Analisar
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Side Detail Panel (expanding price trend and predictions) */}
              <div className="bg-white rounded-2xl border border-primary-dark/5 shadow-sm p-6 space-y-6">
                {selectedProductDetails ? (() => {
                  const prod = productSummary.find(p => p.nome === selectedProductDetails);
                  if (!prod) return null;

                  // Data points for Recharts Chart
                  const chartData = prod.prices.map(pr => {
                    const monthNames: Record<string, string> = {
                      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
                      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
                    };
                    const parts = pr.dataRef.split('-');
                    const label = parts.length === 2 ? `${monthNames[parts[1]] || parts[1]}/${parts[0].slice(2)}` : pr.dataRef;
                    
                    return {
                      mes: label,
                      valor: pr.precoUnitario,
                      // Find best tier price in this list
                      melhorTier: pr.tiers.length > 0 ? Math.min(...pr.tiers.map(t => t.precoCada)) : pr.precoUnitario
                    };
                  });

                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="text-xs uppercase font-bold text-primary-gold tracking-widest">{prod.categoria}</div>
                        <h4 className="text-xl font-serif font-bold text-primary-dark mt-1">{prod.nome}</h4>
                      </div>

                      {/* Fluctuation summary chart */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-primary-dark/40 uppercase tracking-wider">Histórico de Preço Unitário</div>
                        <div className="h-48 w-full bg-primary-cream/10 rounded-xl p-2 border border-primary-dark/5">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6c6a61' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#6c6a61' }} />
                              <Tooltip 
                                formatter={(value: any) => [formatCurrency(Number(value)), "Unitário"]}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #dfdcd3', borderRadius: '8px' }}
                              />
                              <Line type="monotone" dataKey="valor" stroke="#b08d4b" strokeWidth={2.5} activeDot={{ r: 6 }} />
                              {prod.bestTier && (
                                <Line type="monotone" dataKey="melhorTier" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {prod.bestTier && (
                          <div className="text-[10px] text-center text-primary-dark/40 italic mt-1">
                            Linha pontilhada: Melhor preço com compra em quantidade (Tiers).
                          </div>
                        )}
                      </div>

                      {/* Best price suggestion */}
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <Sparkles size={16} className="text-emerald-600" />
                          Sugestão Inteligente de Margem
                        </div>
                        {prod.bestTier ? (
                          <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                            Adquira a promoção de {prod.bestTier.quantidade} unidades para garantir o custo de <strong className="text-emerald-900 font-extrabold">{formatCurrency(prod.bestTier.precoCada)} cada</strong> (economia de {( ((prod.latestPrice - prod.bestTier.precoCada) / prod.latestPrice) * 100).toFixed(1)}% comparado ao valor unitário de {formatCurrency(prod.latestPrice)}).
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                            Este fornecedor não disponibilizou tabelamento de quantidade nesta oferta. O melhor preço de custo unitário disponível hoje é de <strong className="text-emerald-900 font-extrabold">{formatCurrency(prod.latestPrice)}</strong>.
                          </p>
                        )}
                      </div>

                      {/* Offer tiers expansion */}
                      {prod.latestPriceDoc && prod.latestPriceDoc.tiers.length > 0 && (
                        <div className="space-y-3">
                          <h6 className="text-[10px] uppercase font-bold text-primary-dark/40 tracking-wider">Tudo no Lote Corrente ({prod.latestPriceDoc.dataRef})</h6>
                          <div className="bg-primary-cream/20 rounded-xl border border-primary-dark/5 divide-y divide-primary-dark/5">
                            {prod.latestPriceDoc.tiers.map((t, index) => (
                              <div key={index} className="px-4 py-2.5 flex items-center justify-between text-xs">
                                <span className="font-semibold text-primary-dark">Leve {t.quantidade} ou mais</span>
                                <span className="font-extrabold text-primary-gold">{formatCurrency(t.precoCada)} / cada</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })() : (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-primary-cream rounded-full text-primary-gold">
                      <TrendingUp size={36} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-serif font-bold text-primary-dark">Visualizar Tendências</h5>
                      <p className="text-xs text-primary-dark/40 max-w-[200px] mx-auto">
                        Selecione um insumo ao lado para verificar gráficos de preços históricos e as melhores sugestões de lotes de desconto.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: TEXT PASTER & AI EXTRACTOR */}
        {activeTab === 'registrar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-2xl border border-primary-dark/5 shadow-sm space-y-6">
              <div className="space-y-2">
                <h4 className="text-2xl font-serif font-bold text-primary-dark flex items-center gap-2">
                  <Sparkles className="text-primary-gold" />
                  Importar Promoção por Texto
                </h4>
                <p className="text-sm text-primary-dark/40 leading-relaxed max-w-3xl">
                  Copie e cole toda a mensagem de texto promocional recebida via WhatsApp, E-mail ou Distribuidora. Nossa Inteligência Artificial (Gemini) vai identificar automaticamente as marcas, volumes, preços por caixa individuais e todas as escalas de desconto.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input TextArea */}
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5ClassName">
                    <label className="text-xs font-bold text-primary-dark/40 uppercase tracking-widest mb-1.5 block">Texto da Mensagem ou Tabela</label>
                    <textarea
                      rows={14}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Copie e cole aqui a lista. Exemplo:&#10;PROMOÇÃO DE MAIO - SP🌷&#10;> ❤️ TOXINAS BOTULÍNICAS&#10;▫️ XEOMIN 100UI - R$ 569,00&#10;Levando 03 cx - R$ 550,00 cada&#10;Levando 05 cx - R$ 539,00 cada..."
                      className="w-full p-4 bg-primary-cream/10 border border-primary-dark/10 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-gold/20 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleParseText}
                    disabled={isParsing || !rawText.trim()}
                    className="w-full py-4 bg-primary-gold text-white rounded-xl font-bold shadow-lg shadow-primary-gold/20 hover:scale-[1.01] hover:bg-primary-gold/90 transition-all flex items-center justify-center gap-2 disabled:opacity-55 disabled:scale-100 disabled:pointer-events-none"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Analisando com Inteligência Artificial BellaEstética...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Extrair Preços Automaticamente
                      </>
                    )}
                  </button>
                </div>

                {/* Extracted Preview Panel */}
                <div className="bg-primary-cream/10 border border-primary-dark/5 rounded-2xl p-6 relative flex flex-col justify-between min-h-[400px]">
                  {parsedData ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="border-b border-primary-dark/10 pb-4">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full inline-block mb-2">
                            ✓ Extração de Dados Completada
                          </span>
                          <h5 className="font-serif font-bold text-xl text-primary-dark">Confirme as Configurações de Identificação</h5>
                        </div>

                        {/* Title & Ref inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest">Nome da Campanha</label>
                            <input 
                              type="text"
                              value={customTitulo}
                              onChange={(e) => setCustomTitulo(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-primary-dark/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary-gold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-primary-dark/40 uppercase tracking-widest font-mono">Mês de Referência (YYYY-MM)</label>
                            <input 
                              type="text"
                              value={customDataRef}
                              onChange={(e) => setCustomDataRef(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-primary-dark/10 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-gold"
                              placeholder="Ex: 2026-05"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h6 className="text-[10px] uppercase font-bold text-primary-dark/40 tracking-wider">Amostra dos Insumos ({parsedData.produtos.length} extraídos)</h6>
                          <div className="max-h-52 overflow-y-auto border border-primary-dark/5 rounded-xl divide-y divide-primary-dark/5 bg-white">
                            {parsedData.produtos.map((p, idx) => (
                              <div key={idx} className="p-3 text-xs flex justify-between items-start hover:bg-gray-50">
                                <div>
                                  <span className="font-bold text-primary-dark">{p.nome}</span>
                                  <div className="text-[10px] text-primary-dark/40 capitalize">{p.categoria.toLowerCase()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary-gold">{formatCurrency(p.precoUnitario)}</div>
                                  {p.tiers && p.tiers.length > 0 && (
                                    <div className="text-[9px] text-emerald-600 font-semibold uppercase mt-0.5 mt-0.5">
                                      {p.tiers.length} escalas de descontos
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-primary-dark/5">
                        {importStatus === 'importing' ? (
                          <div className="w-full p-4 bg-primary-gold/10 text-primary-gold rounded-xl font-bold flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            Gravando dados e gerando relacionamentos...
                          </div>
                        ) : importStatus === 'success' ? (
                          <div className="w-full p-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                            <Check size={18} /> Importado com sucesso! Redirecionando...
                          </div>
                        ) : importStatus === 'error' ? (
                          <div className="w-full p-4 bg-red-50/80 border border-red-200 text-red-900 rounded-xl font-medium flex flex-col gap-2 shadow-sm text-xs items-start">
                            <div className="flex items-center gap-2 font-bold text-sm text-red-600">
                              <AlertCircle size={18} />
                              <span>Erro de Permissão ou Gravação</span>
                            </div>
                            <p className="font-mono bg-white border border-red-100 p-2.5 rounded-lg w-full text-left break-words max-h-32 overflow-y-auto leading-relaxed">
                              {saveError || "Acesso negado pelas regras de segurança (recomenda-se login como Gerente ou Admin)."}
                            </p>
                            <p className="text-[10px] text-red-700 font-normal leading-normal">
                              Dica: Usuários com o email master <strong>diogohxcx@gmail.com</strong> são promovidos a suporte administrativo, mas precisam estar associados ao Tenant ID correto.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => setParsedData(null)}
                              className="w-full py-3.5 bg-gray-50 border border-primary-dark/10 hover:bg-gray-100 rounded-xl text-xs font-semibold text-primary-dark transition-all"
                            >
                              Descartar Análise
                            </button>
                            <button
                              onClick={handleConfirmImport}
                              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/10 transition-all flex items-center justify-center gap-2"
                            >
                              Confirmar e Salvar!
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : parseError ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-6 px-4 bg-red-50/50 border border-red-100 rounded-2xl">
                      <div className="p-3 bg-red-100 rounded-full text-red-600">
                        <AlertCircle size={32} />
                      </div>
                      <div className="space-y-2 max-w-[325px]">
                        <h5 className="font-serif font-bold text-red-900">Erro na Extração de Dados</h5>
                        <p className="text-xs text-red-800 leading-relaxed bg-white/80 p-3 rounded-lg border border-red-100 text-left font-mono break-words max-h-32 overflow-y-auto">
                          {parseError}
                        </p>
                        <p className="text-[11px] text-red-700/80 leading-relaxed mt-2">
                          Se você não tiver a chave de API <strong>GEMINI_API_KEY</strong> ativada no painel de segredos (Configurações &gt; Secrets), use a ferramenta abaixo para carregar um exemplo real pré-configurado.
                        </p>
                      </div>
                      <button
                        onClick={handleLoadSample}
                        className="px-5 py-2.5 bg-primary-gold hover:bg-primary-gold/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-gold/10"
                      >
                        Carregar Tabela de Exemplo (Maio)
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                      <div className="p-4 bg-primary-cream rounded-full text-primary-gold animate-bounce">
                        <Sparkles size={36} />
                      </div>
                      <div className="space-y-1 max-w-[280px]">
                        <h5 className="font-serif font-bold text-primary-dark">Resultado da Inteligência Artificial</h5>
                        <p className="text-xs text-primary-dark/40 leading-relaxed">
                          Uma vez clicado em analisar, o resultado estruturado com preços, quantidades progressivas e prazos de validade aparecerá aqui para sua validação.
                        </p>
                        <div className="pt-4 flex flex-col items-center">
                          <span className="text-[10px] text-primary-dark/30 mb-2">— OU PARA TESTES SE PREFERIR —</span>
                          <button
                            onClick={handleLoadSample}
                            className="text-xs text-primary-gold font-bold hover:underline"
                          >
                            Carregar Exemplo de Teste Completo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: PROMO LIST RELATIONSHIPS LIST */}
        {activeTab === 'historico' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-8 rounded-2xl border border-primary-dark/5 shadow-sm space-y-4"
          >
            <div>
              <h4 className="text-xl font-serif font-bold text-primary-dark">Promoções Coletadas de Distribuidores</h4>
              <p className="text-xs text-primary-dark/40">Aqui você acompanha todas as listas que atualmente alimentam seu dashboard inteligente de margens e sugestão de valores.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-cream/10 text-[10px] uppercase tracking-widest text-primary-dark/40 border-b border-primary-dark/5">
                    <th className="px-6 py-4 font-semibold">Cabeçalho Copiado</th>
                    <th className="px-6 py-4 font-semibold">Referência Mensal</th>
                    <th className="px-6 py-4 font-semibold">Itens Cadastrados</th>
                    <th className="px-6 py-4 font-semibold text-right">Cadastrado Em</th>
                    <th className="px-6 py-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-dark/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-primary-dark/40 italic">Carregando listas registradas...</td>
                    </tr>
                  ) : listas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-primary-dark/40 italic">
                        Não existem listas cadastradas. Acesse a aba "Analisar Promoção" para incluir a primeira promoção!
                      </td>
                    </tr>
                  ) : (
                    listas.map((list) => {
                      const countAssoc = precos.filter(p => p.listaId === list.id).length;
                      const dateFormatted = list.createdAt ? (list.createdAt.toDate ? list.createdAt.toDate() : new Date(list.createdAt)).toLocaleDateString('pt-BR') : '---';

                      return (
                        <tr key={list.id} className="hover:bg-primary-cream/5 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-primary-dark">
                            {list.titulo}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-primary-dark/60">
                            {list.dataRef}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className="bg-primary-cream px-2.5 py-1 rounded-full font-bold text-primary-gold text-[10px]">
                              {countAssoc} itens monitorados
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-primary-dark/40 text-right">
                            {dateFormatted}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteList(list.id)}
                              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                              title="Excluir lista promocional"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
