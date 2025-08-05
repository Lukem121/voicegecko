import { Button } from '@acme/ui/components/ui/button';
import { Loader } from 'lucide-react';
import { AiFillDiscord } from 'react-icons/ai';

import type { SocialProvider } from '../hooks/use-social-auth';

interface SocialSignInButtonProps {
  provider: SocialProvider;
  isLoading: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function SocialSignInButton({
  provider,
  isLoading,
  onClick,
  disabled,
}: SocialSignInButtonProps) {
  return (
    <Button
      aria-label={`Sign in with ${provider}`}
      className="flex w-full items-center gap-2"
      disabled={disabled}
      onClick={onClick}
      variant={'secondary'}
    >
      {isLoading ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        provider === 'discord' && <AiFillDiscord className="h-5 w-5" />
      )}
      <span className="capitalize">{provider}</span>
    </Button>
  );
}
