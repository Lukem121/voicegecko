import { Button } from '@acme/ui/components/ui/button';
import { Loader } from 'lucide-react';
import { AiFillDiscord } from 'react-icons/ai';
import { FcGoogle } from 'react-icons/fc';
import type { SocialProvider } from '../hooks/use-social-auth';

type SocialSignInButtonProps = {
  provider: SocialProvider;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function SocialSignInButton({
  provider,
  isLoading,
  onClick,
  disabled,
}: SocialSignInButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };

  return (
    <Button
      aria-label={`Sign in with ${provider}`}
      className="flex w-full items-center gap-2"
      disabled={disabled}
      onClick={handleClick}
      variant={'secondary'}
    >
      {isLoading ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {provider === 'discord' && <AiFillDiscord className="h-5 w-5" />}
          {provider === 'google' && <FcGoogle className="h-5 w-5" />}
        </>
      )}
      <span className="capitalize">{provider}</span>
    </Button>
  );
}
