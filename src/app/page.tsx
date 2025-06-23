import { ConversionFlow } from '@/components/conversion-flow';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary sm:text-5xl md:text-6xl">
          PDF2MD
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Convert your PDF files to Markdown with ease, retaining structure and assets.
        </p>
      </header>
      <main className="w-full">
        <ConversionFlow />
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PDF2MD. All rights reserved.</p>
      </footer>
    </div>
  );
}
