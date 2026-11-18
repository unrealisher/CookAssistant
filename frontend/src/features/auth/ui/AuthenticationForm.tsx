import { FormEvent, useState } from "react";

import { authApi } from "../../../entities/user/api/auth-api";
import type { Credentials, User } from "../../../entities/user/model/types";
import { ApiError } from "../../../shared/api/client";

interface AuthenticationFormProps {
  setupRequired: boolean;
  onAuthenticated: (user: User) => void;
}

export function AuthenticationForm({
  setupRequired,
  onAuthenticated,
}: AuthenticationFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const credentials: Credentials = { username: username.trim(), password };
    try {
      const user = setupRequired ? await authApi.setup(credentials) : await authApi.login(credentials);
      onAuthenticated(user);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "Аккаунт уже создан. Войдите с его данными."
          : cause instanceof ApiError && cause.status === 401
            ? "Неверное имя пользователя или пароль. Проверьте данные и попробуйте снова."
          : cause instanceof Error
            ? cause.message
            : "Не удалось выполнить вход. Попробуйте ещё раз.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <p className="eyebrow">ВАША ЛИЧНАЯ КОЛЛЕКЦИЯ</p>
      <h1 id="auth-title">{setupRequired ? "Создайте аккаунт владельца" : "С возвращением"}</h1>
      <p className="auth-intro">
        {setupRequired
          ? "Это единственный аккаунт для доступа к рецептам на этом компьютере."
          : "Войдите, чтобы открыть свои рецепты."}
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Имя пользователя</span>
          <input
            autoComplete="username"
            maxLength={64}
            name="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            autoComplete={setupRequired ? "new-password" : "current-password"}
            minLength={12}
            maxLength={256}
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {setupRequired && <small>Не менее 12 символов.</small>}
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Подождите…" : setupRequired ? "Создать аккаунт" : "Войти"}
        </button>
      </form>
    </section>
  );
}
