import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Handles the Meta OAuth callback redirect.
 * The edge function redirects here with ?connected=true or ?meta_error=...
 * This page just shows a loading state and redirects to /dashboard.
 */
export default function MetaCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('meta_error');

    if (connected === 'true') {
      toast.success('Meta conectado com sucesso!');
    } else if (error) {
      toast.error(`Erro na conexão Meta: ${error}`);
    }

    navigate('/dashboard?connected=true', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Conectando sua conta Meta...</p>
      </div>
    </div>
  );
}
