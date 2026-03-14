/**
 * hooks/useCertificates.ts
 * Hook para busca de certificados com suporte a refresh.
 */

import { useEffect, useState, useCallback } from 'react';

export interface Certificate {
  id: string;
  verificationCode: string;
  issuedAt: string;
  participant: { id: string; name: string; email: string; company?: string };
  event: { id: string; name: string; workload?: number; startDate: string; endDate: string; instructor?: string };
}

interface UseCertificatesReturn {
  certs: Certificate[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCertificates(): UseCertificatesReturn {
  const [certs, setCerts]     = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/certificates');
      if (!res.ok) throw new Error('Falha ao carregar certificados');
      const data = await res.json();
      setCerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  return { certs, loading, error, refetch: fetchCerts };
}
