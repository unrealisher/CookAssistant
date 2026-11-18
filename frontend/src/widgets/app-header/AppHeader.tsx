import type { User } from "../../entities/user/model/types";

interface AppHeaderProps {
  user?: User;
  onHome: () => void;
  onLogout?: () => void;
}

export function AppHeader({ user, onHome, onLogout }: AppHeaderProps) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} type="button" aria-label="CookAssistant, коллекция">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>cook<span className="brand-light">assistant</span></span>
      </button>
      <div className="topbar-account">
        {user && <span className="account-name">{user.username}</span>}
        {onLogout && (
          <button className="button button--quiet button--small" onClick={onLogout} type="button">
            Выйти
          </button>
        )}
      </div>
    </header>
  );
}
