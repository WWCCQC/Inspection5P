'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import LiveClock from './LiveClock';

const Navbar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/track-c' && (pathname === '/track-c' || pathname === '/')) return true;
    if (path === '/track-rollout' && pathname === '/track-rollout') return true;
    return false;
  };

  const navItems = [
    {
      label: 'Track C',
      path: '/track-c',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      label: 'Track Rollout',
      path: '/track-rollout',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        backgroundColor: '#12239E',
        height: '56px',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '16px',
        paddingRight: '16px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flex: 1,
        }}
      >
        {/* Logo/Title */}
        <div
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            minWidth: 'fit-content',
          }}
        >
          5P Dashboard
        </div>

        {/* Vertical Separator */}
        <div
          style={{
            width: '1px',
            height: '32px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        ></div>

        {/* Navigation Menu */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  color: active ? 'white' : '#e5e7eb',
                  backgroundColor: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  border: active ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: active ? '600' : '500',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live Clock - positioned on the right */}
      <div style={{ marginLeft: 'auto' }}>
        <LiveClock />
      </div>
    </nav>
  );
};

export default Navbar;
