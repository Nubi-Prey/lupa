export const services = [
  {
    id: 'svc-1',
    label: 'Limpeza de Aliança',
    category: 'Limpeza',
    basePrice: 45,
    tags: ['aliança', 'limpeza', 'ouro', 'polimento']
  },
  {
    id: 'svc-2',
    label: 'Solda de Corrente',
    category: 'Conserto',
    basePrice: 80,
    tags: ['corrente', 'solda', 'conserto', 'ouro']
  },
  {
    id: 'svc-3',
    label: 'Restauração de Anel',
    category: 'Restauração',
    basePrice: 150,
    tags: ['anel', 'restauração', 'reparo']
  },
  {
    id: 'svc-4',
    label: 'Polimento de Brinco',
    category: 'Limpeza',
    basePrice: 35,
    tags: ['brinco', 'polimento', 'limpeza']
  },
  {
    id: 'svc-5',
    label: 'Fabricação de Pingente',
    category: 'Fabricação',
    basePrice: 250,
    tags: ['pingente', 'fabricação', 'sob medida']
  },
  {
    id: 'svc-6',
    label: 'Troca de Engaste',
    category: 'Conserto',
    basePrice: 120,
    tags: ['engaste', 'troca', 'pedra', 'conserto']
  },
  {
    id: 'svc-7',
    label: 'Cravação de Pedra',
    category: 'Fabricação',
    basePrice: 180,
    tags: ['cravação', 'pedra', 'diamante', 'esmeralda']
  },
  {
    id: 'svc-8',
    label: 'Banho de Ouro',
    category: 'Limpeza',
    basePrice: 90,
    tags: ['banho', 'ouro', 'banho de ouro', 'galvanização']
  }
]

export const customers = [
  {
    id: 'cust-1',
    name: 'Maria Helena Souza',
    phone: '11998765432',
    email: 'maria.helena@email.com',
    address: 'Rua das Flores, 123 - Pinheiros, São Paulo-SP',
    notes: 'Cliente fiel, prefere contato por WhatsApp'
  },
  {
    id: 'cust-2',
    name: 'Roberto Carlos Lima',
    phone: '21987654321',
    email: 'roberto.lima@email.com',
    address: 'Av. Atlântica, 456 - Copacabana, Rio de Janeiro-RJ',
    notes: ''
  },
  {
    id: 'cust-3',
    name: 'Ana Beatriz Ferreira',
    phone: '31976543210',
    email: 'ana.bf@email.com',
    address: 'Rua da Bahia, 789 - Funcionários, Belo Horizonte-MG',
    notes: 'Alergia a níquel'
  },
  {
    id: 'cust-4',
    name: 'João Pedro Santos',
    phone: '41965432109',
    address: 'Rua XV de Novembro, 321 - Centro, Curitiba-PR',
    notes: ''
  },
  {
    id: 'cust-5',
    name: 'Carolina Mendes',
    phone: '51954321098',
    email: 'carol.mendes@email.com',
    address: 'Rua da Praia, 654 - Cidade Baixa, Porto Alegre-RS',
    notes: 'Aniversário em março — oferecer desconto'
  },
  {
    id: 'cust-6',
    name: 'Fernando Almeida',
    phone: '61943210987',
    address: 'SQS 308, Bloco A - Asa Sul, Brasília-DF',
    notes: ''
  },
  {
    id: 'cust-7',
    name: 'Patrícia Rocha',
    phone: '71932109876',
    email: 'patricia.rocha@email.com',
    address: 'Rua Chile, 987 - Graça, Salvador-BA',
    notes: 'Trabalha com joias antigas da família'
  },
  {
    id: 'cust-8',
    name: 'Luís Gustavo Oliveira',
    phone: '81921098765',
    address: 'Av. Boa Viagem, 159 - Boa Viagem, Recife-PE',
    notes: ''
  }
]

const today = new Date()
function daysFromNow(d: number): string {
  const date = new Date(today)
  date.setDate(date.getDate() + d)
  return date.toISOString()
}

