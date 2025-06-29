const env = import.meta.env;

export const getAPIUrl = () => {
  if (env.PROD) return env.VITE_PUBLIC_API_URL as string;
  if (env.VITE_VERCEL_URL) return `https://${env.VITE_VERCEL_URL}`; // SSR should use vercel url
  return "http://localhost:3000";
};
