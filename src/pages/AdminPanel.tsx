import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Clock, DollarSign, Coins, Loader } from 'lucide-react';

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
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!profile) return;
    loadPayments();
    
    // Recargar cada 10 segundos
    const interval = setInterval(loadPayments, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingPayments();
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
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
        await loadPayments();
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
      setRejecting(paymentId);
      const result = await api.rejectPayment(paymentId, profile.username, rejectReason);
      if (result.success) {
        alert(`❌ Rechazado`);
        setRejectReason('');
        await loadPayments();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejecting(null);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Panel de Administración</h1>
        <p className="mt-1 text-slate-400">Gestiona solicitudes de recargas de NX</p>
      </div>

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
        ) : payments.length === 0 ? (
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
                    onClick={() => {
                      const reason = prompt('¿Razón del rechazo?');
                      if (reason !== null) {
                        setRejectReason(reason);
                        handleReject(payment.id);
                      }
                    }}
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
    </div>
  );
}
