/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email?: string;
  dataNascimento?: string;
  createdAt: any;
}

export interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  custo: number;
  duracao: number; // em minutos
  categoria: string;
}

export interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
  telefone: string;
  bio?: string;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  profissionalId: string;
  procedimentoIds: string[];
  data: any; // timestamp
  status: 'confirmado' | 'pendente' | 'cancelado' | 'concluido';
  notas?: string;
}

export interface Custo {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
}

export interface Produto {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  categoria: string;
  alertaMinimo: number;
}

export interface Disponibilidade {
  id: string;
  profissionalId: string;
  data: any; // Timestamp do início do slot
  aberta: boolean;
  procedimentosIds?: string[];
}

export interface FichaAnamnese {
  id: string;
  clienteId: string;
  respostas: {
    aspirina5Dias: boolean;
    hipertensao: boolean;
    tonturas: boolean;
    cardiopatia: boolean;
    menstruada: boolean;
    amamentando: boolean;
    colesterol: boolean;
    problemaRenal: boolean;
    marcaPasso: boolean;
    circulatorio: boolean;
    respiratorio: boolean;
    hepatite: boolean;
    depressao: boolean;
    micropigmentacao: boolean;
    alergia: boolean;
    alergiaQuais: string;
    herpes: boolean;
    hemofilia: boolean;
    cancer: boolean;
    hiv: boolean;
    gravida: boolean;
    asma: boolean;
    epilepsia: boolean;
    glaucoma: boolean;
    diabetes: boolean;
    lupus: boolean;
    psoriase: boolean;
    fumante: boolean;
  };
  outrasObservacoes: string;
  consentimento: boolean;
  autorizoImagem: boolean;
  createdAt: any;
  updatedAt: any;
}
