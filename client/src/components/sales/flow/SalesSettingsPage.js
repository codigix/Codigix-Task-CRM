import React, { useEffect, useState } from 'react';
import { Loader2, Save, Eye } from 'lucide-react';
import { api, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import ServicesEditor from './ServicesEditor';
import ProposalSettings from './ProposalSettings';

/** Letterhead, GST, bank details, quotation and invoice defaults, commission and the client email text. */
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry'];

// Outside the page component so inputs keep focus while typing.
const Card = ({ title, children }) => <div className="bg-white border border-gray-200 rounded p-4"><div className="text-[13px] font-semibold mb-3">{title}</div><div className="grid md:grid-cols-2 gap-3">{children}</div></div>;

export default function SalesSettingsPage() {
  const [s, setS] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/settings').then(d => { setS(d.settings); setCanEdit(d.canEdit); }).catch(e => setError(e.message)); }, []);
  const set = (group, k, v) => setS(x => ({ ...x, [group]: { ...x[group], [k]: v } }));
  const save = async () => {
    setSaving(true); setError(''); setMsg('');
    try { const d = await api('/settings', { method: 'PUT', body: { settings: s } }); setS(d.settings); setMsg('Saved. New PDFs and emails use these details.'); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  if (!s) return <div className="min-h-[60vh] flex items-center justify-center">{error ? <span className="text-sm text-red-700">{error}</span> : <Loader2 className="animate-spin text-gray-400" size={18} />}</div>;
  const field = (group, k, l, opts = {}) => (
    <div className={opts.wide ? 'md:col-span-2' : ''}>
      <label className={labelCls}>{l}</label>
      {opts.textarea ? <textarea disabled={!canEdit} value={s[group][k] ?? ''} onChange={e => set(group, k, e.target.value)} rows={opts.rows || 3} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50" />
        : opts.options ? <select disabled={!canEdit} value={s[group][k] ?? ''} onChange={e => set(group, k, e.target.value)} className={`${inputCls} disabled:bg-gray-50`}><option value="">—</option>{opts.options.map(o => <option key={o}>{o}</option>)}</select>
          : <input disabled={!canEdit} value={s[group][k] ?? ''} onChange={e => set(group, k, opts.upper ? e.target.value.toUpperCase() : e.target.value)} className={`${inputCls} disabled:bg-gray-50`} />}
      {opts.hint && <p className="text-[11px] text-gray-500 mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold">Sales settings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Printed on every quotation and invoice PDF, and used in client emails.{!canEdit && ' Only managers can change these.'}</p>
        </div>
        {canEdit && <button onClick={save} disabled={saving} className={btn.primary}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save settings</button>}
      </div>
      {msg && <div className="mb-3 text-[13px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">{msg}</div>}
      <ErrorNote text={error} />
      <div className="space-y-4 mt-2">
        <Card title="Company (letterhead)">
          {field('company', 'name', 'Company name')}{field('company', 'website', 'Website')}
          {field('company', 'address', 'Address', { wide: true, textarea: true, rows: 2 })}
          {field('company', 'phone', 'Phone')}{field('company', 'email', 'Email')}
          {field('company', 'gstin', 'GSTIN', { upper: true, hint: '15 characters, e.g. 27ABCDE1234F1Z5' })}{field('company', 'pan', 'PAN', { upper: true })}
          {field('company', 'state', 'State (place of business)', { options: STATES, hint: 'Clients in another state are charged IGST; same state CGST + SGST.' })}
        </Card>
        <Card title="Bank details (printed for payment)">
          {field('bank', 'name', 'Bank name')}{field('bank', 'accountName', 'Account name')}
          {field('bank', 'account', 'Account number')}{field('bank', 'ifsc', 'IFSC', { upper: true })}
          {field('bank', 'branch', 'Branch')}{field('bank', 'upi', 'UPI ID')}
        </Card>
        <Card title="Quotations">
          {field('quotation', 'prefix', 'Number prefix', { hint: 'Numbers look like QT-2026-0001; revisions keep the number with v2, v3…' })}
          {field('quotation', 'validityDays', 'Valid for (days)')}
          {field('quotation', 'defaultTaxPct', 'Default GST %')}
          {field('quotation', 'discountApprovalPct', 'Discounts above this % need a manager', { hint: 'Applies to the whole quotation and to any single line.' })}
          {field('quotation', 'signatory', 'Signatory line')}
          {field('quotation', 'terms', 'Rules for a simple quotation', { wide: true, textarea: true, rows: 5 })}
          {field('quotation', 'termsRetainer', 'Rules for a monthly retainer (digital marketing)', { wide: true, textarea: true, rows: 10, hint: 'Printed on every retainer quotation: billing, quota, ad spend, results, notice period.' })}
          {field('quotation', 'termsProject', 'Rules for a project (software / IT)', { wide: true, textarea: true, rows: 12, hint: 'Printed on every project quotation: milestones, change requests, UAT, warranty, ownership, third-party costs.' })}
        </Card>
        <ProposalSettings s={s} setS={setS} canEdit={canEdit} />
        <ServicesEditor services={s.services || []} canEdit={canEdit} onChange={(services) => setS(x => ({ ...x, services }))} />
        <Card title="Invoices">
          {field('invoice', 'prefix', 'Number prefix', { hint: 'Numbers look like INV-2026-0001.' })}
          {field('invoice', 'dueDays', 'Payment due after (days)', { hint: 'Sets the due date on new invoices; overdue invoices show on the Sales home.' })}
          {field('invoice', 'terms', 'Default invoice terms', { wide: true, textarea: true, rows: 4 })}
        </Card>
        <Card title="Commission">
          {field('team', 'commissionPct', 'Commission rate (%)', { hint: '0 turns commission off. Shown on the Commission page as a payroll worksheet.' })}
          <div>
            <label className={labelCls}>Paid on</label>
            <select disabled={!canEdit} value={s.team?.commissionBasis || 'collected'} onChange={e => set('team', 'commissionBasis', e.target.value)} className={`${inputCls} disabled:bg-gray-50`}>
              <option value="collected">Payments collected</option><option value="won">Deal value won</option>
            </select>
          </div>
        </Card>
        <Card title="Email to the client: quotations">
          {field('email', 'subject', 'Subject', { wide: true, hint: 'You can use {number}, {company}, {client}, {total}, {validUntil}, {sender}.' })}
          {field('email', 'message', 'Message', { wide: true, textarea: true, rows: 8 })}
        </Card>
        <Card title="Email to the client: invoices">
          {field('email', 'invoiceSubject', 'Subject', { wide: true, hint: 'You can use {number}, {company}, {client}, {total}, {balance}, {dueDate}, {sender}.' })}
          {field('email', 'invoiceMessage', 'Message', { wide: true, textarea: true, rows: 8 })}
        </Card>
        <div className="text-[12px] text-gray-500 flex items-center gap-1"><Eye size={12} /> Open any quotation and use “Preview” to see the PDF with these details.</div>
      </div>
    </div>
  );
}
