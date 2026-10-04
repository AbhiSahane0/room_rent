import { useState } from 'react';
import { friendlyError } from '@/api/client';
import { Button, Field, Modal, MoneyInput, Notice, Segmented } from '@/components/ui';
import { formatINR } from '@/utils/format';
import { useChangeElectricity } from './api';

type Mode = 'METER' | 'FIXED' | 'NONE';

/** Sets how this tenant's electricity is billed from now on. Bills already generated are never changed. */
export function ElectricityModal({ open, onClose, assignmentId, mode: initialMode, ratePerUnit, fixedElectricity }: { open: boolean; onClose: () => void; assignmentId: string; mode: Mode; ratePerUnit: number | null; fixedElectricity: number | null }) {
  const change = useChangeElectricity(assignmentId);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rate, setRate] = useState(ratePerUnit != null ? String(ratePerUnit) : '');
  const [fixed, setFixed] = useState(fixedElectricity != null ? String(fixedElectricity) : '');
  const [room, setRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const body = mode === 'METER' ? { electricityMode: mode, ratePerUnit: Number(rate) } : mode === 'FIXED' ? { electricityMode: mode, fixedElectricity: Number(fixed) } : { electricityMode: mode };
    if (mode === 'METER' && !(rate !== '' && Number(rate) >= 0)) return setError('Enter the rate per unit');
    if (mode === 'FIXED' && !(fixed !== '' && Number(fixed) >= 0)) return setError('Enter the fixed monthly amount');
    try {
      await change.mutateAsync({ ...body, applyToRoom: room });
      onClose();
    } catch (e) { setError(friendlyError(e)); }
  };

  return (
    <Modal open={open} title="Electricity billing" onClose={onClose}>
      <div className="space-y-4 pb-2">
        <p className="text-ink-soft">{initialMode === 'METER' ? `Currently ${formatINR(ratePerUnit)} per unit.` : initialMode === 'FIXED' ? `Currently a fixed ${formatINR(fixedElectricity)} a month.` : 'Currently not charged.'} Applies to bills generated from now on.</p>
        <Field label="How is it charged?"><Segmented value={mode} onChange={setMode} options={[{ value: 'METER', label: 'Per unit' }, { value: 'FIXED', label: 'Fixed' }, { value: 'NONE', label: 'None' }]} /></Field>
        {mode === 'METER' ? <MoneyInput label="Rate per unit" value={rate} onChange={(e) => setRate(e.target.value)} /> : null}
        {mode === 'FIXED' ? <MoneyInput label="Fixed monthly amount" value={fixed} onChange={(e) => setFixed(e.target.value)} /> : null}
        <label className="flex items-start gap-3 text-ink-soft"><input type="checkbox" checked={room} onChange={(e) => setRoom(e.target.checked)} className="mt-1 h-5 w-5 accent-primary" />Also make this the room's default for the next tenant</label>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button onClick={() => void save()} loading={change.isPending}>Save</Button>
      </div>
    </Modal>
  );
}
