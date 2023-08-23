import Image from 'next/image';
import Navbar from './_app';

export default function Home() {
  return (
    <div>
      <Navbar /> {/* Include the Bootstrap Navbar component here */}
      
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl flex items-center justify-between font-mono text-sm lg:flex">
          <nav className="nav">
            <a className="nav-link active" aria-current="page" href="#">
              Active
            </a>
            <a className="nav-link" href="#">
              Link
            </a>
            <a className="nav-link" href="#">
              Link
            </a>
          </nav>
          <p className="m-0 max-w-[300px] text-sm opacity-50">
            Personal Website
          </p>
        </div>
      </main>
    </div>
  );
}
