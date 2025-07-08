"use client";

import { useUsermaven } from "@usermaven/nextjs";

export default function Home() {
  const { track } = useUsermaven();

  return (
    <div className="page">
      <main className="main">
    
        <h1>Next.js 14 with React 18</h1>
        <ol>
          <li>
            Testing Usermaven SDK with Next.js 14 and React 18
          </li>
          <li>Make changes to see if the integration works properly</li>
        </ol>

        {/* Custom Event */}
        <button
          onClick={() => {
            track('custom_event', {
              custom_property: 'custom value',
              next_version: '14',
              react_version: '18'
            });
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '20px 0'
          }}
        >
          Track custom event
        </button>

        <div className="ctas">
          <a
            className="primary"
            href="#"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#0070f3',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 10px'
            }}
          >
            Deploy now
          </a>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#fff',
              color: '#000',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              border: '1px solid #eaeaea',
              margin: '0 10px'
            }}
          >
            Read docs
          </a>
        </div>
        <footer
  style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '40px 20px',
    backgroundColor: 'var(--background)',
    borderTop: '1px solid #eaeaea',
    marginTop: '40px',
    flexWrap: 'wrap'
  }}
>
  <a
    href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontSize: '14px',
      color: 'var(--foreground)',
      textDecoration: 'none',
      transition: 'color 0.2s ease, transform 0.2s ease'
    }}
 
  
  >
    Learn
  </a>
  <a
    href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontSize: '14px',
      color: 'var(--foreground)',
      textDecoration: 'none',
      transition: 'color 0.2s ease, transform 0.2s ease'
    }}
  
  >
    Examples
  </a>
  <a
    href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontSize: '14px',
      color: 'var(--foreground)',
      textDecoration: 'none',
      transition: 'color 0.2s ease, transform 0.2s ease'
    }}
   
  >
    Go to nextjs.org →
  </a>
        </footer>

      </main>
    
    </div>
  );
}
