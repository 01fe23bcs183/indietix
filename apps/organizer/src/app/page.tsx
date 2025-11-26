import { Button } from "@indietix/ui";

export default function Home(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Organizer OK</h1>
        <p className="text-muted-foreground mb-8">
          Event organizer dashboard (PWA-enabled)
        </p>
        <Button>Manage Events</Button>
      </div>
    </main>
  );
}
