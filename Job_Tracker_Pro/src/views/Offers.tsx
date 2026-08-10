import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { SalaryOffer } from '../types';

/* ============================================================
   Offers — record, compare, and negotiate.
   Everything here is arithmetic on numbers you enter. Nothing
   is estimated, inferred, or filled in from market data: if a
   field is blank it stays blank and is excluded from totals.
   ============================================================ */

const money = (n?: number) => n == null ? '—' : '$' + Math.round(n).toLocaleString();

/** Cash total = base + bonus. Equity is reported separately on purpose —
 *  private-company equity is not cash and should not be silently summed. */
export function cashTotal(o: SalaryOffer) {
  const base = o.baseSalary ?? 0;
  const bonus = o.bonus ?? 0;
  return base + bonus;
}
export function grandTotal(o: SalaryOffer) {
  return cashTotal(o) + (o.equityCurrentValue ?? 0);
}

export default function Offers() {
  const state = useStore();
  const modal = useModal();
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo(() => state.offers.slice().sort(
    (a, b) => grandTotal(b) - grandTotal(a)
  ), [state.offers]);

  const jobLabel = (jobId: string) => {
    const j = state.jobs.find(x => x.id === jobId);
    const c = state.companies.find(x => x.id === j?.companyId);
    return { company: c?.name || '—', title: j?.title || '—' };
  };

  const best = rows[0];

  return (
    <div>
      <div className="toolbar">
        <button className="btn primary" onClick={() => modal.open(
          <OfferForm onDone={() => { modal.close(); toast('Offer recorded'); }} />
        )}>＋ Record Offer</button>
        <span className="muted text-sm">
          {rows.length === 0 ? 'No offers recorded yet' : `${rows.length} offer${rows.length > 1 ? 's' : ''} on the table`}
        </span>
      </div>

      {rows.length === 0 && (
        <div className="panel">
          <div className="empty">
            <div className="e-ico">💰</div>
            <strong>No offers yet</strong>
            <p>
              When an offer lands, record it here with the exact numbers the recruiter gave you.
              This view compares offers side by side and keeps a dated log of every negotiation
              message — which is the thing you will wish you had written down when the second
              offer arrives.
            </p>
          </div>
        </div>
      )}

      {rows.length > 1 && (
        <div className="panel mb12">
          <div className="panel-head"><h3>Comparison</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Company</th><th>Role</th><th>Status</th>
                  <th>Base</th><th>Bonus</th><th>Cash total</th>
                  <th>Equity (stated)</th><th>Total</th><th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(o => {
                  const { company, title } = jobLabel(o.jobId);
                  const isBest = best && o.id === best.id;
                  return (
                    <tr key={o.id} onClick={() => setSel(o.id)} style={{ cursor: 'pointer' }}>
                      <td><b>{company}</b>{isBest && <span className="chip ok" style={{ marginLeft: 6 }}>highest</span>}</td>
                      <td className="muted">{title}</td>
                      <td><span className="chip">{o.status}</span></td>
                      <td>{money(o.baseSalary)}</td>
                      <td>{money(o.bonus)}</td>
                      <td><b>{money(cashTotal(o))}</b></td>
                      <td>{money(o.equityCurrentValue)}</td>
                      <td><b>{money(grandTotal(o))}</b></td>
                      <td className="muted">{o.expirationDate?.slice(0, 10) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="muted2 text-sm mt12">
            Equity is listed at the value <i>you</i> entered and is never blended into the cash
            column. For a private company that number is a company-provided estimate, not money.
          </div>
        </div>
      )}

      {rows.map(o => {
        const { company, title } = jobLabel(o.jobId);
        const open = sel === o.id;
        return (
          <div className="panel mb12" key={o.id}>
            <div className="panel-head">
              <h3>{company} — {title}</h3>
              <button className="btn sm" onClick={() => setSel(open ? null : o.id)}>
                {open ? 'Hide' : 'Details'}
              </button>
            </div>

            <div className="kpi-row">
              <div className="kpi"><div className="k-label">Base</div><div className="k-val">{money(o.baseSalary)}</div></div>
              <div className="kpi"><div className="k-label">Bonus</div><div className="k-val">{money(o.bonus)}</div></div>
              <div className="kpi"><div className="k-label">Cash total</div><div className="k-val">{money(cashTotal(o))}</div></div>
              <div className="kpi"><div className="k-label">Equity (stated)</div><div className="k-val">{money(o.equityCurrentValue)}</div></div>
              <div className="kpi"><div className="k-label">Status</div><div className="k-val" style={{ fontSize: 16 }}>{o.status}</div></div>
            </div>

            {open && (
              <div className="mt12">
                {o.equityShares != null && (
                  <div className="muted text-sm">Equity: {o.equityShares.toLocaleString()} shares · vesting {o.equityVesting || 'not stated'}</div>
                )}
                {o.notes && <div className="text-sm mt12" style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</div>}

                <div className="panel-head mt12"><h3>Negotiation log</h3></div>
                {(o.negotiationHistory || []).length === 0
                  ? <div className="muted2 text-sm">Nothing logged yet.</div>
                  : (o.negotiationHistory || []).map((h, i) => (
                    <div className="row" key={i}>
                      <span className="r-name">{h.type}<span className="r-sub"> · {h.channel}</span></span>
                      <span className="r-sub">{h.from ? `${h.from} → ${h.to}` : ''}</span>
                      <span className="r-date">{h.date.slice(0, 10)}</span>
                    </div>
                  ))}

                <NegotiationCalc offer={o} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Counter-offer calculator ------------------------------------------
   Three standard ask shapes off the stated base. Pure arithmetic — it does
   not tell you what the market pays, only what each ask would be worth. */
function NegotiationCalc({ offer }: { offer: SalaryOffer }) {
  const state = useStore();
  const base = offer.baseSalary ?? 0;
  const [pct, setPct] = useState(10);
  const target = Math.round(base * (1 + pct / 100));
  const meet = Math.round((base + target) / 2);

  const log = (type: string, to: string) => {
    const hist = [...(offer.negotiationHistory || []), {
      date: new Date().toISOString(), type, from: money(base), to,
      channel: 'email',
    }];
    state.updateOffer(offer.id, { negotiationHistory: hist });
    toast('Logged to negotiation history');
  };

  if (!base) return <div className="muted2 text-sm mt12">Enter a base salary to use the counter calculator.</div>;

  return (
    <div className="panel mt12" style={{ background: 'var(--bg)' }}>
      <div className="panel-head"><h3>Counter calculator</h3></div>
      <label className="text-sm">Ask +{pct}% on base
        <input type="range" min={0} max={30} value={pct} onChange={e => setPct(Number(e.target.value))} />
      </label>
      <div className="kpi-row">
        <div className="kpi"><div className="k-label">Their offer</div><div className="k-val">{money(base)}</div></div>
        <div className="kpi"><div className="k-label">Your ask</div><div className="k-val">{money(target)}</div></div>
        <div className="kpi"><div className="k-label">Likely landing</div><div className="k-val">{money(meet)}</div></div>
        <div className="kpi"><div className="k-label">Delta if met</div><div className="k-val">{money(target - base)}</div></div>
      </div>
      <div className="flex mt12" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={() => log('counter_sent', money(target))}>Log counter at {money(target)}</button>
        <button className="btn sm" onClick={() => log('signing_bonus_ask', money(Math.round(base * 0.08)))}>
          Log signing-bonus ask {money(Math.round(base * 0.08))}
        </button>
        <button className="btn sm" onClick={() => log('accepted', money(base))}>Log accepted at {money(base)}</button>
      </div>
    </div>
  );
}

/* ---- Record-offer form ---- */
function OfferForm({ onDone }: { onDone: () => void }) {
  const state = useStore();
  const modal = useModal();
  // Default to a job that is actually late-stage, if there is one.
  const late = state.jobs.find(j => ['offer', 'negotiating', 'final'].includes(j.status));
  const [jobId, setJobId] = useState(late?.id || state.jobs[0]?.id || '');
  const [base, setBase] = useState('');
  const [bonus, setBonus] = useState('');
  const [equityShares, setEquityShares] = useState('');
  const [equityValue, setEquityValue] = useState('');
  const [vesting, setVesting] = useState('4 years, 1 year cliff');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');

  const num = (v: string) => v.trim() === '' ? undefined : Number(v.replace(/[^0-9.]/g, ''));

  const submit = () => {
    if (!jobId) { toast('Select the job this offer is for'); return; }
    state.addOffer({
      jobId, status: 'received',
      baseSalary: num(base), baseCurrency: 'USD', bonus: num(bonus), bonusType: 'signing',
      equityShares: num(equityShares), equityCurrentValue: num(equityValue),
      equityVesting: vesting || undefined,
      expirationDate: expires || undefined,
      notes: notes || undefined,
      negotiationHistory: [{ date: new Date().toISOString(), type: 'offer_received', to: base ? '$' + base : '', channel: 'email' }],
    });
    // An offer implies the job reached the offer stage.
    const job = state.jobs.find(j => j.id === jobId);
    if (job && job.status !== 'offer' && job.status !== 'negotiating' && job.status !== 'accepted') {
      state.moveJob(jobId, 'offer', 'Auto-advanced: offer recorded');
    }
    onDone();
  };

  return <div>
    <h3>Record Offer</h3>
    <div className="form">
      <label>Job<select value={jobId} onChange={e => setJobId(e.target.value)}>
        {state.jobs.map(j => {
          const co = state.companies.find(c => c.id === j.companyId);
          return <option key={j.id} value={j.id}>{co?.name || ''} — {j.title}</option>;
        })}
      </select></label>
      <div className="flex" style={{ gap: 8 }}>
        <label style={{ flex: 1 }}>Base salary<input value={base} onChange={e => setBase(e.target.value)} placeholder="95000" /></label>
        <label style={{ flex: 1 }}>Signing bonus<input value={bonus} onChange={e => setBonus(e.target.value)} placeholder="10000" /></label>
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <label style={{ flex: 1 }}>Equity shares<input value={equityShares} onChange={e => setEquityShares(e.target.value)} placeholder="optional" /></label>
        <label style={{ flex: 1 }}>Equity value stated<input value={equityValue} onChange={e => setEquityValue(e.target.value)} placeholder="optional" /></label>
      </div>
      <label>Vesting<input value={vesting} onChange={e => setVesting(e.target.value)} /></label>
      <label>Offer expires<input type="date" value={expires} onChange={e => setExpires(e.target.value)} /></label>
      <label>Notes<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Who made the offer, what they said about flexibility, sponsorship confirmation…" /></label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={() => modal.close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Record Offer</button>
      </div>
    </div>
  </div>;
}
