import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { api } from '../../services/api';
import type { Invoice } from '../../types';
import InvoiceModal from '../../components/InvoiceModal';

interface PaymentConfirmationPageProps {
  onNavigate: (page: string) => void;
}

export default function PaymentConfirmationPage({ onNavigate }: PaymentConfirmationPageProps) {
  const [status, setStatus] = useState<'success' | 'cancelled' | 'loading'>('loading');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const bookingIdParam = params.get('booking_id');
    
    if (statusParam === 'success') {
      setStatus('success');
      api.bookings.getInvoices()
        .then(data => setInvoices(data))
        .catch(err => console.error("Error fetching invoice:", err));
    } else if (statusParam === 'cancelled') {
      setStatus('cancelled');
    } else {
      setStatus('success');
    }
    setBookingId(bookingIdParam);
  }, []);

  const currentInvoice = invoices.find(inv => String(inv.id) === bookingId);

  const handlePrint = () => {
    setShowInvoiceModal(true);
  };

  const isCancelledMaxAttempts = error?.includes("annulé") || error?.includes("maximal");

  return (
    <div className="flex-1 bg-neutral-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white border-2 border-neutral-900 rounded-3xl p-8 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] print:shadow-none print:border-none">
        
        {status === 'success' ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 border-2 border-neutral-900 rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">Paiement Réussi !</h2>
              <p className="text-neutral-500 font-semibold">Votre rendez-vous a été officiellement réservé et payé.</p>
            </div>

            {currentInvoice ? (
              <div className="bg-neutral-50 border-2 border-neutral-900 rounded-2xl p-6 text-left space-y-4 max-w-md mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] print:shadow-none">
                <h3 className="font-extrabold text-neutral-900 border-b border-neutral-200 pb-2 uppercase tracking-wide text-xs">
                  Détails de la Facture
                </h3>
                <div className="text-xs space-y-2 font-semibold text-neutral-700">
                  <div className="flex justify-between">
                    <span>Référence :</span>
                    <span className="font-bold text-neutral-900">{currentInvoice.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Établissement :</span>
                    <span className="font-bold text-neutral-900">{currentInvoice.establishment_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date de paiement :</span>
                    <span className="font-bold text-neutral-900">{currentInvoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant :</span>
                    <span className="font-bold text-neutral-900">{currentInvoice.amount}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200">
                    <span className="font-bold text-neutral-900">Statut :</span>
                    <span className="font-bold text-emerald-600">PAYÉ / CONFIRMÉ</span>
                  </div>
                </div>
              </div>
            ) : bookingId && (
              <div className="bg-neutral-50 border-2 border-neutral-900 rounded-2xl p-6 text-left space-y-4 max-w-md mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] print:shadow-none">
                <h3 className="font-extrabold text-neutral-900 border-b border-neutral-200 pb-2 uppercase tracking-wide text-xs">
                  Détails de la Facture
                </h3>
                <div className="text-xs space-y-2 font-semibold text-neutral-700 animate-pulse">
                  Chargement des détails de la facture...
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 print:hidden">
              <Button
                variant="primary"
                onClick={() => onNavigate('profile?tab=bookings')}
                className="w-full sm:w-auto font-black"
              >
                Consulter mes rendez-vous
              </Button>
              
              <button
                onClick={handlePrint}
                disabled={!currentInvoice}
                className="w-full sm:w-auto px-6 py-3 border-2 border-neutral-900 bg-white hover:bg-neutral-50 disabled:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 font-black rounded-xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-sm"
              >
                Imprimer la facture
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-rose-100 border-2 border-neutral-900 rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">
                {isCancelledMaxAttempts ? "Rendez-vous Annulé" : "Paiement Annulé"}
              </h2>
              <p className="text-neutral-500 font-semibold">
                {isCancelledMaxAttempts 
                  ? "Ce rendez-vous a été annulé car le nombre maximal de tentatives de paiement (2) a été atteint."
                  : "Le paiement a été interrompu et le rendez-vous n'a pas été validé."}
              </p>
            </div>

            {error && (
              <div className="max-w-md mx-auto p-4 border-2 border-neutral-900 bg-rose-50 text-rose-900 rounded-xl font-bold text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              {bookingId && !isCancelledMaxAttempts && (
                <button
                  onClick={async () => {
                    try {
                      setError(null);
                      const url = await api.bookings.getCheckoutUrl(Number(bookingId));
                      window.location.assign(url);
                    } catch (err) {
                      console.error(err);
                      setError(err instanceof Error ? err.message : "Impossible de relancer le paiement.");
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 font-black rounded-xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-sm"
                >
                  Réessayer le paiement
                </button>
              )}
              <Button
                variant="primary"
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto font-black"
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}
      </div>

      {showInvoiceModal && currentInvoice && (
        <InvoiceModal 
          invoice={currentInvoice} 
          onClose={() => setShowInvoiceModal(false)} 
        />
      )}
    </div>
  );
}
