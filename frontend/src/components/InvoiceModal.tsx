import type { Invoice } from '../types';

interface InvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-neutral-900 rounded-3xl w-full max-w-3xl flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-neutral-900 flex justify-between items-center bg-violet-50 rounded-t-3xl">
          <h3 className="text-lg font-black text-neutral-900 uppercase">Facture {invoice.reference}</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 border-2 border-neutral-900 bg-white hover:bg-neutral-50 rounded-full flex items-center justify-center font-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1" id="printable-invoice-area">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-invoice-area, #printable-invoice-area * {
                visibility: visible !important;
              }
              #printable-invoice-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 20px !important;
                background: white !important;
              }
            }
          `}</style>
          
          <div className="space-y-8 font-semibold text-neutral-800">
            {/* Invoice Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">TIMELY</h1>
                <p className="text-xs text-neutral-500 font-bold mt-1">Service de Réservation en ligne</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-neutral-900 rounded-md ${
                  invoice.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {invoice.status === 'success' ? 'Payé' : 'En attente'}
                </span>
              </div>
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-2 gap-8 border-t-2 border-b-2 border-neutral-900 py-6">
              <div>
                <p className="text-[10px] uppercase font-black text-neutral-400 mb-1">Émetteur</p>
                <p className="font-extrabold text-neutral-900">{invoice.establishment_name}</p>
                <p className="text-xs text-neutral-500 mt-1">Partenaire vérifié Timely</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-neutral-400 mb-1">Détails Facture</p>
                <p className="text-xs"><strong>Référence :</strong> {invoice.reference}</p>
                <p className="text-xs mt-0.5"><strong>Date :</strong> {invoice.date}</p>
                <p className="text-xs mt-0.5"><strong>TVA :</strong> FR 82 {invoice.id}93848</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-900 text-xs font-black uppercase text-neutral-400">
                    <th className="pb-3">Désignation de la prestation</th>
                    <th className="pb-3 text-right">Qté</th>
                    <th className="pb-3 text-right">Prix HT</th>
                    <th className="pb-3 text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b-2 border-neutral-900">
                  <tr className="text-xs text-neutral-900 font-bold">
                    <td className="py-4">Réservation de prestation de service ({invoice.establishment_name})</td>
                    <td className="py-4 text-right">1</td>
                    <td className="py-4 text-right">{(parseFloat(invoice.amount) / 1.2).toFixed(2)} €</td>
                    <td className="py-4 text-right">{invoice.amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end pt-4">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Sous-total HT :</span>
                  <span>{(parseFloat(invoice.amount) / 1.2).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (20%) :</span>
                  <span>{(parseFloat(invoice.amount) - (parseFloat(invoice.amount) / 1.2)).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between border-t-2 border-neutral-900 pt-2 font-black text-neutral-900 text-sm">
                  <span>Total TTC :</span>
                  <span>{invoice.amount}</span>
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="text-[10px] text-neutral-400 text-center pt-8 border-t border-neutral-100 font-medium">
              Timely est une plateforme technologique facilitant les réservations. La facturation est émise pour le compte et au nom de l'établissement partenaire. Pour toute réclamation, veuillez vous rapprocher de l'établissement concerné.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t-2 border-neutral-900 bg-neutral-50 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-900 font-extrabold rounded-xl transition-all cursor-pointer text-xs"
          >
            Fermer
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
          >
            Imprimer / PDF
          </button>
        </div>

      </div>
    </div>
  );
}
