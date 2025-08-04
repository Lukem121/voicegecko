import { Head, Img } from '@react-email/components';

interface DarkModeAwareLogoProps {
  height?: string;
  alt?: string;
  className?: string;
  lightModeUrl?: string;
  darkModeUrl?: string;
}

const defaultLightModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Z2O1xCdAhRjs7OTwApLUiQ5MmxHW9grnZtGaP';
const defaultDarkModeUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZvI6hCtQ5ThFRxGH79aE2YoJO5gucd0lM86Zz';

export const DarkModeAwareLogo = ({
  height = '32',
  alt = 'VoiceGecko',
  className = '',
  lightModeUrl = defaultLightModeUrl,
  darkModeUrl = defaultDarkModeUrl,
}: DarkModeAwareLogoProps) => (
  <>
    {/* Light mode logo */}
    <span className={`logo light ${className}`}>
      <Img alt={alt} className={className} height={height} src={lightModeUrl} />
    </span>
    {/* Dark mode logo - hidden by default */}
    <span className={`logo dark ${className}`} style={{ display: 'none' }}>
      <Img alt={alt} className={className} height={height} src={darkModeUrl} />
    </span>
  </>
);
