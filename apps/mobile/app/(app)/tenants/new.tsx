import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, FileText, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Card, DateField, DetailRow, Header, Icon, Screen, StepIndicator, Text, TextField } from '@/components/ui';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useCreateTenant } from '@/features/tenants/api';
import { RentFields, RoomPicker } from '@/features/tenants/AssignmentFields';
import { assignmentPayload, emptyTenantForm, STEP_FIELDS, TenantForm, tenantFormSchema, tenantPayload } from '@/features/tenants/schemas';
import { formatDate, formatINR, today } from '@/utils/format';
import { toNumber } from '@/utils/validation';

const STEPS = ['Personal', 'Contact', 'Documents', 'Room', 'Rent & Deposit', 'Review'];

export default function AddTenantScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { current } = useProperty();
  const create = useCreateTenant();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TenantForm>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: { ...emptyTenantForm, joiningDate: today(), startDate: today(), roomId: roomId ?? '' },
    mode: 'onTouched',
  });
  const { control, trigger, getValues, handleSubmit, setError: setFieldError } = form;
  const watchedRoomId = useWatch({ control, name: 'roomId' });
  const hasRoom = () => !!getValues('roomId');
  const name = STEPS[step];

  const next = async () => {
    if (!(await trigger(STEP_FIELDS[name]))) return;
    if (name === 'Rent & Deposit' && !getValues('agreedRent')) return setFieldError('agreedRent', { message: 'Enter the monthly rent' });
    setStep((s) => (name === 'Room' && !hasRoom() ? s + 2 : s + 1));
  };
  const back = () => (step === 0 ? router.back() : setStep((s) => (name === 'Review' && !hasRoom() ? s - 2 : s - 1)));

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const body = { ...tenantPayload(v, v.roomId ? undefined : current?.id), ...(v.roomId ? { assignment: assignmentPayload(v) } : {}) };
      const tenant = await create.mutateAsync(body);
      router.replace({ pathname: '/tenants/[id]', params: { id: tenant.id } });
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  const v = getValues();
  const isReview = name === 'Review';

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View className="flex-row gap-3 px-4 pb-4 pt-2">
          <View className="w-14"><Button label="" icon={ArrowLeft} variant="secondary" onPress={back} accessibilityLabel="Back" /></View>
          <View className="flex-1">
            {isReview ? (
              <Button label="Save Tenant" icon={Check} onPress={submit} loading={create.isPending} />
            ) : (
              <Button label={name === 'Room' && !watchedRoomId ? 'Skip for now' : 'Next'} icon={ArrowRight} onPress={next} />
            )}
          </View>
        </View>
      }
    >
      <Header title="Add Tenant" subtitle={current?.name} onBack={back} />
      <StepIndicator steps={STEPS} current={step} />
      <FormProvider {...form}>
        <View className="gap-4 pt-3">
          {name === 'Personal' ? (
            <>
              <TextField control={control} name="fullName" label="Full Name" placeholder="e.g. Rahul Sharma" autoCapitalize="words" />
              <Controller control={control} name="joiningDate" render={({ field, fieldState }) => (
                <DateField label="Joining Date" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )} />
              <TextField control={control} name="occupation" label="Occupation (optional)" placeholder="e.g. Software engineer" />
              <TextField control={control} name="notes" label="Notes (optional)" multiline placeholder="Anything worth remembering" />
            </>
          ) : null}

          {name === 'Contact' ? (
            <>
              <TextField control={control} name="phone" label="Phone" placeholder="98765 43210" keyboardType="phone-pad" />
              <TextField control={control} name="alternatePhone" label="Alternate Phone (optional)" keyboardType="phone-pad" />
              <TextField control={control} name="email" label="Email (optional)" placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
              <TextField control={control} name="permanentAddress" label="Permanent Address (optional)" multiline />
              <TextField control={control} name="currentAddress" label="Current Address (optional)" multiline />
              <TextField control={control} name="emergencyContact" label="Emergency Contact (optional)" placeholder="Name" />
              <TextField control={control} name="emergencyPhone" label="Emergency Phone (optional)" keyboardType="phone-pad" />
            </>
          ) : null}

          {name === 'Documents' ? (
            <Card className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-soft"><Icon icon={FileText} tone="primary" /></View>
              <View className="flex-1">
                <Text variant="heading">Aadhaar, PAN and agreement</Text>
                <Text tone="soft" className="mt-1">Documents are uploaded securely once the tenant is saved. You will be able to add them from the tenant profile.</Text>
              </View>
            </Card>
          ) : null}

          {name === 'Room' ? (
            <>
              <Text tone="soft">Choose a vacant room for this tenant, or skip and assign one later.</Text>
              <RoomPicker />
            </>
          ) : null}

          {name === 'Rent & Deposit' ? <RentFields /> : null}

          {isReview ? (
            <>
              <ReviewCard title="Personal" onEdit={() => setStep(0)}>
                <DetailRow label="Name" value={v.fullName} />
                <DetailRow label="Joining date" value={formatDate(v.joiningDate)} />
                <DetailRow label="Occupation" value={v.occupation || '-'} last />
              </ReviewCard>
              <ReviewCard title="Contact" onEdit={() => setStep(1)}>
                <DetailRow label="Phone" value={v.phone} />
                <DetailRow label="Email" value={v.email || '-'} />
                <DetailRow label="Emergency" value={v.emergencyContact ? `${v.emergencyContact}${v.emergencyPhone ? ` (${v.emergencyPhone})` : ''}` : '-'} last />
              </ReviewCard>
              <ReviewCard title="Room & Rent" onEdit={() => setStep(3)}>
                {v.roomId ? (
                  <>
                    <DetailRow label="Move-in" value={formatDate(v.startDate || v.joiningDate)} />
                    <DetailRow label="Monthly rent" value={formatINR(toNumber(v.agreedRent || '0'))} />
                    <DetailRow label="Deposit" value={formatINR(toNumber(v.securityDeposit || '0'))} />
                    <DetailRow label="Electricity" value={v.electricityMode === 'METER' ? `Meter, ${formatINR(toNumber(v.ratePerUnit || '0'))} / unit` : v.electricityMode === 'FIXED' ? `Fixed ${formatINR(toNumber(v.fixedElectricity || '0'))}` : 'Not charged'} last />
                  </>
                ) : (
                  <DetailRow label="Room" value="Not assigned yet" last />
                )}
              </ReviewCard>
              {error ? <Text tone="danger" variant="secondary">{error}</Text> : null}
            </>
          ) : null}
        </View>
      </FormProvider>
    </Screen>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <View className="mb-1 flex-row items-center justify-between">
        <Text variant="label" tone="muted">{title.toUpperCase()}</Text>
        <Pressable onPress={onEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} className="flex-row items-center gap-1">
          <Icon icon={Pencil} size="sm" tone="primary" />
          <Text variant="secondaryMedium" tone="primary">Edit</Text>
        </Pressable>
      </View>
      {children}
    </Card>
  );
}
