import type { PropsWithChildren } from 'react';

const videoSources = [
  'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view.mp4',
  'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view1.mp4',
  'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view2.mp4',
  'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view3.mp4',
] as const;

const AuthBackground = ({ children }: PropsWithChildren) => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {videoSources.map((src) => (
          <video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;

