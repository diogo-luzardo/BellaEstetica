import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedMockData() {
  try {
    // 1. Seed Profissionais
    const profs = [
      { nome: 'Dra. Ana Paula', especialidade: 'Dermatologia Estética', bio: 'Especialista em rejuvenescimento facial.' },
      { nome: 'Luiza Martinez', especialidade: 'Estética Corporal', bio: 'Expert em protocolos de redução de medidas.' },
      { nome: 'Beatriz Silva', especialidade: 'Micropigmentação', bio: 'Design de sobrancelhas e lábios.' },
      { nome: 'Dr. Marcos Oliveira', especialidade: 'Harmonização Facial', bio: 'Mestrado em anatomia aplicada.' }
    ];
    
    const profRefs = [];
    for (const p of profs) {
      const doc = await addDoc(collection(db, 'profissionais'), p);
      profRefs.push(doc.id);
    }

    // 2. Seed Clientes
    const clientes = [
      { nome: 'Mariana Lima', telefone: '(11) 98888-1111', email: 'mariana@email.com', dataNascimento: '1992-05-15', createdAt: serverTimestamp() },
      { nome: 'Ricardo Alves', telefone: '(11) 97777-2222', email: 'ricardo@email.com', dataNascimento: '1985-10-20', createdAt: serverTimestamp() },
      { nome: 'Juliana Costa', telefone: '(11) 96666-3333', email: 'ju@email.com', dataNascimento: '1995-02-28', createdAt: serverTimestamp() },
      { nome: 'Fernanda Souza', telefone: '(11) 95555-4444', email: 'fer@email.com', dataNascimento: '1988-12-05', createdAt: serverTimestamp() }
    ];
    const cliRefs = [];
    for (const c of clientes) {
      const doc = await addDoc(collection(db, 'clientes'), c);
      cliRefs.push(doc.id);
    }

    // 3. Seed Procedimentos
    const procs = [
      { nome: 'Limpeza de Pele Premium', preco: 250, custo: 45, duracao: 60, categoria: 'Facial' },
      { nome: 'Botox (Full Face)', preco: 1800, custo: 950, duracao: 45, categoria: 'Injetável' },
      { nome: 'Drenagem Linfática', preco: 180, custo: 20, duracao: 50, categoria: 'Corporal' },
      { nome: 'Preenchimento Labial', preco: 1200, custo: 550, duracao: 40, categoria: 'Injetável' },
      { nome: 'Peeling Químico', preco: 350, custo: 80, duracao: 45, categoria: 'Facial' }
    ];
    const procRefs = [];
    for (const p of procs) {
      const doc = await addDoc(collection(db, 'procedimentos'), p);
      procRefs.push(doc.id);
    }

    // 4. Seed Agendamentos
    const today = new Date();
    const agendamentos = [
      {
        clienteId: cliRefs[0],
        profissionalId: profRefs[0],
        procedimentoId: procRefs[0],
        data: Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0)),
        status: 'confirmado'
      },
      {
        clienteId: cliRefs[1],
        profissionalId: profRefs[1],
        procedimentoId: procRefs[2],
        data: Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0)),
        status: 'confirmado'
      },
      {
        clienteId: cliRefs[2],
        profissionalId: profRefs[3],
        procedimentoId: procRefs[1],
        data: Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30)),
        status: 'confirmado'
      }
    ];
    for (const a of agendamentos) {
      await addDoc(collection(db, 'agendamentos'), a);
    }

    // 5. Seed Custos
    const custos = [
      { descricao: 'Aluguel Unidade Jardins', valor: 4500, categoria: 'Fixo', data: '2026-05-01' },
      { descricao: 'Energia Elétrica', valor: 850, categoria: 'Fixo', data: '2026-05-05' },
      { descricao: 'Marketing Digital (Campanha Maio)', valor: 2500, categoria: 'Variável', data: '2026-05-02' },
      { descricao: 'Compra de Insumos (Toxina)', valor: 2800, categoria: 'Variável', data: '2026-05-08' }
    ];
    for (const c of custos) {
      await addDoc(collection(db, 'custos'), c);
    }

    // 6. Seed Produtos (Estoque)
    const produtos = [
      { nome: 'Ácido Hialurônico 1ml', quantidade: 15, valorUnitario: 450, categoria: 'Injetável', alertaMinimo: 5 },
      { nome: 'Toxina Botulínica 100u', quantidade: 8, valorUnitario: 850, categoria: 'Injetável', alertaMinimo: 3 },
      { nome: 'Sabonete Facial Calmante', quantidade: 25, valorUnitario: 35, categoria: 'Skincare', alertaMinimo: 10 },
      { nome: 'Creme Hidratante Corporal', quantidade: 20, valorUnitario: 45, categoria: 'Skincare', alertaMinimo: 8 },
      { nome: 'Máscara de Ouro (Saches)', quantidade: 50, valorUnitario: 12, categoria: 'Facial', alertaMinimo: 15 }
    ];
    for (const prod of produtos) {
      await addDoc(collection(db, 'produtos'), prod);
    }

    alert('Dados de teste gerados com sucesso! Recarregando...');
    window.location.reload();
  } catch (error: any) {
    console.error('Erro ao gerar sementes:', error);
    const detail = error.message || String(error);
    alert(`Erro ao gerar dados: ${detail}`);
  }
}
