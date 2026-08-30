import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useAvailableScreens } from "../hooks/useAvailableScreens";
import AppShell from "../components/AppShell";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_CARD } from "../styles/uiEffects";

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const available = useAvailableScreens();

  return (
    <AppShell>
    <div className="bg-[var(--bg)] h-full flex items-center justify-center p-8">
      <div className={`w-full max-w-sm rounded-xl p-8 ${GLOSSY_CARD}`}>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-1">{t("home.welcome")}, {user?.username}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">{user?.role_name}</p>

        {available.length > 0 ? (
          <div className="space-y-2">
            {available.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className={`block w-full text-center py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
              >
                {t(s.label)}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No screens are built for the {user?.role_name} role yet — Reports and the Store
            Manager dashboard are planned but not implemented. Nothing is broken; there's just
            nowhere to send you yet.
          </p>
        )}
      </div>
    </div>
    </AppShell>
  );
}
