import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { CreditCard, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    organization: '',
    position: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          cpf: form.cpf || undefined,
          phone: form.phone || undefined,
          organization: form.organization || undefined,
          position: form.position || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao criar conta. Tente novamente.');
        setLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CrachaSys</h1>
          <p className="text-gray-500 mt-1">Crie sua conta de participante</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Cadastro</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" name="name" placeholder="João da Silva" value={form.name} onChange={handleChange} required />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 99999-9999" value={form.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organização / Empresa</Label>
                <Input id="organization" name="organization" placeholder="Empresa ABC" value={form.organization} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo / Função</Label>
                <Input id="position" name="position" placeholder="Analista" value={form.position} onChange={handleChange} />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Fazer Login</Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/" className="hover:text-gray-600">← Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}
