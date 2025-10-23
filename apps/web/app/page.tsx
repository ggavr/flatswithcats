export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px', lineHeight: 1.6 }}>
      <header style={{ marginBottom: 56 }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, color: '#38bdf8' }}>
          Cats & Flats
        </p>
        <h1 style={{ fontSize: 48, margin: '16px 0 24px' }}>
          Соединяем котов и людей через обмен жильём
        </h1>
        <p style={{ maxWidth: 580, fontSize: 18, opacity: 0.9 }}>
          Телеграм-бот, веб-мини-приложение и полноценный сайт работают на едином ядре. Заполняйте анкету, 
          публикуйте объявления и следите за статусом из любого интерфейса.
        </p>
      </header>

      <section style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <article style={{ padding: 24, borderRadius: 16, background: 'rgba(15, 23, 42, 0.4)' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Мини‑эпп</h2>
          <p style={{ opacity: 0.85 }}>
            Запускается в Telegram, автоматически авторизует пользователя и позволяет обновлять анкету,
            готовить объявление с предпросмотром, публиковать его в канал в один клик.
          </p>
        </article>
        <article style={{ padding: 24, borderRadius: 16, background: 'rgba(15, 23, 42, 0.4)' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Публичный сайт</h2>
          <p style={{ opacity: 0.85 }}>
            Представляет проект, делится правилами сообщества и привлекает новых участников. Фронтенд готов к 
            расширению — от SEO‑страниц до каталога объявлений.
          </p>
        </article>
        <article style={{ padding: 24, borderRadius: 16, background: 'rgba(15, 23, 42, 0.4)' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Единое API</h2>
          <p style={{ opacity: 0.85 }}>
            Все клиенты используют REST‑эндпоинты: анкеты, объявления, публикации и валидации лежат в общей доменной
            библиотеке Node.js. Это снижает дублирование и ускоряет разработку.
          </p>
        </article>
      </section>

      <footer style={{ marginTop: 64, fontSize: 14, opacity: 0.6 }}>
        <p>API по умолчанию доступно на <code>http://localhost:8080</code>. Измените переменную окружения
          <code> NEXT_PUBLIC_API_BASE_URL</code>, чтобы задать свой URL.</p>
      </footer>
    </main>
  );
}
