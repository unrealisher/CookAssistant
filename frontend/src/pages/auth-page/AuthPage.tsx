import type { User } from "../../entities/user/model/types";
import { AuthenticationForm } from "../../features/auth/ui/AuthenticationForm";

interface AuthPageProps {
  setupRequired: boolean;
  onAuthenticated: (user: User) => void;
}

export function AuthPage({ setupRequired, onAuthenticated }: AuthPageProps) {
  return (
    <div className="auth-page">
      <div className="auth-aside" aria-hidden="true">
        <span className="auth-aside-kicker">COOKASSISTANT · ЛИЧНАЯ КУЛИНАРНАЯ КНИГА</span>
        <div className="auth-plate"><span className="auth-herb" /><span className="auth-tomato" /><span className="auth-pasta" /></div>
        <p>Вкусные привычки<br />начинаются с заметки.</p>
      </div>
      <AuthenticationForm setupRequired={setupRequired} onAuthenticated={onAuthenticated} />
    </div>
  );
}
