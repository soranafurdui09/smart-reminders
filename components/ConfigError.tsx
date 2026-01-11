import { messages, type Locale } from '@/lib/i18n';

export default function ConfigError({ missing, locale }: { missing: string[]; locale: Locale }) {
  const copy = messages[locale];
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-10">
      <div className="card space-y-4">
        <h1 className="text-2xl font-semibold">{copy.config.title}</h1>
        <p className="text-sm text-slate-600">{copy.config.intro}</p>
        <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          <div className="font-semibold">{copy.config.missing}</div>
          <ul className="mt-2 list-disc pl-5">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-500">{copy.config.help}</p>
      </div>
    </main>
  );
}
