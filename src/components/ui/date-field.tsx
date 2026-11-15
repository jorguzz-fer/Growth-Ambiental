"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  brParaISO,
  brParaInterno,
  brParaMes,
  internoParaBR,
  internoParaISO,
  isoParaBR,
  isoParaInterno,
  isoParaMes,
  mesParaBR,
  mesParaISO,
  mesmoValor,
} from "@/lib/datas-br";

interface BaseProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (internal: string) => void;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  className?: string;
  /** Nome acessível do campo de texto (o que o leitor de tela e os testes usam). */
  "aria-label"?: string;
}

/**
 * Campo de data: exibe/digita SEMPRE em DD/MM/AAAA, com botão de calendário.
 *
 * O valor que sai do campo (`onChange` e o `<input hidden name>` do form) não
 * muda com isso:
 * - `formato="interno"` (padrão): "MM/DD/YYYY", o que as actions e o banco esperam;
 * - `formato="iso"`: "YYYY-MM-DD", para os filtros De/Até (`?de=`, `?ate=`) e
 *   os campos que já trabalhavam em ISO.
 *
 * GA-2: é o único lugar do app com `type="date"`. Esse campo nativo mostra a
 * data no idioma do navegador (num Chrome em inglês, mm/dd/yyyy); aqui ele só
 * abre o calendário, escondido, e o texto visível é sempre DD/MM/AAAA.
 * Uso controlado (`value`+`onChange`) ou em <form> (`name` + `defaultValue`).
 */
export function DateField({ formato = "interno", ...props }: BaseProps & { formato?: "interno" | "iso" }) {
  const iso = formato === "iso";
  return (
    <PickerField
      {...props}
      display={iso ? isoParaBR : internoParaBR}
      parse={iso ? brParaISO : brParaInterno}
      toNativeISO={iso ? mesmoValor : internoParaISO}
      fromNativeISO={iso ? mesmoValor : isoParaInterno}
      nativeType="date"
      placeholder="dd/mm/aaaa"
    />
  );
}

/**
 * Campo de competência/mês: exibe/digita em MM/AAAA e mantém o valor interno em
 * "MM/YYYY". Botão abre o seletor de mês nativo.
 */
export function MonthField(props: BaseProps) {
  return (
    <PickerField
      {...props}
      display={mesParaBR}
      parse={brParaMes}
      toNativeISO={mesParaISO}
      fromNativeISO={isoParaMes}
      nativeType="month"
      placeholder="mm/aaaa"
    />
  );
}

function PickerField({
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  required,
  className,
  "aria-label": ariaLabel,
  display,
  parse,
  toNativeISO,
  fromNativeISO,
  nativeType,
  placeholder,
}: BaseProps & {
  display: (internal: string) => string;
  parse: (text: string) => string | null;
  toNativeISO: (internal: string) => string;
  fromNativeISO: (iso: string) => string;
  nativeType: "date" | "month";
  placeholder: string;
}) {
  const controlled = value !== undefined;
  const [state, setState] = useState(defaultValue ?? "");
  const internal = controlled ? value ?? "" : state;
  const [text, setText] = useState(display(internal));
  const nativeRef = useRef<HTMLInputElement>(null);

  // Sincroniza o texto quando o valor interno muda por fora (edição controlada).
  useEffect(() => {
    setText(display(internal));
  }, [internal, display]);

  const commit = (next: string) => {
    if (!controlled) setState(next);
    onChange?.(next);
  };

  const onText = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") return commit("");
    const parsed = parse(raw);
    if (parsed !== null) commit(parsed);
  };

  const openPicker = () => {
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  return (
    <div className={cn("relative flex items-stretch", className)}>
      {name && <input type="hidden" name={name} value={internal} />}
      <input
        type="text"
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        required={required}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(e) => onText(e.target.value)}
        onBlur={() => setText(display(internal))}
        className="h-9 w-full rounded-l-[8px] border border-r-0 border-[var(--color-accent2)]/20 bg-white px-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-accent2)] focus:ring-2 focus:ring-[var(--color-accent2)]/20"
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        disabled={disabled}
        onClick={openPicker}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-[8px] border border-[var(--color-accent2)]/20 bg-[var(--color-surface2)] text-[var(--color-ink3)] transition-colors hover:bg-[var(--color-surface3)] disabled:opacity-50"
      >
        📅
      </button>
      {/* Date Picker nativo (só o popup) — ancorado ao botão, sem exibir texto. */}
      <input
        ref={nativeRef}
        type={nativeType}
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={toNativeISO(internal)}
        onChange={(e) => commit(fromNativeISO(e.target.value))}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-9 opacity-0"
      />
    </div>
  );
}
