import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { money, btn, inputCls, ErrorNote } from './salesShared';
import { desk, Loading, PageHead, Card, TargetBar, EmptyNote } from './deskShared';

/**
 * Monthly targets. Managers set them per person; everyone sees progress against them,
 * measured from real won deals, payments and logged activity, with a marker for today's pace.
 */

const shift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const label = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const FIELDS = [['wonValue', 'Won value (₹)'], ['collection', 'Collection (₹)'], ['dealsWon', 'Deals won'], ['enquiries', 'New enquiries'], ['activities', 'Touches']];

export default function SalesTargetsPage() {
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => { setData(null); desk(`/targets?month=${month}`).then(d => { setData(d); setEdit(null); setError(''); }).catch(e => setError(e.message)); }, [month]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading error={error} text="Loading targets…" />;

  const startEdit = () => setEdit(Object.fromEntries(data.rows.map(r => [r.userId, Object.fromEntries(FIELDS.map(([k]) => [k, r.target?.[k] || '']))])));
  const copyPrev = async () => {
    try { const p = await desk(`/targets?month=${shift(month, -1)}`); setEdit(Object.fromEntries(data.rows.map(r => { const t = p.rows.find(x => x.userId === r.userId)?.target; return [r.userId, Object.fromEntries(FIELDS.map(([k]) => [k, t?.[k] || '']))]; }))); } catch (e) { setError(e.message); }
  };
  const save = async () => {
    setSaving(true); setError('');
    try { await desk('/targets', { method: 'PUT', body: { month, rows: Object.entries(edit).map(([userId, v]) => ({ userId, ...v })) } }); setSaved(true); setTimeout(() => setSaved(false), 2500); load(); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const total = (k) => data.rows.reduce((s, r) => s + (r.target?.[k] || 0), 0);
  const totalAch = (k) => data.rows.reduce((s, r) => s + (r.achieved[k] || 0), 0);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Targets" sub="Set per person each month. Progress comes from real won deals, payments received and logged calls.">
        <div className="flex items-center bg-white border border-gray-200 rounded">
          <button onClick={() => setMonth(shift(month, -1))} className="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer rounded-l-lg" aria-label="Previous month"><ChevronLeft size={15} /></button>
          <span className="px-2 text-[13px] font-medium min-w-[120px] text-center">{label(month)}</span>
          <button onClick={() => setMonth(shift(month, 1))} className="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer rounded-r-lg" aria-label="Next month"><ChevronRight size={15} /></button>
        </div>
        {data.canEdit && !edit && <button onClick={startEdit} className={btn.primary}>Set targets</button>}
        {edit && <><button onClick={copyPrev} className={btn.ghost}>Copy last month</button><button onClick={() => setEdit(null)} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.green}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save</button></>}
        {saved && <span className="text-[12px] text-emerald-700">Saved</span>}
      </PageHead>
      <ErrorNote text={error} />

      {edit ? (
        <div className="bg-white border border-gray-200 rounded overflow-x-auto mt-2">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead className="text-xs text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-4 py-2.5">Salesperson</th>{FIELDS.map(([k, l]) => <th key={k} className="text-left font-medium px-2 py-2.5">{l}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map(r => (
                <tr key={r.userId}><td className="px-4 py-2 font-medium">{r.name}<div className="text-[11px] text-gray-500 font-normal">{r.title}</div></td>
                  {FIELDS.map(([k]) => <td key={k} className="px-2 py-2"><input value={edit[r.userId][k]} onChange={e => setEdit(x => ({ ...x, [r.userId]: { ...x[r.userId], [k]: e.target.value.replace(/[^\d.]/g, '') } }))} className={`${inputCls} w-28`} placeholder="0" /></td>)}</tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-[11.5px] text-gray-500 border-t border-gray-100">Leave a row empty to remove the target. People are told when their target is set.</div>
        </div>
      ) : data.rows.length === 0 ? <Card><EmptyNote>No salespeople yet.</EmptyNote></Card> : (
        <div className="space-y-4 mt-2">
          {data.rows.length > 1 && (
            <Card title="Whole team">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
                <TargetBar label="Won value" achieved={totalAch('wonValue')} target={total('wonValue')} format={money} expected={data.elapsed} />
                <TargetBar label="Collection" achieved={totalAch('collection')} target={total('collection')} format={money} expected={data.elapsed} />
                <TargetBar label="Deals won" achieved={totalAch('dealsWon')} target={total('dealsWon')} expected={data.elapsed} />
                <TargetBar label="New enquiries" achieved={totalAch('enquiries')} target={total('enquiries')} expected={data.elapsed} />
                <TargetBar label="Touches" achieved={totalAch('activities')} target={total('activities')} expected={data.elapsed} />
              </div>
            </Card>
          )}
          {data.rows.map(r => (
            <Card key={r.userId} title={r.name} action={<span className="text-[11.5px] text-gray-500">{r.title}{r.target?.updatedBy ? ` · set by ${r.target.updatedBy}` : ''}</span>}>
              {!r.target ? <div className="text-[12.5px] text-gray-500">No target for {label(month)}.{data.canEdit && <> <button onClick={startEdit} className="text-blue-700 hover:underline cursor-pointer">Set targets</button></>} Achieved so far: {money(r.achieved.wonValue)} won, {money(r.achieved.collection)} collected.</div> : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
                  <TargetBar label="Won value" achieved={r.achieved.wonValue} target={r.target.wonValue} format={money} expected={data.elapsed} />
                  <TargetBar label="Collection" achieved={r.achieved.collection} target={r.target.collection} format={money} expected={data.elapsed} />
                  <TargetBar label="Deals won" achieved={r.achieved.dealsWon} target={r.target.dealsWon} expected={data.elapsed} />
                  <TargetBar label="New enquiries" achieved={r.achieved.enquiries} target={r.target.enquiries} expected={data.elapsed} />
                  <TargetBar label="Touches (calls, meetings, messages)" achieved={r.achieved.activities} target={r.target.activities} expected={data.elapsed} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
