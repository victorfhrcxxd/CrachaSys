import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  type ParticipantFilters,
  EMPTY_FILTERS,
  ROLE_OPTIONS,
} from '../utils/participantStatus';

interface Props {
  filters:         ParticipantFilters;
  onSearchChange:  (v: string) => void;
  onFilterChange:  (patch: Partial<ParticipantFilters>) => void;
  onReset:         () => void;
  totalCount:      number;
  filteredCount:   number;
}

export function ParticipantsFilters({
  filters, onSearchChange, onFilterChange, onReset,
  totalCount, filteredCount,
}: Props) {
  const filtersActive =
    filters.role !== '' || filters.checkinStatus !== '' || filters.certStatus !== '';
  const anyActive = filtersActive || filters.search !== '';

  return (
    <div className="space-y-2">
      {/* Search + selects row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={filters.search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
          {filters.search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role */}
        <Select
          value={filters.role || '_all'}
          onValueChange={v => onFilterChange({ role: v === '_all' ? '' : v })}
        >
          <SelectTrigger className="h-9 w-[148px] text-[13px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os tipos</SelectItem>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Check-in status */}
        <Select
          value={filters.checkinStatus || '_all'}
          onValueChange={v =>
            onFilterChange({ checkinStatus: v === '_all' ? '' : v as ParticipantFilters['checkinStatus'] })
          }
        >
          <SelectTrigger className="h-9 w-[148px] text-[13px]">
            <SelectValue placeholder="Check-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos check-ins</SelectItem>
            <SelectItem value="present">Presente</SelectItem>
            <SelectItem value="absent">Não fez check-in</SelectItem>
          </SelectContent>
        </Select>

        {/* Certificate status */}
        <Select
          value={filters.certStatus || '_all'}
          onValueChange={v =>
            onFilterChange({ certStatus: v === '_all' ? '' : v as ParticipantFilters['certStatus'] })
          }
        >
          <SelectTrigger className="h-9 w-[148px] text-[13px]">
            <SelectValue placeholder="Certificado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos certificados</SelectItem>
            <SelectItem value="issued">Emitido</SelectItem>
            <SelectItem value="eligible">Elegível</SelectItem>
            <SelectItem value="not_eligible">Não elegível</SelectItem>
          </SelectContent>
        </Select>

        {anyActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Results summary */}
      {anyActive && totalCount > 0 && (
        <p className="text-[12px] text-muted-foreground px-0.5">
          {filteredCount === totalCount
            ? `${totalCount} participante${totalCount !== 1 ? 's' : ''}`
            : `${filteredCount} de ${totalCount} participante${totalCount !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}
