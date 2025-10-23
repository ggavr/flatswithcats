import Link from 'next/link';
import styles from './page.module.css';

const steps = [
  {
    number: '1',
    title: 'Создай анкету',
    text: 'Расскажи о себе, своём коте (или котах!) и вашей квартире другим участникам комьюнити.',
    image:
      'https://framerusercontent.com/images/BenVyclI1ZlCnXBgfTWRFF1li3Q.png?scale-down-to=1024&width=1024&height=1024',
    imageAlt: 'Кот заполняет анкету на ноутбуке'
  },
  {
    number: '2',
    title: 'Найди вариант',
    text: 'Найди хозяев с похожими датами поездки и договорись об обмене.',
    image:
      'https://framerusercontent.com/images/x5mhk18eDoQ9NC8DmFOQWAJlIM.png?scale-down-to=1024&width=1024&height=1024',
    imageAlt: 'Кот ищет жильё'
  },
  {
    number: '3',
    title: 'Путешествуй',
    text: 'Живи как местный, ухаживая за котом, пока кто-то заботится о твоём.',
    image:
      'https://framerusercontent.com/images/3yhGKhP8PUL3pMeJrIm5tAiXWc.png?scale-down-to=1024&width=1024&height=1024',
    imageAlt: 'Кот путешествует с чемоданом'
  }
];

const features = [
  {
    title: '(Почти) бесплатные путешествия',
    text: 'Живёшь как местный и без трат на аренду жилья.',
    placeholder: styles.placeholderSquare
  },
  {
    title: 'Котейка всегда под присмотром',
    text: 'Спокойно оставляешь его дома и путешествуешь когда хочешь.',
    placeholder: styles.placeholderCircle
  },
  {
    title: 'Новые друзья по всему миру',
    text: 'Комьюнити, построенное на доверии и любви к котикам.',
    placeholder: styles.placeholderTriangle
  }
];

const testimonials = [
  {
    quote: '«Жила в Париже у Ксюши и её кота Ефима — самое уютное путешествие!»',
    name: 'Анна',
    location: 'Барселона'
  },
  {
    quote: '«Съездил в Берлин, пока мой кот принимал гостей дома 😀»',
    name: 'Алексей',
    location: 'Амстердам'
  },
  {
    quote: '«Наконец нашла способ путешествовать и не переживать о котах»',
    name: 'Мария',
    location: 'Лиссабон'
  }
];

const foundersStory = [
  'Мы, Гавр и Оля, создали это сообщество прежде всего для себя. У нас самих два кота – Яков и Мелисса, и из-за них мы редко уезжаем в отпуск.',
  'Пушистых сложно возить с собой, найти котоняню – не менее трудно. Однажды нас осенило: лучше всего о наших котиках могут позаботиться такие же котовладельцы, как и мы!',
  'Те, кого не нужно предупреждать о внезапных тыгыдыках и громком копании в лотке, кто знает, как кормить, ухаживать и уделять внимание. Мы очень любим наших котов и хотим, чтобы ваши хвостики были в надёжных руках, пока вы отдыхаете 🖤',
  'Всем кусь!'
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.top}>
          <div className={styles.brand}>Flats with Cats®</div>
          <nav className={styles.links}>
            <a className={styles.link} href="#how">
              Как это работает
            </a>
            <a className={styles.link} href="#benefits">
              Преимущества
            </a>
            <a className={styles.link} href="#community">
              Комьюнити
            </a>
            <a className={styles.link} href="#testimonials">
              Отзывы
            </a>
          </nav>
        </header>

        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Меняйся домами с другими котововладельцами по всему миру 🐾
          </h1>
          <p className={styles.heroSubtitle}>
            Путешествуй без забот благодаря заботе о котиках из других городов и стран 🐈
          </p>
          <a className={styles.anchor} href="#how">
            Как это работает
          </a>
        </section>

        <section id="how" className={styles.steps}>
          {steps.map((step, index) => (
            <article
              key={step.number}
              className={`${styles.stepRow} ${index % 2 !== 0 ? styles.stepRowReverse : ''}`}
            >
              <img
                className={styles.stepImage}
                src={step.image}
                alt={step.imageAlt}
                loading="lazy"
              />
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {step.number}. {step.title}
                </h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="benefits" className={styles.features}>
          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <article key={feature.title} className={styles.feature}>
                <div
                  className={`${styles.featurePlaceholder} ${feature.placeholder}`}
                  aria-hidden="true"
                />
                <div className={styles.featureTitle}>{feature.title}</div>
                <p className={styles.featureText}>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="community" className={styles.community}>
          <div className={styles.communityTitle}>Закрытое комьюнити в Telegram</div>
          <p className={styles.communityText}>
            Заполни анкету и получи доступ к чату и каналу. Следи за новыми обменами, находи
            попутчиков и делись отзывами с теми, кто понимает любовь к хвостатым.
          </p>
          <div className={styles.communityActions}>
            <a
              className={styles.button}
              href="https://t.me/flatsandcats_bot"
              target="_blank"
              rel="noreferrer"
            >
              Перейти в бот
            </a>
            <a
              className={styles.linkAlt}
              href="https://t.me/+tsZSCk6Oeew1OTNi"
              target="_blank"
              rel="noreferrer"
            >
              Вступить в чат
            </a>
          </div>
        </section>

        <section id="testimonials" className={styles.testimonials}>
          <div className={styles.testimonialsGrid}>
            {testimonials.map((item) => (
              <article key={item.name} className={styles.testimonial}>
                <p className={styles.quote}>{item.quote}</p>
                <div>
                  <div className={styles.person}>{item.name}</div>
                  <div className={styles.location}>{item.location}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.founders}>
          <div className={styles.foundersTitle}>Несколько слов от создателей</div>
          {foundersStory.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <footer className={styles.footer}>
          <div className={styles.brand}>Flats with Cats</div>
          <div className={styles.footerLinks}>
            <a
              className={styles.footerLink}
              href="https://t.me/+tsZSCk6Oeew1OTNi"
              target="_blank"
              rel="noreferrer"
            >
              Telegram-чат
            </a>
            <a
              className={styles.footerLink}
              href="https://t.me/+5tMK4aVnf782MzQy"
              target="_blank"
              rel="noreferrer"
            >
              Telegram-канал
            </a>
            <Link className={styles.footerLink} href="/policy">
              Политика (плейсхолдер)
            </Link>
          </div>
          <div>© 2025 Flats with Cats</div>
        </footer>
      </div>
    </div>
  );
}
