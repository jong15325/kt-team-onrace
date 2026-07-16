import React from 'react';

export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[var(--max-width)] px-[var(--container-padding)]">
      {children}
    </div>
  );
}
