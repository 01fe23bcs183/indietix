import { Button } from "@indietix/ui";

export default function Home(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">IndieTix Web OK</h1>
        <p className="text-muted-foreground mb-8">
          Customer-facing event booking platform
        </p>
        <Button>Get Started</Button>
      </div>
    </main>
  );
}
