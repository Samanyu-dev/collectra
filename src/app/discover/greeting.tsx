'use client';

import { useEffect, useState } from 'react';

function timeOfDayGreeting(hour: number): string {
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/** Renders the time-of-day greeting using the visitor's local clock (a server-computed one would use server TZ). */
export function Greeting({ name }: { name: string | null }) {
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    setGreeting(timeOfDayGreeting(new Date().getHours()));
  }, []);

  return (
    <>
      {greeting}
      {name ? (
        <>
          , <span className="text-foreground">{name}</span>
        </>
      ) : null}
    </>
  );
}
