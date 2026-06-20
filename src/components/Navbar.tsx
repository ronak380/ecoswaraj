'use client';

/**
 * @fileoverview Global navigation component with responsive layout and auth controls.
 * Features full ARIA roles and keyboard accessibility.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Logger } from '@/services/logger';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Logger.info('User logged out successfully.');
    } catch (err) {
      Logger.error('Failed to log out user', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Daily Tracker', path: '/tracker' },
    { name: 'Green Locator', path: '/locator' },
    { name: 'AI Coach', path: '/coach' }
  ];

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="container nav-container">
        <Link href="/" className="nav-logo" aria-label="Carbon Footprint India Home">
          <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🌱</span>
          <span>EcoSwaraj</span>
        </Link>

        {/* Toggle button for mobile */}
        <button
          className="btn btn-secondary mobile-toggle"
          style={{ display: 'none', padding: '8px' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.name}>
                <Link
                  href={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Go to ${item.name}`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
          <li>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span 
                  style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                  aria-label={`Logged in as ${currentUser.email}`}
                >
                  {currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  aria-label="Sign out of account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                aria-label="Go to login page"
              >
                Sign In
              </Link>
            )}
          </li>
        </ul>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-toggle {
            display: block !important;
          }
          .nav-links {
            display: ${mobileMenuOpen ? 'flex' : 'none'} !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: var(--bg-surface);
            padding: 24px;
            border-bottom: 1px solid var(--border-color);
            gap: 20px !important;
          }
        }
      `}</style>
    </nav>
  );
}
