import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  CreditCard,
  Award,
  Users,
  BookOpen,
  Shield,
  CheckCircle,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/portal');
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">CrachaSys</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Cadastrar-se</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <CheckCircle className="w-3.5 h-3.5" />
          Sistema Profissional de Gestão de Cursos
        </span>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Gerencie cursos e gere
          <br />
          <span className="text-blue-600">crachás profissionais</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Plataforma completa para cadastro de participantes, emissão de crachás com QR Code
          e gestão de certificados para cursos presenciais.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Área do Administrador
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2">
              Portal do Participante
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Tudo que você precisa
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Uma plataforma completa para gestão de cursos presenciais
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CreditCard,
                title: 'Crachás com QR Code',
                description:
                  'Gere crachás profissionais com foto, dados do participante e QR Code único para verificação.',
                color: 'text-blue-600 bg-blue-100',
              },
              {
                icon: Award,
                title: 'Certificados Digitais',
                description:
                  'Emita e disponibilize certificados digitais personalizados para cada participante.',
                color: 'text-purple-600 bg-purple-100',
              },
              {
                icon: Users,
                title: 'Gestão de Participantes',
                description:
                  'Cadastre e gerencie todos os participantes com fotos, dados e histórico de cursos.',
                color: 'text-green-600 bg-green-100',
              },
              {
                icon: BookOpen,
                title: 'Controle de Cursos',
                description:
                  'Crie e gerencie cursos com datas, carga horária, local e lista de inscritos.',
                color: 'text-orange-600 bg-orange-100',
              },
              {
                icon: Shield,
                title: 'Área do Participante',
                description:
                  'Portal exclusivo onde participantes acessam seus crachás e certificados.',
                color: 'text-indigo-600 bg-indigo-100',
              },
              {
                icon: QrCode,
                title: 'Verificação Online',
                description:
                  'QR Codes nos crachás permitem verificação instantânea de credenciais.',
                color: 'text-rose-600 bg-rose-100',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Comece agora mesmo</h2>
            <p className="text-blue-100 mb-8 text-lg">
              Acesse o sistema e simplifique a gestão dos seus cursos presenciais.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="gap-2">
                  Fazer Login
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-blue-700 gap-2"
                >
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>© 2025 CrachaSys — Sistema de Gestão de Cursos e Crachás</p>
        </div>
      </footer>
    </div>
  );
}
