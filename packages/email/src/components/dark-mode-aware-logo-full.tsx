import { Img } from '@react-email/components';

interface DarkModeAwareLogoProps {
  height?: string;
  alt?: string;
  className?: string;
}

const defaultLightModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZuhJ6bYnJFtDkTismYA8O9fNxQhRlaWHz26n0';
const defaultDarkModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Zdrrvp8GANM8k36iyL4Jamp9sVUtxYP2ICfZ1';

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
