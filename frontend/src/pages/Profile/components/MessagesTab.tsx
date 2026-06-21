import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import Alert from '../../../components/Alert';
import type { Discussion, Message } from '../../../types';

interface MessagesTabProps {
  onNavigate: (page: string) => void;
}

export default function MessagesTab({ onNavigate }: MessagesTabProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch discussions list
  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.messaging.listDiscussions();
      setDiscussions(res.discussions || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des discussions :", err);
      setError("Impossible de charger vos conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscussions();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch messages for active discussion
  const selectDiscussion = async (disc: Discussion) => {
    setActiveDiscussion(disc);
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await api.messaging.listMessages(disc.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des messages :", err);
      setError("Impossible de charger les messages de cette conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send reply message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeDiscussion) return;

    try {
      setSending(true);
      await api.messaging.sendMessage(activeDiscussion.id, replyText.trim());
      setReplyText("");
      // Reload messages
      const res = await api.messaging.listMessages(activeDiscussion.id);
      setMessages(res.messages || []);
      
      // Update discussions list in background to reflect new last message
      const discRes = await api.messaging.listDiscussions();
      setDiscussions(discRes.discussions || []);
    } catch (err) {
      console.error("Erreur lors de l'envoi du message :", err);
      setError("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-10 h-10 border-2 border-neutral-800 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  // Active Discussion chat detail view
  if (activeDiscussion) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3 border-b border-neutral-150 pb-4">
          <button
            onClick={() => {
              setActiveDiscussion(null);
              setMessages([]);
              setError(null);
            }}
            className="text-xs font-bold px-3 py-1.5 border-2 border-neutral-900 bg-white hover:bg-neutral-50 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            ← Retour
          </button>
          <div>
            <h3 
              onClick={() => onNavigate(`establishment/${activeDiscussion.etablissement.id}`)}
              className="font-black text-sm text-neutral-900 hover:text-neutral-600 hover:underline cursor-pointer transition-colors"
            >
              {activeDiscussion.etablissement?.nom}
            </h3>
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Discussion ouverte le {new Date(activeDiscussion.date_creation).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        {loadingMessages ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-neutral-800 border-t-transparent animate-spin rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col h-[400px] border-2 border-neutral-900 rounded-2xl overflow-hidden bg-neutral-50/40">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  // If msg.sender matches client username or matches typical client properties
                  const isMe = msg.sender.username !== activeDiscussion.etablissement.nom && !msg.sender.username.includes('gerant');
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                        isMe 
                          ? 'bg-neutral-900 text-white rounded-tr-none' 
                          : 'bg-white text-neutral-850 border border-neutral-200/80 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-neutral-400 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 text-xs font-semibold">
                  Aucun message dans cette conversation.
                </div>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="bg-white border-t-2 border-neutral-900 p-3 flex gap-3 items-center">
              <input
                type="text"
                placeholder="Écrivez votre message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-850 focus:outline-none focus:border-neutral-900"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-all select-none cursor-pointer border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Discussions list view
  return (
    <div className="space-y-6 animate-fadeIn">
      {error && <Alert type="error" message={error} />}

      {discussions.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50/50 rounded-2xl border-2 border-dashed border-neutral-200 p-6">
          <p className="text-neutral-400 font-semibold text-sm">Aucune conversation en cours.</p>
          <p className="text-neutral-400 text-xs mt-1">
            Vous pouvez poser des questions aux établissements depuis leurs fiches détaillées.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((disc) => (
            <div
              key={disc.id}
              onClick={() => selectDiscussion(disc)}
              className="bg-white border-2 border-neutral-900 rounded-2xl p-5 hover:bg-neutral-50/40 transition-all cursor-pointer flex justify-between items-center group shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex-1 pr-6">
                <h4 className="font-extrabold text-sm text-neutral-900">
                  {disc.etablissement?.nom}
                </h4>
                <p className="text-xs text-neutral-450 font-medium truncate mt-1 max-w-md">
                  {disc.last_message ? disc.last_message.content : "Aucun message envoyé."}
                </p>
              </div>
              
              <div className="text-right shrink-0">
                <span className="text-[10px] text-neutral-400 font-semibold block mb-2">
                  {disc.last_message ? new Date(disc.last_message.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : new Date(disc.date_creation).toLocaleDateString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-neutral-900 group-hover:underline">
                  Ouvrir →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
