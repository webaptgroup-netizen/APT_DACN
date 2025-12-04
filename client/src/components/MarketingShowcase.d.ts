import type { ReactNode } from 'react';
interface MarketingHighlight {
    icon: ReactNode;
    title: string;
    description: string;
}
interface MarketingShowcaseProps {
    headline: string;
    description: string;
    promo?: string;
    primaryCta?: string;
    secondaryCta?: string;
    highlights: MarketingHighlight[];
}
declare const MarketingShowcase: ({ headline, description, promo, primaryCta, secondaryCta, highlights }: MarketingShowcaseProps) => import("react").JSX.Element;
export default MarketingShowcase;
//# sourceMappingURL=MarketingShowcase.d.ts.map