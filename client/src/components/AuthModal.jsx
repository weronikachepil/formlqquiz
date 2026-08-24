import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import { useAuthModal } from "../context/AuthModalContext";

export default function AuthModal() {
  const { state, switchMode, close } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [state]);

  if (!state) return null;

  function handleSuccess() {
    const { redirect } = state;
    close();
    if (redirect) navigate(redirect);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8 bg-black/30 backdrop-blur-md modal-backdrop-in"
      onClick={close}
    >
      <div className="w-full max-w-[420px] modal-card-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center font-script text-4xl font-bold text-accent-dark mb-5">formlq</div>
        {state.mode === "login" ? (
          <Login
            variant="modal"
            redirectOverride={state.redirect}
            emailOverride={state.email}
            onSuccess={handleSuccess}
            onSwitchToRegister={() => switchMode("register")}
          />
        ) : (
          <Register
            variant="modal"
            redirectOverride={state.redirect}
            emailOverride={state.email}
            onSuccess={handleSuccess}
            onSwitchToLogin={() => switchMode("login")}
          />
        )}
        <button type="button" onClick={close} className="btn btn-ghost btn-block mt-3">
          Скасувати
        </button>
      </div>
    </div>
  );
}
