"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { COUNTRIES } from "@/lib/domain/countries";
import type { AppLocale } from "@/lib/i18n";

type AccountFormProps = {
  locale: AppLocale;
  email: string;
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialCountryCode: string;
};

const COPY: Record<
  AppLocale,
  {
    title: string;
    subtitle: string;
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    email: string;
    saving: string;
    save: string;
    saveError: string;
    saveOk: string;
  }
> = {
  es: {
    title: "Datos personales",
    subtitle: "Edita la informacion usada en tu cuenta y tablas.",
    firstName: "Nombre",
    lastName: "Apellido",
    phone: "Telefono",
    country: "Pais",
    email: "Email",
    saving: "Guardando...",
    save: "Guardar cambios",
    saveError: "No se pudo actualizar el perfil.",
    saveOk: "Perfil actualizado.",
  },
  en: {
    title: "Personal data",
    subtitle: "Edit account information used in standings and leagues.",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    country: "Country",
    email: "Email",
    saving: "Saving...",
    save: "Save changes",
    saveError: "Could not update profile.",
    saveOk: "Profile updated.",
  },
  pt: {
    title: "Dados pessoais",
    subtitle: "Edite as informacoes usadas na conta e nas tabelas.",
    firstName: "Nome",
    lastName: "Sobrenome",
    phone: "Telefone",
    country: "Pais",
    email: "Email",
    saving: "Salvando...",
    save: "Salvar alteracoes",
    saveError: "Nao foi possivel atualizar o perfil.",
    saveOk: "Perfil atualizado.",
  },
};

export function AccountForm({ locale, email, initialFirstName, initialLastName, initialPhone, initialCountryCode }: AccountFormProps) {
  const copy = COPY[locale];
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [countryCode, setCountryCode] = useState(initialCountryCode || "AR");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsPending(true);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        countryCode,
      }),
    });

    const payload = await response.json();
    setIsPending(false);

    if (!response.ok) {
      setError(payload.error ?? copy.saveError);
      return;
    }

    setInfo(copy.saveOk);
    router.refresh();
  }

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">{copy.title}</h2>
      <p className="section-subtitle mt-2 text-sm">{copy.subtitle}</p>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.firstName}</span>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="input-tech"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.lastName}</span>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="input-tech"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.phone}</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            minLength={6}
            maxLength={25}
            className="input-tech"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.country}</span>
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            required
            className="select-tech"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.email}</span>
          <input
            value={email}
            readOnly
            className="input-tech cursor-not-allowed opacity-80"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? copy.saving : copy.save}
          </button>
        </div>
      </form>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}
    </section>
  );
}
