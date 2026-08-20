"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />

      <footer className="footer section-padding">
        <div className="container">
          <p>© {new Date().getFullYear()} RutaCorp - Derechos reservados</p>
        </div>
      </footer>

      <style jsx>{`
        .footer {
          background-color: var(--color-text-main);
          color: var(--color-text-light);
          text-align: center;
          padding: var(--space-md) 0;
        }
        
        .footer p {
          opacity: 0.7;
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}
