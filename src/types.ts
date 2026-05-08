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
  bio?: string;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  profissionalId: string;
  procedimentoId: string;
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
