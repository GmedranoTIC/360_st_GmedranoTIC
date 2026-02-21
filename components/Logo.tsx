// Logo SVG embebido - sin necesidad de archivos externos
export const LogoSVG = () => (
  <svg 
    width="48" 
    height="48" 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="rounded-full"
    style={{ 
      background: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}
  >
    <circle cx="24" cy="24" r="22" fill="url(#grad1)" stroke="#fff" strokeWidth="2"/>
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#92400e', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <text 
      x="24" 
      y="28" 
      fontSize="6" 
      fontWeight="bold" 
      fill="white" 
      textAnchor="middle"
      fontFamily="system-ui, sans-serif"
    >
      GmedranoTIC
    </text>
    <text 
      x="24" 
      y="36" 
      fontSize="6" 
      fill="rgba(255,255,255,0.8)" 
      textAnchor="middle"
      fontFamily="system-ui, sans-serif"
    >
      360 Studio
    </text>
  </svg>
);

// Logo base64 para exportación (versión simplificada)
export const LOGO_BASE64 = `data:image/svg+xml;base64,${btoa(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="22" fill="#92400e" stroke="#fff" stroke-width="2"/>
  <text x="24" y="28" font-size="16" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">360</text>
  <text x="24" y="36" font-size="6" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="sans-serif">Studio</text>
</svg>
`)}`;
