import { useEffect, useState } from "react";

import { getApiHealth } from "./lib/health";
import "./App.css";

type ApiStatus = "checking" | "online" | "offline";

const statusLabels: Record<ApiStatus, string> = {
  checking: "Проверяем API",
  online: "API работает",
  offline: "API недоступен",
};

export default function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    getApiHealth()
      .then(() => {
        if (isMounted) setApiStatus("online");
      })
      .catch(() => {
        if (isMounted) setApiStatus("offline");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CookAssistant, главная">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>cook<span className="brand-light">assistant</span></span>
        </a>
        <span className={`api-indicator api-indicator--${apiStatus}`} role="status">
          <span className="api-dot" aria-hidden="true" />
          {statusLabels[apiStatus]}
        </span>
      </header>

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p className="eyebrow">ПРОСТРАНСТВО ДЛЯ ВАШИХ РЕЦЕПТОВ</p>
          <h1 id="welcome-title">Хорошая еда начинается с хороших записей.</h1>
          <p className="intro">
            Скоро здесь появится ваша личная коллекция: всё любимое, понятное и под рукой.
          </p>
          <div className="next-step">
            <span className="step-number">01</span>
            <div>
              <p className="step-title">Основа проекта готова</p>
              <p className="step-description">Добавление рецептов появится на следующем этапе.</p>
            </div>
          </div>
        </div>

        <aside className="recipe-preview" aria-label="Пример заметки о рецепте">
          <div className="preview-topline">
            <span>ВАША КОЛЛЕКЦИЯ</span>
            <span className="preview-sparkle" aria-hidden="true">✳</span>
          </div>
          <div className="plate" aria-hidden="true">
            <div className="plate-center">
              <span className="herb herb-one" />
              <span className="herb herb-two" />
              <span className="herb herb-three" />
              <span className="tomato tomato-one" />
              <span className="tomato tomato-two" />
              <span className="pasta pasta-one" />
              <span className="pasta pasta-two" />
              <span className="pasta pasta-three" />
            </div>
          </div>
          <div className="preview-caption">
            <span className="preview-category">ИЗБРАННОЕ · 01</span>
            <span className="preview-line" />
            <span className="preview-category">СОХРАНИТЕ СВОЙ ПЕРВЫЙ РЕЦЕПТ</span>
          </div>
          <div className="preview-note" aria-hidden="true">
            <span>ваш рецепт</span>
            <span className="note-arrow">↙</span>
          </div>
        </aside>
      </section>

      <footer className="page-footer">
        <span>ВАША КУХНЯ. ВАШИ ПРАВИЛА.</span>
        <span>СОЗДАНО ДЛЯ ДОМАШНИХ РЕЦЕПТОВ</span>
      </footer>
    </main>
  );
}
