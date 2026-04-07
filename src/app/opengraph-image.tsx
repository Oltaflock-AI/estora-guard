import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt =
  'Estora — Real estate transaction intelligence from contract to close';

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

/** Brand tokens (match globals.css / CLAUDE design system). */
const surface = '#F8F7F4';
const navy = '#1B2A4A';
const gold = '#C9973A';
const secondary = '#666058';
const raised = '#FFFFFF';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: surface,
          padding: 64,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 420,
            height: '100%',
            background: `linear-gradient(135deg, ${gold}22 0%, transparent 55%)`,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              color: navy,
              letterSpacing: '-0.02em',
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.05,
            }}
          >
            Estora
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: navy,
              lineHeight: 1.25,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Real estate transaction intelligence
          </div>
          <div
            style={{
              fontSize: 22,
              color: secondary,
              lineHeight: 1.45,
              maxWidth: 560,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            From contract upload to close — with intelligence at every step.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              fontSize: 18,
              color: secondary,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: gold,
              }}
            />
            estora.com
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div
              style={{
                width: 200,
                height: 120,
                borderRadius: 12,
                background: raised,
                border: `1px solid ${gold}44`,
                boxShadow: '0 12px 40px rgba(27, 42, 74, 0.08)',
              }}
            />
            <div
              style={{
                width: 200,
                height: 140,
                borderRadius: 12,
                background: navy,
                marginBottom: 8,
                opacity: 0.92,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
