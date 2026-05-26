import { render } from '@react-email/components';
import type { MailDataRequired } from '@sendgrid/mail';
import sendgrid from '@sendgrid/mail';
import type { ReactElement } from 'react';

import { keys } from '../env';

type Options = Omit<MailDataRequired, 'html'> & {
  react: ReactElement;
};

export const sendEmail = async (options: Options) => {
  sendgrid.setApiKey(keys().SENDGRID_API_KEY);
  const html = await render(options.react);
  sendgrid.send({
    html,
    // ipPoolName: 'dedicated-01',
    ...options,
  });
};
