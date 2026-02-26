"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AccountFormProps = {
  email: string;
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
};

export function AccountForm({ email, initialFirstName, initialLastName, initialPhone }: AccountFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
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
      }),
    });

    const payload = await response.json();
    setIsPending(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo actualizar el perfil.");
      return;
    }

    setInfo("Perfil actualizado.");
    router.refresh();
  }

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">Datos personales</h2>
      <p className="section-subtitle mt-2 text-sm">Edita la informacion usada en tu cuenta y tablas.</p>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm">
          <span className="label-tech block">Nombre</span>
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
          <span className="label-tech block">Apellido</span>
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
          <span className="label-tech block">Telefono</span>
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
          <span className="label-tech block">Email</span>
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
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}
    </section>
  );
}
