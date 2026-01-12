import { messages, type Locale } from '@/lib/i18n';

export default function ConfigError({ missing, locale }: { missing: string[]; locale: Locale }) {
  const copy = messages[locale];
  return (
    <main className="min-h-screen">
      <div className="page-wrap flex min-h-screen items-center">
        <div className="card w-full max-w-2xl space-y-4">
          <h1>{copy.config.title}</h1>
          <p className="text-sm text-muted">{copy.config.intro}</p>
          <div className="rounded-xl bg-surfaceMuted p-3 text-sm text-ink">
            <div className="font-semibold">{copy.config.missing}</div>
            <ul className="mt-2 list-disc pl-5 text-muted">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted">{copy.config.help}</p>
        </div>
      </div>
    </main>
  );
}
