import Image from 'next/image';
import Navbar from './_app';

export default function Home() {
  return (
    <div>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl flex items-center justify-between font-mono text-sm lg:flex">

        </div>
      </main>
    </div>
  );
}
