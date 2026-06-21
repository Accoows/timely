import { useState } from 'react';
import type { Invoice } from '../types';

/**
 * Propriétés du modal de facture.
 */
interface InvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

/**
 * Composant d'affichage d'une facture sous forme de modale (fenêtre superposée).
 * Permet de visualiser les détails de la transaction, d'imprimer ou de télécharger la facture en PDF.
 */
export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const element = document.getElementById('printable-invoice-area');
      if (!element) {
        setIsGenerating(false);
        return;
      }

      // Création d'une iframe invisible (fenêtre encapsulée) pour isoler le rendu de la facture.
      iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '800px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        throw new Error("Impossible d'accéder au document de l'iframe.");
      }

      // Écriture d'un CSS standard, basique et sans framework (vanilla CSS).
      doc.write(`
        <html>
          <head>
            <title>Facture ${invoice.reference}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                color: #1f2937;
                padding: 40px;
                background: #ffffff;
              }
              .space-y-8 > * + * { margin-top: 32px; }
              .space-y-2 > * + * { margin-top: 8px; }
              .text-3xl { font-size: 1.875rem; font-weight: 900; text-transform: uppercase; }
              .text-xs { font-size: 0.75rem; color: #6b7280; }
              .text-sm { font-size: 0.875rem; }
              .font-bold { font-weight: 700; }
              .font-extrabold { font-weight: 800; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .justify-end { display: flex; justify-content: flex-end; }
              .items-start { align-items: flex-start; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr; }
              .gap-4 { gap: 16px; }
              .gap-8 { gap: 32px; }
              .border-t { border-top: 1px solid #e5e7eb; }
              .border-t-2 { border-top: 2px solid #111827; }
              .border-b-2 { border-bottom: 2px solid #111827; }
              .border-neutral-100 { border-color: #f3f4f6; }
              .py-6 { padding-top: 24px; padding-bottom: 24px; }
              .py-4 { padding-top: 16px; padding-bottom: 16px; }
              .pb-3 { padding-bottom: 12px; }
              .pt-8 { padding-top: 32px; }
              .pt-4 { padding-top: 16px; }
              .pt-2 { padding-top: 8px; }
              .mt-1 { margin-top: 4px; }
              .mt-0.5 { margin-top: 2px; }
              .mb-1 { margin-bottom: 4px; }
              .w-full { width: 100%; }
              .w-64 { width: 256px; }
              .border-collapse { border-collapse: collapse; }
              th, td {
                padding: 16px 8px;
                text-align: left;
                font-size: 0.75rem;
              }
              th.text-right, td.text-right {
                text-align: right;
              }
              th:first-child, td:first-child {
                padding-left: 0;
                width: 55%;
              }
              th:nth-child(2), td:nth-child(2) {
                width: 10%;
              }
              th:nth-child(3), td:nth-child(3) {
                width: 15%;
              }
              th:last-child, td:last-child {
                padding-right: 0;
                width: 20%;
              }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .divide-y tr { border-bottom: 1px solid #e5e7eb; }
              .text-emerald-900 { color: #064e3b; }
              .bg-emerald-100 { background-color: #d1fae5; }
              .text-blue-900 { color: #1e3a8a; }
              .bg-blue-100 { background-color: #dbeafe; }
              .text-amber-900 { color: #78350f; }
              .bg-amber-100 { background-color: #fef3c7; }
              .text-neutral-400 { color: #9ca3af; }
              .text-neutral-900 { color: #111827; }
              .border-2 { border: 2px solid #111827; }
              .rounded-md { border-radius: 6px; }
              .px-3 { padding-left: 12px; padding-right: 12px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .tracking-tight { letter-spacing: -0.025em; }
            </style>
          </head>
          <body>
            <div id="pdf-content">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        throw new Error("Impossible d'accéder à la fenêtre de l'iframe.");
      }

      // Injection asynchrone du script html2pdf directement dans le contexte de l'iframe.
      await new Promise<void>((resolve, reject) => {
        const script = doc.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Impossible de charger la bibliothèque dans l'iframe."));
        doc.head.appendChild(script);
      });

      const pdfContent = doc.getElementById('pdf-content');
      if (!pdfContent) {
        throw new Error("Le contenu du PDF n'a pas été trouvé dans l'iframe.");
      }

      interface Html2PdfInstance {
        set: (opt: unknown) => {
          from: (el: HTMLElement) => {
            output: (type: 'blob') => Promise<Blob>;
          };
        };
      }

      const iframeHtml2pdf = (iframeWindow as unknown as { html2pdf?: () => Html2PdfInstance }).html2pdf;
      if (!iframeHtml2pdf) {
        throw new Error("La bibliothèque de génération PDF n'a pas pu être initialisée.");
      }

      // Configuration précise de la librairie html2pdf :
      // - format A4, pas de bordures, qualité d'image maximale.
      const opt = {
        margin:       0.3,
        filename:     `Facture-${invoice.reference}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, logging: false, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // On génère d'abord le PDF sous forme de fichier binaire brut (Blob).
      // Si on essayait de le télécharger directement depuis l'iframe, le navigateur
      // bloquerait l'action pour des raisons de sécurité.
      const pdfBlob = await iframeHtml2pdf().set(opt).from(pdfContent).output('blob');

      // On crée un lien virtuel dans la fenêtre parente (qui a les droits),
      // on l'associe au fichier Blob généré, et on simule un clic pour lancer le téléchargement.
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Facture-${invoice.reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (err: unknown) {
      console.error("PDF download error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert("Erreur lors de la génération du PDF : " + errorMessage);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setIsGenerating(false);
    }
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

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1">
          <div className="space-y-8 font-semibold text-neutral-800" id="printable-invoice-area">
            {/* Invoice Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">TIMELY</h1>
                <p className="text-xs text-neutral-500 font-bold mt-1">Service de Réservation en ligne</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-neutral-900 rounded-md ${
                  invoice.status === 'success' ? 'bg-emerald-100 text-emerald-900' :
                  invoice.status === 'refunded' ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {invoice.status === 'success' ? 'Payé' :
                   invoice.status === 'refunded' ? 'Remboursé' : 'En attente'}
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
              Timely est une plateforme technologique facilitant les réservations. La facturation émise pour le compte et au nom de l'établissement partenaire. Pour toute réclamation, veuillez vous rapprocher de l'établissement concerné.
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
            className="px-4 py-2 border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-900 font-extrabold rounded-xl transition-all cursor-pointer text-xs"
          >
            Imprimer
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="px-4 py-2 border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-600 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Génération...
              </>
            ) : (
              'Télécharger PDF'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
