import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Instagram, Facebook } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { STATUS_LABELS } from '@renderer/types'
import { formatCurrency, formatDate, lineTotal } from '@renderer/lib/utils'
import { useEffect } from 'react'
import RogerioLogo from '@renderer/assets/RogerioLogo.png'

function InstagramIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

export function PrintServiceOrder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderById } = useServiceOrderStore()

  useEffect(() => {
    if (id) fetchOrderById(id)
  }, [id, fetchOrderById])

  if (!currentOrder) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const order = currentOrder

  return (
    <div className="p-6 bg-white min-h-screen text-black">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir OS
        </Button>
      </div>

      <div className="os-screen-wrapper">
        <div className="print-area flex flex-col items-center gap-[5mm]">
          {[0, 1].map((via) => (
            <div key={via} className="os-card border border-gray-400 flex flex-col" style={{ width: '14cm', minHeight: '8cm', padding: '3mm', boxSizing: 'border-box', fontSize: '6pt', lineHeight: '1.2' }}>

              {/* Cabeçalho */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1mm', marginBottom: '1mm'}}>
                <div style={{ width: '28%' }}>
                  <img src={RogerioLogo} alt="Rogério Joalheria" style={{ height: '12mm', objectFit: 'contain' }} />
                </div>

                <div style={{ width: '44%', textAlign: 'center', padding: '0 2mm', fontSize: '5pt' }}>
                  <p style={{ fontStyle: 'italic', fontWeight: 500 }}>Venda e Conserto de Jóias, Relógios, Óculos de Sol e Grau com Receita Médica.</p>
                  <p style={{ fontStyle: 'italic', fontWeight: 500 }}>Serviço de Chaveiro, Cópia de Chave e Fabricação de Carimbos</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2mm', marginTop: '0.5mm' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5mm' }}><InstagramIcon size={6}/> @rogeriojoalheiro</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5mm' }}><FacebookIcon size={6}/> /rogeriorelojoaria</span>
                  </div>
                </div>

                <div style={{ width: '28%', textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', backgroundColor: '#f3f4f6', padding: '0.5mm 1mm', border: '0.5pt solid black', textAlign: 'center', minWidth: '18mm' }}>
                    <span style={{ fontWeight: 700, fontSize: '5pt' }}>ORDEM DE SERVIÇO</span>
                  </div>
                  <div style={{ fontSize: '5pt', marginTop: '0.5mm', fontWeight: 700, color: '#444', textTransform: 'uppercase' }}>
                    {via === 0 ? 'VIA CLIENTE' : 'VIA ESTABELECIMENTO'}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div style={{ textAlign: 'center', fontSize: '5pt', fontStyle: 'italic', backgroundColor: '#f9fafb', padding: '0.5mm 0', borderTop: '0.5pt solid #ccc', borderBottom: '0.5pt solid #ccc', marginBottom: '1.5mm' }}>
                Rua Emiliano Sá, 688 - Centro - Armazém - SC | (48) 3645-0078 / 98830-0536
              </div>

              {/* Dados do Cliente */}
              <div style={{ marginBottom: '1.5mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5mm' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ fontWeight: 700, marginRight: '1mm' }}>Nome:</span>
                    <span style={{ textTransform: 'uppercase' }}>{order.customer.name}</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ fontWeight: 700, marginRight: '0.5mm' }}>Fone:</span>
                    <span>{order.customer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div style={{ flexGrow: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderTop: '0.5pt solid #999', borderBottom: '0.5pt solid #999' }}>
                      <th style={{ padding: '0.5mm 1mm', textAlign: 'left' }}>Descrição</th>
                      <th style={{ padding: '0.5mm', textAlign: 'center', width: '8mm' }}>Qtd</th>
                      <th style={{ padding: '0.5mm 1mm', textAlign: 'right', width: '16mm' }}>Valor</th>
                      <th style={{ padding: '0.5mm 1mm', textAlign: 'right', width: '16mm' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '0.5pt dotted #ccc' }}>
                        <td style={{ padding: '0.5mm 1mm', fontStyle: 'italic', textTransform: 'uppercase' }}>{item.description}</td>
                        <td style={{ padding: '0.5mm', textAlign: 'center' }}>{item.quantity || 1}</td>
                        <td style={{ padding: '0.5mm 1mm', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                        <td style={{ padding: '0.5mm 1mm', textAlign: 'right' }}>{formatCurrency(lineTotal(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financeiro e Notas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', marginTop: 'auto' }}>
                <div style={{ fontSize: '5pt', fontStyle: 'italic', border: '0.5pt solid #ddd', padding: '1.5mm', borderRadius: '0.5mm' }}>
                  <span style={{ fontWeight: 700, display: 'block', marginBottom: '0.5mm' }}>Obs.:</span>
                  {order.notes || "Sem observações adicionais."}
                </div>

                <div style={{ fontWeight: 700 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5pt solid #999', paddingBottom: '0.5mm', fontSize: '6pt' }}>
                    <span>VALOR TOTAL:</span>
                    <span>{formatCurrency(order.financial.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5pt solid #999', paddingBottom: '0.5mm', color: '#666', fontSize: '5.5pt' }}>
                    <span>ENTRADA:</span>
                    <span>{formatCurrency(order.financial.deposit)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5mm', fontSize: '7pt' }}>
                    <span>SALDO:</span>
                    <span>{formatCurrency(order.financial.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div style={{ display: 'flex', gap: '4mm', marginTop: '1.5mm', fontSize: '5.5pt' }}>
                <div style={{ flex: 1}}>
                  <span style={{ fontWeight: 700 }}>Pedido:</span> {formatDate(order.dates.created)}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>Entrega:</span> {formatDate(order.dates.deadline)}
                </div>
              </div>

              {/* Termos de Retirada */}
              <div style={{ marginTop: '1.5mm', paddingTop: '1mm', borderTop: '0.5pt solid #ccc' }}>
                <p style={{ fontWeight: 700, fontSize: '5pt', marginBottom: '0.5mm' }}>Atenção - Condições de Retirada:</p>
                <ol style={{ fontSize: '4.5pt', color: '#555', paddingLeft: '4mm', margin: 0 }}>
                  <li>Apresentação da OS sem rasuras.</li>
                  <li>Retirada em até 60 dias da data prometida, mediante pagamento.</li>
                  <li>Perda de propriedade após prazo (art. 1263 CC).</li>
                </ol>
              </div>

            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .os-screen-wrapper {
          zoom: 2;
        }
        @media print {
          .os-screen-wrapper { zoom: 1 !important; }
          body { padding: 0; background: white; }
          .print-area { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 5mm !important; filter: grayscale(100%) !important; }
          button { display: none !important; }
          @page { size: A4; margin: 5mm; }
        }
      `}} />
    </div>
  )
}
