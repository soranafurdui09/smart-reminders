# Android Test Checklist

1) Instaleaza aplicatia Android (Capacitor), autentifica-te.
2) Verifica heartbeat:
   - in DB `device_installations` exista user_id, platform=android, last_seen_at recent.
   - in web, UI pentru push dispare si apare mesajul “Notificarile sunt gestionate prin aplicatia Android.”
3) Creeaza reminder „in 5 minute” -> local notification apare la timp.
4) Editeaza reminderul (ora) -> notificarea veche se re-programeaza.
5) Sterge reminderul -> notificarea programata dispare.
6) Logout -> toate notificarile locale sunt anulate.
7) Web-only user (fara heartbeat activ):
   - poate activa push web
   - primeste push din worker/cron.
