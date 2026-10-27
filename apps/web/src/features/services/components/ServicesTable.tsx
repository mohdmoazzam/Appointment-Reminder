import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from '@/components/ui/Table';
import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import { fullName } from '@/lib/names';
import type { Service } from '@/types/models';

interface ServicesTableProps {
  services: Service[];
  currency: string;
  /** Owners see edit and delete buttons. */
  canManage: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function ServicesTable({
  services,
  currency,
  canManage,
  onEdit,
  onDelete,
}: ServicesTableProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Service</TableHeaderCell>
          <TableHeaderCell>Duration</TableHeaderCell>
          <TableHeaderCell>Price</TableHeaderCell>
          <TableHeaderCell>Offered by</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          {canManage && (
            <TableHeaderCell className="text-right">
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          )}
        </tr>
      </TableHead>
      <TableBody>
        {services.map((service) => (
          <tr key={service.id}>
            <TableCell>
              <p className="font-medium text-slate-900">{service.name}</p>
              {service.description && (
                <p className="max-w-xs truncate text-slate-500">{service.description}</p>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatDuration(service.duration_minutes)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatPrice(service.price, currency)}
            </TableCell>
            <TableCell className="text-slate-500">
              {service.staff.length === 0 ? (
                <span className="text-amber-700">Nobody yet</span>
              ) : (
                service.staff.map(fullName).join(', ')
              )}
            </TableCell>
            <TableCell>
              <Badge tone={service.is_active ? 'success' : 'neutral'}>
                {service.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            {canManage && (
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(service)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(service)}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            )}
          </tr>
        ))}
      </TableBody>
    </Table>
  );
}
