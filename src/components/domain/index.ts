/**
 * components/domain/index.ts
 * Barrel de componentes de domínio.
 *
 * Estes componentes representam entidades do negócio (Badge, Certificado...)
 * ao contrário de componentes UI genéricos (Button, Input, Card...) em components/ui/
 *
 * Os arquivos originais em components/ são mantidos por compatibilidade de imports
 * existentes em todo o projeto. Novos imports devem usar este barrel.
 */

export { default as BadgeTemplate }         from '../BadgeTemplate';
export { default as BadgeRenderer }         from '../BadgeRenderer';
export type { BadgeDesign, BadgeRendererProps } from '../BadgeRenderer';

export { default as CertificateTemplate }   from '../CertificateTemplate';
export { CertificateRenderer }                  from '../CertificateRenderer';
export type { CertDesign, CertificateRendererProps } from '../CertificateRenderer';