export const orders = [
  {
    id: 'os-1',
    osNumber: 1,
    customer: { name: 'Maria Helena Souza', phone: '11998765432' },
    items: [
      { description: 'Limpeza de Aliança', quantity: 2, price: 45 },
      { description: 'Polimento de Brinco', quantity: 1, price: 35 }
    ],
    status: 'ready',
    dates: { created: daysFromNow(-5), deadline: daysFromNow(-1) },
    financial: { total: 125, deposit: 60, balance: 65 },
    attachments: [],
    notes: 'Alianças de casamento — urgente'
  },
  {
    id: 'os-2',
    osNumber: 2,
    customer: { name: 'Roberto Carlos Lima', phone: '21987654321' },
    items: [
      { description: 'Solda de Corrente', quantity: 1, price: 80 }
    ],
    status: 'in_progress',
    dates: { created: daysFromNow(-3), deadline: daysFromNow(4) },
    financial: { total: 80, deposit: 40, balance: 40 },
    attachments: [],
    notes: ''
  },
  {
    id: 'os-3',
    osNumber: 3,
    customer: { name: 'Ana Beatriz Ferreira', phone: '31976543210' },
    items: [
      { description: 'Restauração de Anel', quantity: 1, price: 150 },
      { description: 'Cravação de Pedra', quantity: 1, price: 180 }
    ],
    status: 'pending',
    dates: { created: daysFromNow(-2), deadline: daysFromNow(12) },
    financial: { total: 330, deposit: 100, balance: 230 },
    attachments: [],
    notes: 'Anel de família — pedra esmeralda, manusear com cuidado'
  },
  {
    id: 'os-4',
    osNumber: 4,
    customer: { name: 'João Pedro Santos', phone: '41965432109' },
    items: [
      { description: 'Fabricação de Pingente', quantity: 1, price: 250 }
    ],
    status: 'quote',
    dates: { created: daysFromNow(-1), deadline: daysFromNow(15) },
    financial: { total: 250, deposit: 0, balance: 250 },
    attachments: [],
    notes: 'Design exclusivo — aguardando aprovação do orçamento'
  },
  {
    id: 'os-5',
    osNumber: 5,
    customer: { name: 'Carolina Mendes', phone: '51954321098' },
    items: [
      { description: 'Banho de Ouro', quantity: 3, price: 90 }
    ],
    status: 'delivered',
    dates: { created: daysFromNow(-10), deadline: daysFromNow(-3), finished: daysFromNow(-2) },
    financial: { total: 270, deposit: 270, balance: 0 },
    attachments: [],
    notes: ''
  },
  {
    id: 'os-6',
    osNumber: 6,
    customer: { name: 'Fernando Almeida', phone: '61943210987' },
    items: [
      { description: 'Troca de Engaste', quantity: 1, price: 120 },
      { description: 'Limpeza de Aliança', quantity: 1, price: 45 }
    ],
    status: 'in_progress',
    dates: { created: daysFromNow(-4), deadline: daysFromNow(3) },
    financial: { total: 165, deposit: 80, balance: 85 },
    attachments: [],
    notes: 'Engaste para diamante 0.5ct'
  },
  {
    id: 'os-7',
    osNumber: 7,
    customer: { name: 'Patrícia Rocha', phone: '71932109876' },
    items: [
      { description: 'Limpeza de Aliança', quantity: 3, price: 45 },
      { description: 'Polimento de Brinco', quantity: 2, price: 35 }
    ],
    status: 'ready',
    dates: { created: daysFromNow(-6), deadline: daysFromNow(0) },
    financial: { total: 205, deposit: 100, balance: 105 },
    attachments: [],
    notes: 'Conjunto da família — 3 alianças + 2 brincos'
  },
  {
    id: 'os-8',
    osNumber: 8,
    customer: { name: 'Luís Gustavo Oliveira', phone: '81921098765' },
    items: [
      { description: 'Solda de Corrente', quantity: 1, price: 80 },
      { description: 'Polimento de Brinco', quantity: 1, price: 35 }
    ],
    status: 'pending',
    dates: { created: daysFromNow(-1), deadline: daysFromNow(7) },
    financial: { total: 115, deposit: 50, balance: 65 },
    attachments: [],
    notes: ''
  }
]
