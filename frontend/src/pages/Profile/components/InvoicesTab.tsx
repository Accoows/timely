import EmptyState from '../../../components/EmptyState';
import type { Invoice } from '../../../types';

interface InvoicesTabProps {
  invoices: Invoice[];
  onNavigate: (page: string) => void;
}

export default function InvoicesTab({ invoices, onNavigate }: InvoicesTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Factures</h2>
      
      {invoices.length === 0 ? (
        <EmptyState
          title="Aucune facture émise"
          description="Toutes vos factures de prestations et d'achats apparaîtront ici dès que vos premiers règlements auront été validés."
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
          actionLabel="Découvrir les établissements"
          onAction={() => onNavigate('home')}
        />
      ) : (
        <div className="overflow-x-auto border-2 border-neutral-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-neutral-950 text-white text-xs font-black uppercase tracking-wider border-b-2 border-neutral-900">
                <th className="p-4">Référence</th>
                <th className="p-4">Établissement</th>
                <th className="p-4">Date</th>
                <th className="p-4">Montant</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-900 text-sm font-bold text-neutral-700">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-neutral-50">
                  <td className="p-4 font-black text-neutral-900">{invoice.reference}</td>
                  <td className="p-4">{invoice.establishment_name}</td>
                  <td className="p-4 font-semibold text-neutral-500">{invoice.date}</td>
                  <td className="p-4 font-black text-neutral-900">{invoice.amount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-neutral-900 rounded ${
                      invoice.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {invoice.status === 'success' ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
