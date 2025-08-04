import { Img } from '@react-email/components';

import { DarkModeAwareLogo } from './dark-mode-aware-logo';

interface DarkModeAwareLogoProps {
  height?: string;
  alt?: string;
  className?: string;
}

const defaultLightModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZOUHIT7SEiXZxG9dY34AvLazHegtNsJIfWQOV';
const defaultDarkModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZP2IFtSwDCEO9Xp2r37uNZRHlmToIxtJzj5S6';

export const DarkModeAwareLogoFull = ({
  height = '42',
  alt = 'VoiceGecko',
  className = '',
}: DarkModeAwareLogoProps) => (
  <>
    {/* Light mode logo */}
    <span className={`logo light ${className}`}>
      <Img
        alt={alt}
        className={className}
        height={height}
        src={defaultLightModeUrl}
      />
    </span>
    {/* Dark mode logo - hidden by default */}
    <span className={`logo dark ${className}`} style={{ display: 'none' }}>
      <Img
        alt={alt}
        className={className}
        height={height}
        src={defaultDarkModeUrl}
      />
    </span>
  </>
);
