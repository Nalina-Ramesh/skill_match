import React, { useState } from "react";
import { BriefcaseBusiness, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { signIn, signUp } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (isSignup) await signUp(name, email, password);
      else await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-layout">
        <section className="auth-brand-panel">
          <Link className="auth-brand" to="/login" aria-label="SkillMatch home">
            <span className="auth-brand-mark">
              <BriefcaseBusiness size={21} />
            </span>
            <span>SkillMatch</span>
          </Link>
          <div className="auth-brand-copy">
            <span className="auth-kicker">PEOPLE, SKILLS, PROJECTS</span>
            <h1>Make room for great work.</h1>
            <p>
              Keep your team and project workspace together, ready for the next
              thing that needs doing.
            </p>
          </div>
          <span className="auth-brand-foot">Your workspace starts empty.</span>
        </section>

        <section className="auth-form-panel">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">
              <BriefcaseBusiness size={19} />
            </span>
            <span>SkillMatch</span>
          </div>
          <div className="auth-form-wrap">
            <span className="auth-kicker">
              {isSignup ? "GET STARTED" : "WELCOME BACK"}
            </span>
            <h2>
              {isSignup ? "Create your account" : "Sign in to SkillMatch"}
            </h2>
            <p className="auth-intro">
              {isSignup
                ? "Set up your account to create a private workspace."
                : "Use your account details to open your workspace."}
            </p>

            <form className="auth-form" onSubmit={submit}>
              {isSignup && (
                <label>
                  Name
                  <span className="auth-input-wrap">
                    <UserRound size={17} />
                    <input
                      autoComplete="name"
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </span>
                </label>
              )}
              <label>
                Email address
                <span className="auth-input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                </span>
              </label>
              <label>
                Password
                <span className="auth-input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type="password"
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                    minLength={isSignup ? 10 : undefined}
                    maxLength={256}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isSignup ? "At least 10 characters" : "Password"
                    }
                    required
                  />
                </span>
              </label>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <button
                className="auth-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Please wait…"
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            <p className="auth-switch">
              {isSignup ? "Already have an account?" : "New to SkillMatch?"}{" "}
              <Link to={isSignup ? "/login" : "/signup"}>
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </div>
          <span className="auth-privacy">
            Private account · Separate workspace
          </span>
        </section>
      </div>
    </main>
  );
}
