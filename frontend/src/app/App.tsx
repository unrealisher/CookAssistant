import { useCallback, useEffect, useState } from "react";

import { authApi } from "../entities/user/api/auth-api";
import type { User } from "../entities/user/model/types";
import { ApiError } from "../shared/api/client";
import { getApiHealth } from "../shared/api/health";
import { AppHeader } from "../widgets/app-header/AppHeader";
import { AuthPage } from "../pages/auth-page/AuthPage";
import { CollectionPage } from "../pages/collection-page/CollectionPage";
import { DetailPage } from "../pages/detail-page/DetailPage";
import { EditorPage } from "../pages/editor-page/EditorPage";
import "./styles.css";

type AppStatus = "checking" | "offline" | "auth" | "ready";
type View =
  | { page: "collection" }
  | { page: "detail"; recipeId: number }
  | { page: "editor"; recipeId?: number; returnTo: "collection" | "detail" };

export default function App() {
  const [status, setStatus] = useState<AppStatus>("checking");
  const [setupRequired, setSetupRequired] = useState(false);
  const [user, setUser] = useState<User | undefined>();
  const [view, setView] = useState<View>({ page: "collection" });
  const [retryKey, setRetryKey] = useState(0);
  const [appError, setAppError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setStatus("checking");
    setAppError("");

    async function restoreSession() {
      try {
        await getApiHealth();
        const setup = await authApi.getSetupStatus();
        if (!isCurrent) return;
        setSetupRequired(setup.setup_required);
        if (setup.setup_required) {
          setStatus("auth");
          return;
        }

        try {
          const currentUser = await authApi.getCurrentUser();
          if (!isCurrent) return;
          setUser(currentUser);
          setStatus("ready");
        } catch (cause) {
          if (!isCurrent) return;
          if (cause instanceof ApiError && cause.status === 401) {
            setStatus("auth");
            return;
          }
          throw cause;
        }
      } catch (cause) {
        if (!isCurrent) return;
        setAppError(cause instanceof Error ? cause.message : "Не удалось подключиться к серверу.");
        setStatus("offline");
      }
    }

    void restoreSession();
    return () => { isCurrent = false; };
  }, [retryKey]);

  const handleUnauthorized = useCallback(() => {
    setUser(undefined);
    setSetupRequired(false);
    setStatus("auth");
    setView({ page: "collection" });
  }, []);

  async function handleLogout() {
    setAppError("");
    try {
      await authApi.logout();
      setUser(undefined);
      setSetupRequired(false);
      setView({ page: "collection" });
      setStatus("auth");
    } catch (cause) {
      setAppError(cause instanceof Error ? cause.message : "Не удалось завершить сеанс.");
    }
  }

  function handleAuthenticated(authenticatedUser: User) {
    setUser(authenticatedUser);
    setSetupRequired(false);
    setView({ page: "collection" });
    setStatus("ready");
  }

  function renderPage() {
    if (view.page === "collection") {
      return <CollectionPage
        onCreate={() => setView({ page: "editor", returnTo: "collection" })}
        onOpen={(recipeId) => setView({ page: "detail", recipeId })}
        onUnauthorized={handleUnauthorized}
      />;
    }
    if (view.page === "detail") {
      return <DetailPage
        recipeId={view.recipeId}
        onBack={() => setView({ page: "collection" })}
        onEdit={(recipeId) => setView({ page: "editor", recipeId, returnTo: "detail" })}
        onDeleted={() => setView({ page: "collection" })}
        onUnauthorized={handleUnauthorized}
      />;
    }
    return <EditorPage
      recipeId={view.recipeId}
      onCancel={() => setView(view.returnTo === "detail" && view.recipeId
        ? { page: "detail", recipeId: view.recipeId }
        : { page: "collection" })}
      onSaved={(recipe) => setView({ page: "detail", recipeId: recipe.id })}
      onUnauthorized={handleUnauthorized}
    />;
  }

  return (
    <div className="app-shell">
      <div className="page-shell">
        <AppHeader
          user={status === "ready" ? user : undefined}
          onHome={() => setView({ page: "collection" })}
          onLogout={status === "ready" ? handleLogout : undefined}
        />
        <main className={`main-content${status === "auth" ? " main-content--auth" : ""}`}>
          {status === "checking" && (
            <div className="loading-state app-loading" role="status"><span className="loading-spinner" /> Подключаем вашу кулинарную книгу…</div>
          )}
          {status === "offline" && (
            <section className="offline-state" aria-labelledby="offline-title">
              <p className="eyebrow">СЕРВЕР НЕ ОТВЕЧАЕТ</p>
              <h1 id="offline-title">Не удалось подключиться</h1>
              <p>{appError || "Запустите локальный сервер и попробуйте снова."}</p>
              <button className="button button--primary" onClick={() => setRetryKey((key) => key + 1)} type="button">Попробовать снова</button>
            </section>
          )}
          {status === "auth" && <AuthPage setupRequired={setupRequired} onAuthenticated={handleAuthenticated} />}
          {status === "ready" && <>
            {appError && <p className="notice notice--error global-notice" role="alert">{appError}</p>}
            {renderPage()}
          </>}
        </main>
        <footer className="page-footer">
          <span>ВАША КУХНЯ. ВАШИ ПРАВИЛА.</span>
          <span>СОЗДАНО ДЛЯ ДОМАШНИХ РЕЦЕПТОВ</span>
        </footer>
      </div>
    </div>
  );
}
