import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { prisma } from '@/server/prisma';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = String(params?.token ?? '');

  const participant = await prisma.participant.findUnique({
    where: { qrToken: token },
    include: { certificate: { select: { verificationCode: true } } },
  });

  if (!participant) {
    return { notFound: true };
  }

  if (participant.certificate?.verificationCode) {
    return {
      redirect: {
        destination: `/certificate/${participant.certificate.verificationCode}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      name: participant.name,
      event: participant.eventId,
    },
  };
};

export default function QrLanding({ name }: { name: string }) {
  return (
    <>
      <Head>
        <title>Crachá — {name}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto text-indigo-700 font-bold text-2xl">
            {name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{name}</p>
            <p className="text-sm text-gray-500 mt-1">Participante credenciado</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
            Certificado ainda não emitido para este participante.
          </div>
        </div>
      </div>
    </>
  );
}
