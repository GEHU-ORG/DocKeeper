'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle';
  dataFullWidthResponsive?: boolean;
  style?: React.CSSProperties;
}

export function AdBanner({ 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  dataFullWidthResponsive = true,
  style = { display: 'block', width: '100%', minHeight: '90px' }
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  
  useEffect(() => {
    try {
      if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense Error:', err);
    }
  }, []);

  return (
    <div style={{ padding: '16px 0', textAlign: 'center', overflow: 'hidden' }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-9998034438026486"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
}
