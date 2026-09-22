import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Clock, DollarSign, Coins, Loader, RotateCcw, MessageSquare, Send } from 'lucide-react';

interface PaymentRequest {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  nxAmount: number;
  dollarAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  proofImageBase64?: string;
}

interface RefundRequest {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  productId: number;
  productName: string;
  nxPaid: number;
  nxCommission: number;
  nxToRefund: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  rejectedAt?: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  username: string;
  NickName: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface TicketMessage {
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

export default function AdminPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [approvingRefund, setApprovingRefund] = useState<number | null>(null);
  const [rejectingRefund, setRejectingRefund] = useState<number | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'refunds' | 'tickets'>('payments');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadData();
    
    // Recargar cada 10 segundos
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentData, refundData, ticketData] = await Promise.all([
        api.getPendingPayments(),
        api.getPendingRefunds(),
        api.getAllTickets(),
      ]);
      setPayments(paymentData || []);
      setRefunds(refundData || []);
      setSupportTickets(ticketData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: number) => {
    if (!profile?.username) return;
    try {
      setApproving(paymentId);
      const result = await api.approvePayment(paymentId, profile.username);
      if (result.success) {
        alert(`✅ Aprobado: ${result.message}`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    if (!profile?.username) return;
    try {
      const reason = prompt('¿Razón del rechazo?');
      if (reason === null) return;
      
      setRejecting(paymentId);
      const result = await api.rejectPayment(paymentId, profile.username, reason);
      if (result.success) {
        alert(`❌ Rechazado`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejecting(null);
    }
  };

  const handleApproveRefund = async (refundId: number) => {
    if (!profile?.username) return;
    try {
      setApprovingRefund(refundId);
      const result = await api.approveRefund(refundId, profile.username);
      if (result.success) {
        alert(`✅ Reembolso aprobado\n${result.message}\n\nNX devuelto: ${result.details.nxRefunded}`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApprovingRefund(null);
    }
  };

  const handleRejectRefund = async (refundId: number) => {
    if (!profile?.username) return;
    try {
      const reason = prompt('¿Razón del rechazo?');
      if (reason === null) return;
      
      setRejectingRefund(refundId);
      const result = await api.rejectRefund(refundId, profile.username, reason);
      if (result.success) {
        alert(`❌ Reembolso rechazado`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejectingRefund(null);
    }
  };

  const loadTicketDetail = async (ticketId: number) => {
    try {
      setLoadingTicket(true);
      const data = await api.getTicketDetails(ticketId);
      setSelectedTicket(data.ticket);
      setTicketMessages(data.messages);
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleSendTicketMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !profile?.username) return;

    try {
      setSendingMessage(true);
      await api.sendTicketMessage(
        selectedTicket.id,
        'admin',
        profile.username,
        newMessage
      );

      setNewMessage('');
      await loadTicketDetail(selectedTicket.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, newStatus: string) => {
    if (!profile?.username) return;

    try {
      setUpdatingStatus(ticketId);
      await api.updateTicketStatus(ticketId, newStatus, profile.username);
      
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
      await loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Solo sebasadmin puede ver esto
  if (profile?.username !== 'sebasadmin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-red-400">Acceso Denegado</h2>
          <p className="mt-2 text-slate-400">Solo administradores pueden acceder a este panel</p>
        </div>
      </div>
    );
  }

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const totalNX = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.nxAmount, 0);
  const totalDollars = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.dollarAmount, 0);
  
  const pendingRefunds = refunds.filter(p => p.status === 'pending');
  const totalRefundNX = pendingRefunds.reduce((sum, p) => sum + p.nxPaid, 0);
  const totalRefundCommission = pendingRefunds.reduce((sum, p) => sum + p.nxCommission, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Panel de Administración</h1>
        <p className="mt-1 text-slate-400">Gestiona solicitudes de recargas y reembolsos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          💳 Recargas ({payments.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === 'refunds'
              ? 'border-orange-400 text-orange-300'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          ↩️ Reembolsos ({refunds.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === 'tickets'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          🎫 Tickets de Soporte ({supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length})
        </button>
      </div>

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-orange-900/30 via-[#0d1320] to-red-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">SOLICITUDES PENDIENTES</p>
                  <p className="text-4xl font-black text-orange-400">{pendingCount}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-pink-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">NX TOTAL PENDIENTE</p>
                  <p className="text-4xl font-black text-purple-400">{totalNX.toLocaleString()}</p>
                </div>
                <Coins className="h-12 w-12 text-purple-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-900/30 via-[#0d1320] to-green-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">DINERO PENDIENTE</p>
                  <p className="text-4xl font-black text-emerald-400">${totalDollars.toFixed(2)}</p>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-400 opacity-20" />
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h2 className="mb-6 text-lg font-bold">Solicitudes Pendientes</h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-cyan-400" />
              </div>
            ) : payments.filter(p => p.status === 'pending').length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-500">
                <p>No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.filter(p => p.status === 'pending').map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-white">{payment.NickName}</p>
                          <p className="text-xs text-slate-400">{payment.username}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">NX: <span className="text-purple-400 font-semibold">{payment.nxAmount.toLocaleString()}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">Precio: <span className="text-emerald-400 font-semibold">${payment.dollarAmount.toFixed(2)}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">Fecha: <span className="text-slate-300 font-semibold">{new Date(payment.createdAt).toLocaleString('es')}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(payment.id)}
                        disabled={approving === payment.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50 font-semibold whitespace-nowrap"
                      >
                        {approving === payment.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Aprobar
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleReject(payment.id)}
                        disabled={rejecting === payment.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 font-semibold whitespace-nowrap"
                      >
                        {rejecting === payment.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Rechazando...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REFUNDS TAB */}
      {activeTab === 'refunds' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-orange-900/30 via-[#0d1320] to-red-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">REEMBOLSOS PENDIENTES</p>
                  <p className="text-4xl font-black text-orange-400">{pendingRefunds.length}</p>
                </div>
                <RotateCcw className="h-12 w-12 text-orange-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-pink-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">NX A DEVOLVER</p>
                  <p className="text-4xl font-black text-purple-400">{totalRefundNX.toLocaleString()}</p>
                </div>
                <Coins className="h-12 w-12 text-purple-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-900/30 via-[#0d1320] to-blue-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">COMISIÓN (10%)</p>
                  <p className="text-4xl font-black text-cyan-400">{totalRefundCommission.toLocaleString()}</p>
                </div>
                <DollarSign className="h-12 w-12 text-cyan-400 opacity-20" />
              </div>
            </div>
          </div>

          {/* Refunds Table */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h2 className="mb-6 text-lg font-bold">Solicitudes de Reembolso Pendientes</h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-cyan-400" />
              </div>
            ) : pendingRefunds.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-500">
                <p>No hay solicitudes de reembolso pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRefunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-white">{refund.NickName}</p>
                          <p className="text-xs text-slate-400">{refund.username}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-sm flex-wrap">
                        <div>
                          <p className="text-slate-400">Producto: <span className="text-white font-semibold">{refund.productName}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">NX Pagado: <span className="text-orange-400 font-semibold">{refund.nxPaid}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">Comisión (10%): <span className="text-red-400 font-semibold">-{refund.nxCommission}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">A Devolver: <span className="text-emerald-400 font-semibold">{refund.nxToRefund}</span></p>
                        </div>
                        <div>
                          <p className="text-slate-400">Fecha: <span className="text-slate-300 font-semibold">{new Date(refund.createdAt).toLocaleString('es')}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveRefund(refund.id)}
                        disabled={approvingRefund === refund.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50 font-semibold whitespace-nowrap"
                      >
                        {approvingRefund === refund.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Aprobar
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleRejectRefund(refund.id)}
                        disabled={rejectingRefund === refund.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 font-semibold whitespace-nowrap"
                      >
                        {rejectingRefund === refund.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Rechazando...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-pink-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">TICKETS ABIERTOS</p>
                  <p className="text-4xl font-black text-purple-400">{supportTickets.filter(t => t.status === 'open').length}</p>
                </div>
                <MessageSquare className="h-12 w-12 text-purple-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-orange-900/30 via-[#0d1320] to-red-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">EN PROGRESO</p>
                  <p className="text-4xl font-black text-orange-400">{supportTickets.filter(t => t.status === 'in-progress').length}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-400 opacity-20" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-900/30 via-[#0d1320] to-green-900/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">TOTAL TICKETS</p>
                  <p className="text-4xl font-black text-emerald-400">{supportTickets.length}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-emerald-400 opacity-20" />
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de tickets */}
            <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
              <h2 className="mb-6 text-lg font-bold">Tickets Pendientes</h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length === 0 ? (
                <div className="flex h-32 items-center justify-center text-slate-500">
                  <p className="text-center">No hay tickets pendientes</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {supportTickets
                    .filter(t => t.status === 'open' || t.status === 'in-progress')
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => loadTicketDetail(ticket.id)}
                        className={`w-full text-left rounded-xl border p-3 transition ${
                          selectedTicket?.id === ticket.id
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                        <p className="text-xs text-slate-400 mt-1">#{ticket.ticketNumber}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            ticket.status === 'open'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {ticket.status === 'open' ? 'Abierto' : 'En progreso'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(ticket.updatedAt).toLocaleDateString('es')}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Detalle del ticket */}
            {selectedTicket ? (
              <div className="lg:col-span-2 space-y-6">
                {/* Info del ticket */}
                <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-black text-white">{selectedTicket.subject}</h2>
                      <p className="text-xs text-slate-400 mt-1">#{selectedTicket.ticketNumber}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-300">{selectedTicket.username} ({selectedTicket.NickName})</p>
                    <p className="text-sm text-slate-400 mt-2">
                      Creado: {new Date(selectedTicket.createdAt).toLocaleDateString('es')}
                    </p>
                  </div>

                  {/* Estado */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-400 mb-2">Estado</p>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                      disabled={updatingStatus === selectedTicket.id}
                      className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    >
                      <option value="open">Abierto</option>
                      <option value="in-progress">En progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>
                </div>

                {/* Mensajes */}
                <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
                  <h3 className="mb-4 text-lg font-bold">Conversación</h3>

                  {loadingTicket ? (
                    <div className="flex justify-center py-8">
                      <Loader className="h-8 w-8 animate-spin text-purple-400" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-64 overflow-y-auto mb-4 p-4 rounded-lg bg-white/5">
                        {ticketMessages.length === 0 ? (
                          <p className="text-center text-slate-500 py-8">No hay mensajes aún</p>
                        ) : (
                          ticketMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs rounded-lg p-3 ${
                                  msg.senderType === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-slate-500/20 text-slate-300'
                                }`}
                              >
                                <p className="text-xs font-semibold mb-1">{msg.senderUsername} {msg.senderType === 'admin' ? '(Admin)' : ''}</p>
                                <p className="text-sm">{msg.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.createdAt).toLocaleTimeString('es')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Enviar mensaje */}
                      {selectedTicket.status !== 'closed' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendTicketMessage()}
                            placeholder="Escribe tu respuesta..."
                            className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                            disabled={sendingMessage}
                          />
                          <button
                            onClick={handleSendTicketMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            className="rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition disabled:opacity-50 px-4 py-2 font-semibold flex items-center gap-2"
                          >
                            {sendingMessage ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </button>
                        </div>
                      )}

                      {selectedTicket.status === 'closed' && (
                        <p className="text-center text-slate-500 text-sm">Este ticket está cerrado</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0d1320] p-6 flex items-center justify-center h-96">
                <p className="text-slate-500">Selecciona un ticket para ver los detalles</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
