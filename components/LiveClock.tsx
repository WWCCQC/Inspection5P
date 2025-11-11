'use client';

import { useState, useEffect } from 'react';

const LiveClock = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Set initial time
    const updateTime = () => {
      const now = new Date();
      const thaiTime = now.toLocaleString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setTime(thaiTime);
    };

    updateTime();

    // Update time every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        minWidth: 'fit-content',
        fontFamily: 'monospace',
      }}
    >
      {time || '00:00:00'}
    </div>
  );
};

export default LiveClock;
