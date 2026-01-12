import { cookies } from 'next/headers';

export type Locale = 'ro' | 'en';

export const defaultLocale: Locale = 'ro';

export const messages = {
  ro: {
    appName: 'Reminder inteligent',
    nav: {
      dashboard: 'Dashboard',
      newReminder: 'Reminder nou',
      calendar: 'Calendar',
      history: 'Istoric',
      household: 'Household',
      settings: 'Setari',
      logout: 'Logout'
    },
    common: {
      back: 'Inapoi',
      create: 'Creeaza',
      save: 'Salveaza',
      details: 'Detalii',
      email: 'Email',
      role: 'Rol',
      done: 'Finalizat',
      snooze10: '+10 min',
      snooze60: '+1 ora',
      snoozeTomorrow: 'Maine',
      statusAccepted: 'acceptat',
      statusPending: 'pending',
      statusOpen: 'Deschis',
      statusSnoozed: 'Amanat'
    },
    landing: {
      login: 'Login',
      startFree: 'Start gratis',
      createAccount: 'Creeaza cont',
      demo: 'Vezi demo',
      heroTitle: 'Nu mai uita ITP-ul, dentistul sau curatarea centralei.',
      heroSubtitle: 'Remindere inteligente, partajate cu familia, email si actiuni rapide.',
      upcomingLabel: 'Urmeaza in 7 zile',
      upcomingTitle: 'ITP masina',
      upcomingNotify: 'Notifica: email',
      familyShare: 'Family share: membrii household-ului primesc remindere si pot marca Done.'
    },
    auth: {
      title: 'Autentificare',
      subtitle: 'Login rapid cu Google sau magic link.',
      back: 'Inapoi',
      or: 'sau',
      checkEmail: 'Verifica emailul pentru link-ul de autentificare.',
      errorMissingEmail: 'Introdu un email valid.',
      errorOauthNotConfigured: 'Google OAuth nu este configurat. Activeaza providerul in Supabase.',
      errorGeneric: 'Autentificarea a esuat. Incearca din nou.',
      googleButton: 'Continua cu Google',
      redirecting: 'Redirect...'
    },
    magicLink: {
      placeholder: 'email@exemplu.ro',
      sending: 'Se trimite...',
      button: 'Trimite magic link',
      invalidEmail: 'Introdu un email valid.',
      emailSent: 'Verifica emailul pentru link-ul de autentificare.',
      failedSend: 'Nu am putut trimite emailul. Verifica setarile Supabase.'
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Reminder-ele household-ului tau.',
      newReminder: 'Reminder nou',
      nextTitle: 'Urmatorul reminder',
      nextEmpty: 'Nimic programat inca. Creeaza primul reminder.',
      sectionTitle: 'Remindere',
      sectionSubtitle: 'Urmatoarele actiuni',
      empty: 'Nu ai remindere active.'
    },
    history: {
      title: 'Istoric',
      noHousehold: 'Nu ai inca un household.',
      createHousehold: 'Creeaza household',
      range7: 'Ultimele 7 zile',
      range30: 'Ultimele 30 zile',
      rangeAll: 'Tot istoricul',
      sectionTitle: 'Remindere finalizate',
      sectionSubtitle: 'Click pe un reminder pentru detalii.',
      empty: 'Nu exista remindere finalizate pentru acest interval.',
      detailsHint: 'Detalii →'
    },
    calendar: {
      title: 'Calendar',
      subtitle: 'Notificarile apar in ziua scadentei.',
      noHousehold: 'Nu ai inca un household.',
      createHousehold: 'Creeaza household',
      prev: 'Luna anterioara',
      next: 'Luna urmatoare',
      weekdays: ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'],
      empty: 'Fara notificari',
      more: 'mai multe'
    },
    remindersNew: {
      title: 'Reminder nou',
      subtitle: 'Creeaza un reminder simplu.',
      error: 'Nu am putut crea reminderul. Verifica datele.',
      aiTitle: 'AI Quick Add',
      aiPlaceholder: 'Ex: Plata chiriei in fiecare luna pe 1 la 9:00, reminder cu o zi inainte.',
      aiButton: 'Parseaza cu AI',
      aiLoading: 'Se proceseaza...',
      aiFailed: 'AI nu a putut procesa textul.',
      aiMissingText: 'Scrie un text pentru AI.',
      aiMissingHousehold: 'Creeaza un household inainte sa folosesti AI.',
      details: 'Detalii',
      titleLabel: 'Titlu',
      titlePlaceholder: 'Ex: Control dentist',
      notesLabel: 'Note (optional)',
      notesPlaceholder: 'Detalii suplimentare',
      dateLabel: 'Data/ora',
      repeatLabel: 'Repetare',
      preReminderLabel: 'Reminder inainte (minute)',
      assigneeLabel: 'Responsabil',
      assigneeNone: 'Neatribuit',
      recurrenceRuleLabel: 'Regula recurenta (RRULE)',
      recurrenceRulePlaceholder: 'Ex: FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0',
      once: 'O singura data',
      daily: 'Zilnic',
      weekly: 'Saptamanal',
      monthly: 'Lunar',
      create: 'Creeaza'
    },
    reminderDetail: {
      title: 'Reminder',
      notFound: 'Reminder-ul nu a fost gasit.',
      clone: 'Cloneaza',
      details: 'Detalii',
      schedule: 'Programare',
      firstDate: 'Prima data',
      occurrences: 'Occurrences'
    },
    household: {
      title: 'Household',
      subtitleCreate: 'Creeaza un household pentru familie.',
      subtitleManage: 'Administrare membri si invitatii.',
      createNameLabel: 'Nume household',
      createPlaceholder: 'Familia Popescu',
      createButton: 'Creeaza',
      membersTitle: 'Membri',
      invitesTitle: 'Invitatii',
      inviteTitle: 'Invita un membru',
      inviteSent: 'Invitatie trimisa pe email.',
      inviteReady: 'Invitatie pregatita:',
      inviteEmailFailed: 'Emailul nu a putut fi trimis. Copiaza linkul manual.',
      actionFailed: 'Actiunea a esuat. Incearca din nou.',
      noInvites: 'Nicio invitatie trimisa.',
      inviteAccepted: 'acceptat',
      invitePending: 'pending',
      inviteButton: 'Trimite invitatie',
      memberRoleLabel: 'Membru'
    },
    settings: {
      title: 'Setari',
      subtitle: 'Configureaza optiunile de notificari.',
      pushMissing: 'Lipsesc cheile VAPID. Completeaza `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` si `VAPID_SUBJECT`.'
    },
    language: {
      title: 'Limba',
      subtitle: 'Selecteaza limba implicita a aplicatiei.',
      ro: 'Romana',
      en: 'Engleza',
      updated: 'Limba a fost actualizata.'
    },
    push: {
      title: 'Push notifications',
      subtitle: 'Activeaza notificari direct in browser.',
      activate: 'Activeaza',
      deactivate: 'Dezactiveaza',
      enabling: 'Activare...',
      disabling: 'Dezactivare...',
      enabled: 'Push activat.',
      disabled: 'Push dezactivat.',
      notSupported: 'Browserul nu suporta push.'
    },
    invite: {
      title: 'Invitatie',
      missingToken: 'Token lipsa.',
      loginRequired: 'Trebuie sa te autentifici pentru a accepta invitatia.',
      login: 'Autentificare',
      accepted: 'Invitatia a fost acceptata.',
      invalid: 'Invitatie invalida.',
      expired: 'Invitatia a expirat.',
      alreadyAccepted: 'Invitatia a fost acceptata deja.',
      goDashboard: 'Mergi la dashboard'
    },
    billing: {
      title: 'Abonament',
      subtitle: 'Modulul de billing nu este inclus in acest MVP.'
    },
    config: {
      title: 'Configurare lipsa',
      intro: 'Aplicatia nu poate porni deoarece lipsesc variabilele de mediu necesare.',
      missing: 'Missing:',
      help: 'Completeaza `.env.local` folosind `.env.example`, apoi reporneste serverul.'
    }
  },
  en: {
    appName: 'Smart Reminder',
    nav: {
      dashboard: 'Dashboard',
      newReminder: 'New reminder',
      calendar: 'Calendar',
      history: 'History',
      household: 'Household',
      settings: 'Settings',
      logout: 'Logout'
    },
    common: {
      back: 'Back',
      create: 'Create',
      save: 'Save',
      details: 'Details',
      email: 'Email',
      role: 'Role',
      done: 'Done',
      snooze10: '+10 min',
      snooze60: '+1h',
      snoozeTomorrow: 'Tomorrow',
      statusAccepted: 'accepted',
      statusPending: 'pending',
      statusOpen: 'Open',
      statusSnoozed: 'Snoozed'
    },
    landing: {
      login: 'Login',
      startFree: 'Start free',
      createAccount: 'Create account',
      demo: 'See demo',
      heroTitle: 'Never miss your car check, dentist, or boiler service.',
      heroSubtitle: 'Smart reminders shared with family, email and quick actions.',
      upcomingLabel: 'Due in 7 days',
      upcomingTitle: 'Car inspection',
      upcomingNotify: 'Notify: email',
      familyShare: 'Family share: household members get reminders and can mark Done.'
    },
    auth: {
      title: 'Sign in',
      subtitle: 'Quick login with Google or magic link.',
      back: 'Back',
      or: 'or',
      checkEmail: 'Check your email for the login link.',
      errorMissingEmail: 'Enter a valid email.',
      errorOauthNotConfigured: 'Google OAuth is not configured. Enable it in Supabase.',
      errorGeneric: 'Authentication failed. Try again.',
      googleButton: 'Continue with Google',
      redirecting: 'Redirecting...'
    },
    magicLink: {
      placeholder: 'email@example.com',
      sending: 'Sending...',
      button: 'Send magic link',
      invalidEmail: 'Enter a valid email.',
      emailSent: 'Check your email for the login link.',
      failedSend: 'Could not send the email. Check Supabase settings.'
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Your household reminders.',
      newReminder: 'New reminder',
      nextTitle: 'Next reminder',
      nextEmpty: 'Nothing scheduled yet. Create your first reminder.',
      sectionTitle: 'Reminders',
      sectionSubtitle: 'Upcoming actions',
      empty: 'No active reminders yet.'
    },
    history: {
      title: 'History',
      noHousehold: "You don't have a household yet.",
      createHousehold: 'Create household',
      range7: 'Last 7 days',
      range30: 'Last 30 days',
      rangeAll: 'All history',
      sectionTitle: 'Completed reminders',
      sectionSubtitle: 'Click a reminder for details.',
      empty: 'No completed reminders in this range.',
      detailsHint: 'Details →'
    },
    calendar: {
      title: 'Calendar',
      subtitle: 'Notifications are shown on their due date.',
      noHousehold: "You don't have a household yet.",
      createHousehold: 'Create household',
      prev: 'Previous month',
      next: 'Next month',
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      empty: 'No notifications',
      more: 'more'
    },
    remindersNew: {
      title: 'New reminder',
      subtitle: 'Create a simple reminder.',
      error: 'Could not create the reminder. Check the details.',
      aiTitle: 'AI Quick Add',
      aiPlaceholder: 'e.g. Pay rent on the 1st of every month at 9am, remind me the day before.',
      aiButton: 'Parse with AI',
      aiLoading: 'Parsing...',
      aiFailed: 'AI could not parse the text.',
      aiMissingText: 'Enter some text for AI.',
      aiMissingHousehold: 'Create a household before using AI.',
      details: 'Details',
      titleLabel: 'Title',
      titlePlaceholder: 'e.g. Dentist checkup',
      notesLabel: 'Notes (optional)',
      notesPlaceholder: 'Extra details',
      dateLabel: 'Date/time',
      repeatLabel: 'Repeat',
      preReminderLabel: 'Pre-reminder (minutes)',
      assigneeLabel: 'Assignee',
      assigneeNone: 'Unassigned',
      recurrenceRuleLabel: 'Recurrence rule (RRULE)',
      recurrenceRulePlaceholder: 'e.g. FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0',
      once: 'Once',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      create: 'Create'
    },
    reminderDetail: {
      title: 'Reminder',
      notFound: 'Reminder not found.',
      clone: 'Clone',
      details: 'Details',
      schedule: 'Schedule',
      firstDate: 'First date',
      occurrences: 'Occurrences'
    },
    household: {
      title: 'Household',
      subtitleCreate: 'Create a household for your family.',
      subtitleManage: 'Manage members and invites.',
      createNameLabel: 'Household name',
      createPlaceholder: 'Smith family',
      createButton: 'Create',
      membersTitle: 'Members',
      invitesTitle: 'Invites',
      inviteTitle: 'Invite a member',
      inviteSent: 'Invite sent by email.',
      inviteReady: 'Invite ready:',
      inviteEmailFailed: 'Email could not be sent. Copy the invite link manually.',
      actionFailed: 'Action failed. Try again.',
      noInvites: 'No invites sent yet.',
      inviteAccepted: 'accepted',
      invitePending: 'pending',
      inviteButton: 'Send invite',
      memberRoleLabel: 'Member'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Configure notification options.',
      pushMissing: 'VAPID keys missing. Fill `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.'
    },
    language: {
      title: 'Language',
      subtitle: 'Select the default app language.',
      ro: 'Romanian',
      en: 'English',
      updated: 'Language updated.'
    },
    push: {
      title: 'Push notifications',
      subtitle: 'Enable notifications in your browser.',
      activate: 'Enable',
      deactivate: 'Disable',
      enabling: 'Enabling...',
      disabling: 'Disabling...',
      enabled: 'Push enabled.',
      disabled: 'Push disabled.',
      notSupported: 'Your browser does not support push.'
    },
    invite: {
      title: 'Invitation',
      missingToken: 'Missing token.',
      loginRequired: 'You need to sign in to accept the invite.',
      login: 'Sign in',
      accepted: 'Invite accepted.',
      invalid: 'Invalid invite.',
      expired: 'Invite expired.',
      alreadyAccepted: 'Invite already accepted.',
      goDashboard: 'Go to dashboard'
    },
    billing: {
      title: 'Subscription',
      subtitle: 'Billing is not included in this MVP.'
    },
    config: {
      title: 'Missing configuration',
      intro: 'The app cannot start because required environment variables are missing.',
      missing: 'Missing:',
      help: 'Fill `.env.local` using `.env.example`, then restart the server.'
    }
  }
} as const;

export function normalizeLocale(value?: string | null): Locale {
  return value === 'en' ? 'en' : 'ro';
}

export function getLocaleFromCookie(): Locale {
  const value = cookies().get('locale')?.value;
  return normalizeLocale(value);
}

export function getLocaleTag(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'ro-RO';
}
