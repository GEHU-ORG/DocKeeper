'use client';

import Link from 'next/link';

interface BreadcrumbProps {
  path: string;
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  // Strip UniExamPrep from the start of the path for the breadcrumbs
  const displayPath = path.replace(/^UniExamPrep\/?/, '');
  const segments = displayPath ? displayPath.split('/').filter(Boolean) : [];
  
  const parentPath = segments.length > 1
    ? '/' + segments.slice(0, -1).join('/')
    : '/';

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link
        href={parentPath}
        className="breadcrumb-up"
        aria-label="Go up one level"
      >
        ↑
      </Link>
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link href="/" className="breadcrumb-link">
            UniExamPrep
          </Link>
        </li>
        {segments.map((segment, idx) => {
          const segmentPath = '/' + segments.slice(0, idx + 1).join('/');
          const isLast = idx === segments.length - 1;

          return (
            <li key={segmentPath} className="breadcrumb-item">
              <span className="breadcrumb-separator">/</span>
              {isLast ? (
                <span className="breadcrumb-current">{decodeURIComponent(segment)}</span>
              ) : (
                <Link href={segmentPath} className="breadcrumb-link">
                  {decodeURIComponent(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
