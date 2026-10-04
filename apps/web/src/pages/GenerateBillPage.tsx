import { useQuery } from '@tanstack/react-query';
import { Plus, Receipt, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, friendlyError } from '@/api/client';
import { Button, Card, DateInput, DetailRow, EmptyState, Icon, Input, MonthStepper, Notice, SectionHeader, Select, Skeleton } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useBillPreview, useCreateBill, type BillRequest } from '@/features/bills/api';
import { ChargeModal, type ChargeRow } from '@/features/bills/ChargeModal';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useDebounced } from '@/hooks/useDebounced';
import { formatDate, formatINR, formatYM, toYM } from '@/utils/format';
import type { Paginated, TenantListItem } from '@rental/shared';

const num = (s: string) => (s.trim() !== '' && /^\d+(\.\d{1,2})?$/.test(s.trim()) ? Number(s) : undefined);

export function GenerateBillPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fixedTenant = params.get('tenantId') ?? undefined;
  const { current } = useProperty();
  const [tenantId, setTenantId] = useState<string | undefined>(fixedTenant);
  const [period, setPeriod] = useState<string | undefined>();
  const [reading, setReading] = useState('');
  const [prevReading, setPrevReading] = useState('');
  const [manual, setManual] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [lateFee, setLateFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>();
  const [chargeModal, setChargeModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreateBill();

  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'billable', current?.id],
    enabled: !fixedTenant && !!current,
    queryFn: () => api.get<Paginated<TenantListItem>>(`/tenants?propertyId=${current!.id}&status=ACTIVE&pageSize=100`),
  });

  const request: BillRequest | null = useMemo(() => {
    if (!tenantId) return null;
    return {
      tenantId, billingPeriod: period, dueDate,
      electricity: {
        ...(manual ? { currentReading: num(reading), overrideAmount: num(manualAmount) ?? 0 } : { currentReading: num(reading) }),
        ...(prevReading.trim() !== '' && num(prevReading) !== undefined ? { previousReading: num(prevReading) } : {}),
      },
      charges: charges.filter((c) => num(c.amount)).map((c) => ({ type: c.type, name: c.name, amount: Number(c.amount) })),
      lateFee: num(lateFee), discount: num(discount),
    };
  }, [tenantId, period, dueDate, manual, reading, prevReading, manualAmount, charges, lateFee, discount]);

  const debounced = useDebounced(request, 400);
  const preview = useBillPreview(debounced);
  const data = preview.data;
  const settling = request !== debounced || preview.isFetching;

  // First response seeds the month and any recurring charges (adjusting state while rendering, not in an effect).
  if (data && !seeded) {
    setSeeded(true);
    setPeriod(toYM(data.billingPeriod));
    if (data.recurringCharges.length) setCharges(data.recurringCharges.map((c) => ({ type: c.type, name: c.name, amount: String(c.amount) })));
  }

  const el = data?.electricity;
  const previewError = preview.error ? (preview.error instanceof ApiError ? preview.error.message : friendlyError(preview.error)) : null;
  const needsReading = el?.mode === 'METER' && !manual && (el?.needsReading ?? true);
  const canGenerate = !!data && !previewError && !settling && !needsReading && !create.isPending;

  const generate = async () => {
    if (!request) return;
    setSubmitError(null);
    try {
      const bill = await create.mutateAsync({ ...request, billingPeriod: period });
      navigate(`/bills/${bill.id}?created=1`, { replace: true });
    } catch (e) { setSubmitError(friendlyError(e)); }
  };

  const tenantOptions = (tenantsQuery.data?.items ?? []).filter((t) => t.assignmentId).map((t) => ({ value: t.id, label: `${t.fullName} · Room ${t.room?.roomNumber}` }));
  const reset = () => { setTenantId(undefined); setSeeded(false); setPeriod(undefined); setCharges([]); setReading(''); setPrevReading(''); };

  return (
    <Page title="Generate Bill" subtitle={current?.name} back>
      {!tenantId ? (
        tenantsQuery.isLoading ? <Skeleton className="h-12" /> : tenantOptions.length === 0 ? <EmptyState icon={Receipt} title="No tenants to bill" message="Assign a tenant to a room first, then generate their bill." />
          : <Select label="Tenant" placeholder="Choose a tenant" options={tenantOptions} value="" onChange={(e) => e.target.value && setTenantId(e.target.value)} />
      ) : (
        <div className="space-y-4">
          <Card className="flex items-center justify-between">
            <div><div className="text-heading">{data?.tenant.fullName ?? ' '}</div><div className="text-small text-ink-soft">{data ? `Room ${data.room.roomNumber}` : ' '}</div></div>
            {!fixedTenant ? <button type="button" onClick={reset} className="text-small font-medium text-primary">Change</button> : null}
          </Card>
          {period ? <MonthStepper label="Billing Month" value={period} onChange={setPeriod} /> : <Skeleton className="h-12" />}
          {previewError ? <Notice tone="danger">{previewError}</Notice> : null}

          {data ? (
            <>
              <Card><DetailRow label="Rent" value={formatINR(data.rent)} strong last /></Card>

              {el && el.mode !== 'NONE' ? (
                <Card className="space-y-3">
                  <div className="flex items-center gap-2"><Icon icon={Zap} tone="primary" /><span className="text-heading">Electricity</span></div>
                  {el.mode === 'METER' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Previous" inputMode="decimal" value={prevReading !== '' ? prevReading : String(el.previousReading ?? 0)} onChange={(e) => setPrevReading(e.target.value)} />
                        <Input label="Current" placeholder="Enter reading" inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} disabled={manual} />
                      </div>
                      {prevReading === '' && (el.previousReading ?? 0) === 0 ? <p className="text-caption text-warning">No earlier meter reading is on record. Type the last reading from the meter in Previous, otherwise the whole meter value is billed.</p> : null}
                      {prevReading !== '' ? <p className="text-caption text-warning">Previous reading changed by you. Use this only if the stored reading is wrong or the meter was replaced.</p> : null}
                      {!manual && el.currentReading != null ? <p className="text-ink-soft">{el.units} units × {formatINR(el.ratePerUnit)} = <span className="font-medium text-ink">{formatINR(el.amount)}</span></p> : null}
                    </>
                  ) : <p className="text-ink-soft">Fixed monthly amount: {formatINR(el.calculatedAmount)}</p>}
                  {manual ? <Input label="Amount" prefix="₹" inputMode="decimal" placeholder="0" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} hint="Replaces the calculated amount, for example when the meter is faulty." /> : null}
                  <button type="button" onClick={() => setManual((m) => !m)} className="text-small font-medium text-primary">{manual ? 'Use meter reading instead' : 'Enter amount manually'}</button>
                </Card>
              ) : null}

              <SectionHeader title="Other Charges" action={<button type="button" onClick={() => setChargeModal(true)} className="text-small font-medium text-primary">Add</button>} />
              {charges.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 py-5"><span className="text-ink-soft">No other charges</span><Button variant="secondary" size="sm" full={false} icon={Plus} onClick={() => setChargeModal(true)}>Add Charge</Button></Card>
              ) : (
                <Card padded={false}>
                  {charges.map((c, i) => (
                    <div key={`${c.name}-${i}`} className={`flex items-center gap-2 px-4 py-2 ${i < charges.length - 1 ? 'border-b border-line' : ''}`}>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <div className="w-32"><Input aria-label={`${c.name} amount`} prefix="₹" inputMode="decimal" value={c.amount} onChange={(e) => setCharges((cur) => cur.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} /></div>
                      <button type="button" onClick={() => setCharges((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={X} tone="muted" /></button>
                    </div>
                  ))}
                </Card>
              )}

              <SectionHeader title="Adjustments" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Late fee" prefix="₹" inputMode="decimal" placeholder="0" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
                <Input label="Discount" prefix="₹" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <DateInput label="Due Date" value={dueDate ?? data.dueDate.slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />

              <SectionHeader title="Summary" />
              <Card>
                <DetailRow label="Rent" value={formatINR(data.totals.rent)} />
                {data.totals.electricity > 0 ? <DetailRow label="Electricity" value={formatINR(data.totals.electricity)} /> : null}
                {data.charges.map((c, i) => <DetailRow key={i} label={c.name} value={formatINR(c.amount)} />)}
                {data.totals.lateFee > 0 ? <DetailRow label="Late fee" value={formatINR(data.totals.lateFee)} /> : null}
                {data.totals.discount > 0 ? <DetailRow label="Discount" value={`-${formatINR(data.totals.discount)}`} tone="success" /> : null}
                {data.totals.previousBalance > 0 ? <DetailRow label={`${data.openingBalance > 0 && data.carriedBills.length === 0 ? 'Outstanding (from before)' : 'Previous balance'}${data.carriedBills.length ? ` (${data.carriedBills.length} bill${data.carriedBills.length > 1 ? 's' : ''})` : ''}`} value={formatINR(data.totals.previousBalance)} tone="danger" /> : null}
                <DetailRow label="Total" value={formatINR(data.totals.totalDue)} strong last />
              </Card>
              <p className="text-center text-caption text-ink-muted">Totals are calculated and verified by the server for {formatYM(period ?? toYM(data.billingPeriod))}. Due {formatDate(dueDate ?? data.dueDate)}.</p>

              <div className="sticky bottom-2 z-10 space-y-2 rounded-lg border border-line bg-surface p-3 shadow-lg">
                <div className="flex items-end justify-between"><span className="text-ink-soft">Total due</span><span className="text-title">{formatINR(data.totals.totalDue)}</span></div>
                {submitError ? <Notice tone="danger">{submitError}</Notice> : null}
                <Button icon={Receipt} onClick={() => void generate()} disabled={!canGenerate} loading={create.isPending}>{create.isPending ? 'Generating bill...' : 'Generate Bill'}</Button>
              </div>
            </>
          ) : preview.isLoading ? <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-28" /></div> : null}
        </div>
      )}
      <ChargeModal open={chargeModal} onClose={() => setChargeModal(false)} onAdd={(row) => setCharges((cur) => [...cur, row])} />
    </Page>
  );
}
