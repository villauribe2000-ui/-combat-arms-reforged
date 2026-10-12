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
    const badges: Record<string, { cls: string; label: string }> = {
      open: { cls: 'support-badge support-badge-open', label: 'Abierto' },
      'in-progress': { cls: 'support-badge support-badge-progress', label: 'En progreso' },
      resolved: { cls: 'support-badge support-badge-resolved', label: 'Resuelto' },
      closed: { cls: 'support-badge support-badge-closed', label: 'Cerrado' },
    };
    const badge = badges[status] || badges.open;
    return <span className={badge.cls}>{badge.label}</span>;
  };

  if (!profile?.username) return null;

  return (
    <main className="inner-page page-width support-page">
      <div className="support-toasts">
        {toasts.map(toast => (
          <div key={toast.id} className={`support-toast support-toast-${toast.type}`}>
            <h3>{toast.title}</h3>
            <p>{toast.message}</p>
          </div>
        ))}
      </div>

      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PLAYER SUPPORT</p>
          <h1>SUPPORT CENTER.</h1>
          <p className="page-heading-description">
            Abre un ticket y el equipo te responde aquí. Los reembolsos y problemas de cuenta se atienden por este canal.
          </p>
        </div>
        <div className="page-heading-aside">
          <button type="button" className="support-new" onClick={() => setShowNewTicketModal(true)}>
            <Plus size={16} /> Nuevo ticket
          </button>
        </div>
      </header>

      {!selectedTicket ? (
        <section className="support-board">
          <div className="support-toolbar">
            <div className="support-board-title">
              <MessageSquare size={20} />
              <h2>MY TICKETS</h2>
            </div>
          </div>
          {loading ? (
            <div className="support-empty">
              <Loader className="mx-auto h-8 w-8 animate-spin" />
              <h3>LOADING</h3>
              <p>Cargando tus tickets.</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="support-empty">
              <MessageSquare className="mx-auto h-8 w-8" />
              <h3>NO TICKETS YET</h3>
              <p>No tienes tickets abiertos. Crea uno para hablar con soporte.</p>
            </div>
          ) : (
            <div className="support-list">
              {tickets.map(ticket => (
                <button key={ticket.id} type="button" className="support-ticket" onClick={() => loadTicketDetail(ticket.id)}>
                  <strong>{ticket.subject}</strong>
                  <small>#{ticket.ticketNumber}</small>
                  <div className="support-ticket-meta">
                    {getStatusBadge(ticket.status)}
                    <span>{new Date(ticket.createdAt).toLocaleDateString('es')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="support-layout">
          <aside className="support-board">
            <div className="support-toolbar">
              <div className="support-board-title"><h2>TICKETS</h2></div>
            </div>
            <div className="support-list">
              {tickets.map(ticket => (
                <button
                  key={ticket.id}
                  type="button"
                  className={`support-ticket${selectedTicket.id === ticket.id ? ' support-ticket-active' : ''}`}
                  onClick={() => loadTicketDetail(ticket.id)}
                >
                  <strong>{ticket.subject}</strong>
                  <small>#{ticket.ticketNumber}</small>
                </button>
              ))}
            </div>
          </aside>
          <div>
            <section className="support-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2>{selectedTicket.subject}</h2>
                  <p>#{selectedTicket.ticketNumber}</p>
                </div>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <p style={{ marginTop: 14 }}>{selectedTicket.description}</p>
              <div className="support-kv"><span>Creado</span><strong>{new Date(selectedTicket.createdAt).toLocaleDateString('es')}</strong></div>
              <div className="support-kv"><span>Actualizado</span><strong>{new Date(selectedTicket.updatedAt).toLocaleDateString('es')}</strong></div>
            </section>
            <section className="support-panel" style={{ marginTop: 12 }}>
              <h2 style={{ fontSize: 22 }}>Conversación</h2>
              <div className="support-thread">
                {messages.length === 0 ? (
                  <p>No hay mensajes aún.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`support-msg${msg.senderType === 'user' ? ' support-msg-user' : ''}`}>
                      <b>{msg.senderUsername}</b>
                      <p>{msg.message}</p>
                      <span>{new Date(msg.createdAt).toLocaleTimeString('es')}</span>
                    </div>
                  ))
                )}
              </div>
              {selectedTicket.status !== 'closed' ? (
                <div className="support-compose">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu respuesta..."
                    disabled={sending}
                  />
                  <button type="button" className="support-send" onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                    {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              ) : (
                <p>Este ticket está cerrado.</p>
              )}
            </section>
            <button
              type="button"
              className="support-back"
              onClick={() => { setSelectedTicket(null); setMessages([]); }}
            >
              Volver a tickets
            </button>
          </div>
        </div>
      )}

      <div className="support-notes">
        <p>Los tickets quedan en tu cuenta. Un administrador responde desde el panel.</p>
        <p>PLAYER SUPPORT / COMBAT ARMS EVOLUTION</p>
      </div>

      {showNewTicketModal && (
        <div className="support-modal-back">
          <div className="support-modal">
            <h2>NUEVO TICKET.</h2>
            <div className="support-field">
              <label>Asunto</label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Ej: Problema con reembolso"
              />
            </div>
            <div className="support-field">
              <label>Descripción</label>
              <textarea
                value={newTicket.description}
                onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Describe tu problema con detalle..."
              />
            </div>
            <div className="support-actions">
              <button type="button" className="support-btn" onClick={() => setShowNewTicketModal(false)}>Cancelar</button>
              <button type="button" className="support-btn support-btn-primary" onClick={handleCreateTicket} disabled={sending}>
                {sending ? 'Creando...' : 'Crear ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
