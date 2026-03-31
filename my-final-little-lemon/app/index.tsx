import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getUserProfile, initUserDb } from '@/lib/user-db';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initUserDb();
      const profile = await getUserProfile();
      if (!cancelled) setTarget(profile ? '/home' : '/onboarding');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null;
  return <Redirect href={target as any} />;
}

