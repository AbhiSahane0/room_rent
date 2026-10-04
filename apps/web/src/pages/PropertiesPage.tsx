import { Building2, Check, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LinkButton, SkeletonList } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useProperty } from '@/features/properties/PropertyProvider';

export function PropertiesPage() {
  const { properties, current, setCurrentId, isLoading, isError, error, refetch } = useProperty();
  return (
    <Page title="Properties" back actions={properties.length ? <LinkButton to="/properties/new" icon={Plus} size="sm" full={false}>Add</LinkButton> : undefined}>
      {isLoading ? <SkeletonList count={2} /> : isError ? <ErrorState error={error} onRetry={refetch} />
        : properties.length === 0 ? <EmptyState icon={Building2} title="No properties yet" message="Add a property to start managing rooms, tenants and rent." action={<LinkButton to="/properties/new" icon={Plus} full={false} className="px-6">Add Property</LinkButton>} />
        : (
          <div className="space-y-3">
            {properties.map((p) => (
              <Card key={p.id} className="space-y-2">
                <Link to={`/properties/${p.id}/edit`} className="flex items-center justify-between"><span className="text-heading">{p.name}</span><Icon icon={ChevronRight} tone="muted" /></Link>
                <div className="text-ink-soft">{p.city}, {p.state}</div>
                <div className="flex items-center justify-between">
                  <span className="text-small text-ink-soft">{p.occupiedCount ?? 0} of {p.roomCount ?? 0} rooms occupied</span>
                  {p.id === current?.id ? <Badge label="Active" tone="primary" /> : <Button variant="ghost" size="sm" full={false} icon={Check} onClick={() => setCurrentId(p.id)}>Switch to this</Button>}
                </div>
              </Card>
            ))}
          </div>
        )}
    </Page>
  );
}
