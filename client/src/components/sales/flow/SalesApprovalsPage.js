import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { api, useSalesBase, money2, fmtDate, Badge, QUOTE_STATUS_STYLE, btn, ReasonModal } from './salesShared';
import { Loading, PageHead, Card, EmptyNote } from './deskShared';

/**
 * Approvals: quotations whose discount is above the limit in Sales Settings wait here for a
 * manager. Approve or send back with a reason; the salesperson is notified either way.
 */

export default function SalesApprovalsPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [pending, setPending] = useState(null);
  const [recent, setRecent] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, a, d] = await Promise.all([api('/quotations?status=Pending Approval'), api('/quotations?status=Approved'), api('/settings')]);
      setPending(p.quotations); setRecent(a.quotations.filter(x => x.approvalStatus === 'approved').slice(0, 8));
      setCanApprove(d.canEdit); setLimit(d.settings.quotation.discountApprovalPct); setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!pending) return <Loading error={error} />;

  const Row = ({ q, actions }) => (
    <li className="px-4 py-3 flex flex-wrap items-center gap-3">
      <button onClick={() => navigate(`${base}/quotation/${q.id}`)} className="min-w-0 flex-1 text-left cursor-pointer">
        <div className="text-[13px] font-medium truncate">{q.number} · {q.client.name || q.company}{q.subject ? <span className="text-gray-500 font-normal"> · {q.subject}</span> : null}</div>
        <div className="text-[11.5px] text-gray-500">{q.maxDiscountPct}% discount (limit {limit}%) · asked by {q.approvalRequestedBy || q.createdBy || '—'} · {fmtDate(q.updatedAt)}{q.approvalNote ? ` · “${q.approvalNote}”` : ''}</div>
      </button>
      <span className="text-right"><Badge text={q.status} tone={QUOTE_STATUS_STYLE[q.status]} /><span className="block text-[12.5px] tabular-nums font-medium mt-0.5">{money2(q.total)}</span></span>
      {actions}
    </li>
  );

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Approvals" sub={`Quotations with a discount above ${limit}% wait here for a manager. Change the limit in Sales Settings.`} />
      <div className="space-y-4">
        <Card title={`Waiting for approval (${pending.length})`} pad={false}>
          {pending.length === 0 ? <EmptyNote><ShieldCheck size={18} className="mx-auto mb-1 text-gray-300" />Nothing is waiting.</EmptyNote> : (
            <ul className="divide-y divide-gray-100">{pending.map(q => (
              <Row key={q.id} q={q} actions={canApprove ? <div className="flex gap-1.5"><button onClick={() => setModal({ q, approve: true })} className={btn.green}><CheckCircle2 size={13} /> Approve</button><button onClick={() => setModal({ q, approve: false })} className={btn.danger}><XCircle size={13} /> Send back</button></div> : <span className="text-[11.5px] text-gray-500">A manager will review</span>} />
            ))}</ul>
          )}
        </Card>
        <Card title="Recently approved" pad={false}>
          {recent.length === 0 ? <EmptyNote>No approvals yet.</EmptyNote> : <ul className="divide-y divide-gray-100">{recent.map(q => <Row key={q.id} q={q} actions={<span className="text-[11.5px] text-gray-500">by {q.approvedBy}</span>} />)}</ul>}
        </Card>
      </div>
      {modal && <ReasonModal title={modal.approve ? `Approve ${modal.q.number}` : `Send back ${modal.q.number}`} reasonLabel={modal.approve ? 'Note (optional)' : 'What should change?'} confirmText={modal.approve ? 'Approve' : 'Send back'} tone={modal.approve ? 'green' : 'danger'}
        onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/quotations/${modal.q.id}/${modal.approve ? 'approve' : 'reject'}`, { method: 'POST', body: { note: reason } }); setModal(null); load(); }} />}
    </div>
  );
}
