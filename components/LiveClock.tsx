'use client';

import { useState, useEffect } from 'react';

const LiveClock = () => {
  const [dateTime, setDateTime] = useState<string>('');

  useEffect(() => {
    // Set initial date and time
    const updateDateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const thaiTime = now.toLocaleString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateTimeString = `${day}/${month}/${year} ${thaiTime}`;
      setDateTime(dateTimeString);
    };

    updateDateTime();

    // Update date and time every second
    const interval = setInterval(updateDateTime, 1000);

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
      {dateTime || '00/00/0000 00:00:00'}
    </div>
  );
};

export default LiveClock;
