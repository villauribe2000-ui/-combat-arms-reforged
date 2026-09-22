import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Send, Loader, AlertCircle, CheckCircle, XCircle, MessageSquare, Plus } from 'lucide-react';

interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: string;
  createdAt: string;
}

interface TicketDetail extends Ticket {
  description: string;
  NickName: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface Message {
  id: number;
  senderType: 'user' | 'admin';
  senderUsername: string;
  message: string;
  createdAt: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export default function SupportPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!profile?.username) return;
    loadTickets();
  }, [profile?.username]);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string, duration = 6000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, title, message, duration };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getUserTickets(profile?.username || '');
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      showToast('error', 'Error', 'No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: number) => {
    try {
      const data = await api.getTicketDetails(ticketId);
      setSelectedTicket(data.ticket);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading ticket detail:', error);
      showToast('error', 'Error', 'No se pudo cargar el ticket');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) {
      showToast('error', 'Error', 'El asunto es requerido');
      return;
    }

    try {
      setSending(true);
      const result = await api.createSupportTicket(
        profile?.id || 0,
        profile?.username || '',
        profile?.NickName || profile?.username || '',
        newTicket.subject,
        newTicket.description
      );

      if (result.success) {
        showToast('success', 'Ticket creado', `Ticket ${result.ticketNumber} creado exitosamente`);
        setNewTicket({ subject: '', description: '' });
        setShowNewTicketModal(false);
        await loadTickets();
      }
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al crear ticket');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      setSending(true);
      await api.sendTicketMessage(
        selectedTicket.id,
        'user',
        profile?.username || '',
        newMessage
      );

      showToast('success', 'Mensaje enviado', 'Tu respuesta ha sido enviada');
      setNewMessage('');
      await loadTicketDetail(selectedTicket.id);
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      open: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Abierto' },
      'in-progress': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'En progreso' },
      resolved: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Resuelto' },
      closed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cerrado' },
    };
    const badge = badges[status] || badges.open;
    return (
      <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-semibold`}>
        {badge.label}
      </span>
    );
  };

  if (!profile?.username) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-400">Inicia sesión</h2>
          <p className="mt-2 text-slate-500">Necesitas iniciar sesión para acceder al soporte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-2xl border backdrop-blur-sm p-4 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300 ${
              toast.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-cyan-500/30 bg-cyan-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {toast.type === 'info' && <AlertCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />}
              
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  toast.type === 'success' ? 'text-emerald-300' :
                  toast.type === 'error' ? 'text-red-300' :
                  'text-cyan-300'
                }`}>
                  {toast.title}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-300 transition"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Centro de Soporte</h1>
          <p className="mt-1 text-slate-400">Aquí puedes contactar con soporte</p>
        </div>
        <button
          onClick={() => setShowNewTicketModal(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition font-semibold"
        >
          <Plus className="h-5 w-5" />
          Nuevo Ticket
        </button>
      </div>

      {/* Content */}
      {!selectedTicket ? (
        <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
          <h2 className="mb-6 text-lg font-bold">Mis Tickets</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-slate-500">
              <MessageSquare className="h-12 w-12 opacity-50 mb-2" />
              <p>No tienes tickets abiertos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => loadTicketDetail(ticket.id)}
                  className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-white">{ticket.subject}</p>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-slate-400">#{ticket.ticketNumber}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString('es')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de tickets */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h3 className="mb-4 text-lg font-bold">Mis Tickets</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => loadTicketDetail(ticket.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    selectedTicket.id === ticket.id
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                  <p className="text-xs text-slate-400 mt-1">#{ticket.ticketNumber}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detalle del ticket y mensajes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del ticket */}
            <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedTicket.subject}</h2>
                  <p className="text-xs text-slate-400 mt-1">#{selectedTicket.ticketNumber}</p>
                </div>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="text-sm text-slate-400 mb-4 pb-4 border-b border-white/10">
                <p>{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Creado</p>
                  <p className="text-slate-300">{new Date(selectedTicket.createdAt).toLocaleDateString('es')}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Actualizado</p>
                  <p className="text-slate-300">{new Date(selectedTicket.updatedAt).toLocaleDateString('es')}</p>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
              <h3 className="mb-4 text-lg font-bold">Conversación</h3>

              <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-4 rounded-lg bg-white/5">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay mensajes aún</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg p-3 ${
                          msg.senderType === 'user'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1">{msg.senderUsername}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString('es')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Nuevo mensaje */}
              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu respuesta..."
                    className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition disabled:opacity-50 px-4 py-2 font-semibold flex items-center gap-2"
                  >
                    {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <p className="text-center text-slate-500 text-sm">Este ticket está cerrado</p>
              )}
            </div>

            {/* Botón volver */}
            <button
              onClick={() => {
                setSelectedTicket(null);
                setMessages([]);
              }}
              className="w-full rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition py-2 font-semibold"
            >
              Volver a tickets
            </button>
          </div>
        </div>
      )}

      {/* Modal Nuevo Ticket */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-md w-full p-6">
            <h2 className="text-2xl font-black text-cyan-400 mb-6">Nuevo Ticket</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Asunto</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Ej: Problema con reembolso"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Descripción</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Describe tu problema con detalle..."
                  rows={4}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition py-2 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={sending}
                  className="flex-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition py-2 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
